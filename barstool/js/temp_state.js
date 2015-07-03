REFRESH_SECONDS = 1;
MAX_NUMBER_OF_EVENTS = 10;
MAX_NUMBER_OF_SAMPLES = 10;
WHEREIS_QUERY = '/whereis/transmitter/';
WHATAT_QUERY = '/whatat/receiver/';
DEFAULT_API_ROOT = 'http://www.hyperlocalcontext.com/';
DEFAULT_TRANSMITTER_ID = '5c313e5234dc'
DEFAULT_SOCKET_URL = DEFAULT_API_ROOT + '/websocket';
DEFAULT_MAX_COLORS = 8;


 
 
angular.module('state', ['btford.socket-io'])
 
  // ----- Interaction controller -----
  .controller("InteractionCtrl", function($scope) {
    $scope.show = { transmitter: true, receiver: false, events: false };
    $scope.tabclass = { transmitter: 'selected-tab', receiver: 'tab',
                        events: 'tab' };
 
    $scope.selectTransmitter = function() {
      $scope.show = { transmitter: true, receiver: false, events: false };
      $scope.tabclass = { transmitter: 'selected-tab', receiver: 'tab',
                          events: 'tab' };
    }
 
    $scope.selectReceiver = function() {
      $scope.show = { transmitter: false, receiver: true, events: false };
      $scope.tabclass = { transmitter: 'tab', receiver: 'selected-tab', 
                          events: 'tab'};
    }
 
    $scope.selectEvents = function() {
      $scope.show = { transmitter: false, receiver: false, events: true };
      $scope.tabclass = { transmitter: 'tab', receiver: 'tab',
                          events: 'selected-tab' };
    }

  })
 
 
  // Socket.io factory
  .factory('Socket', function(socketFactory) {
    return socketFactory( { ioSocket: io.connect(DEFAULT_SOCKET_URL) } );
  })
 
 
  // Socket.io controller
  .controller('SocketCtrl', function($scope, Socket) {
    $scope.socket = { url: DEFAULT_SOCKET_URL };
    $scope.events = [];
 
    Socket.on('appearance', function(tiraid) {
      addEvent({ type: 'appearance', tiraid: tiraid });
    });
    Socket.on('displacement', function(tiraid) {
      addEvent({ type: 'displacement', tiraid: tiraid });
    });
    Socket.on('disappearance', function(tiraid) {
      addEvent({ type: 'disappearance', tiraid: tiraid });
    });
    Socket.on('keep-alive', function(tiraid) {
      addEvent({ type: 'keep-alive', tiraid: tiraid });
    });
    Socket.on('error', function(err, data) {
      console.log('Socket Error: ' + err + ' - ' + data);
    });
 
    function addEvent(event) {
      $scope.events.push(event);
      if($scope.events.length > MAX_NUMBER_OF_EVENTS) {
        $scope.events.shift();
      }
    }
  })
 
 
  // Samples service
  .service('Samples', function($http, $interval) {
    var samples = [];
    var url = null;
 
    poll();
 
    function poll() {
      if(!url) {
        return;
      }
      $http.defaults.headers.common.Accept = 'application/json';
      $http.get(url)
        .success(function(data, status, headers, config) {
          var sample = data.devices;
          samples.push(sample);
          if(samples.length > MAX_NUMBER_OF_SAMPLES) {
            samples.shift();
          }
        })
        .error(function(data, status, headers, config) {
          console.log('Error polling ' + url);
        });
    }
    $interval(poll, REFRESH_SECONDS * 1000);
 
    return {
      getAll: function() { return samples; },
      getLatest: function() { return samples[samples.length - 1]; },
      setUrl: function(newUrl) { url = newUrl; }
    };
  })
 
 
  // Chart controller
  .controller('ChartCtrl', ['$scope','$interval', 'Samples',
                              function($scope, $interval, Samples) {
      // Context
      $scope.apiRoot = DEFAULT_API_ROOT;
      $scope.transmitterId = DEFAULT_TRANSMITTER_ID;
      //$scope.setReceiverUrl = setReceiverUrl;

      // Data
      $scope.rssiSeconds = 0;
      $scope.rssiSamples = {};

      // Meta-Data
      $scope.receivers = {};
      $scope.numReceivers = 0;
      $scope.updateDirective = false;

      // Accessible to the User. Display preference.
      $scope.isDiscovering = true;
      $scope.minRSSI = 125;
      $scope.maxRSSI = 200;
      $scope.isPaused = false;
 

      updateFromUser();
      $interval(updateFromService , REFRESH_SECONDS * 1000);


      function updateFromService() {
   
        var sample = Samples.getLatest(); // Getting the latest data.

        if(sample && sample[$scope.transmitterId]) { // Making sure the data is well-defined
          
          updateRssiArray(sample); // Updating the data model.
          $scope.rssiSeconds += REFRESH_SECONDS; // Updating the data model.

          if($scope.discoverReceivers) { 
            updateReceiversArray(sample); // Updating the meta-data model.
          }
        }
      }

      function updateFromUser() {
        Samples.setUrl($scope.apiRoot + WHEREIS_QUERY + $scope.transmitterId);
        $scope.rssiSamples = {};
        $scope.receivers = {};
        $scope.numReceivers = 0;
        $scope.rssiSeconds = 0;
        $scope.updateChart = true;
        // Data binded in the scope.
      }
 
      function updateReceivers(sample) {
       
          for(var cRadio = 0; cRadio <  sample[$scope.transmitterId].radioDecodings.length; cRadio++) {
            var receiverTemp = sample[$scope.transmitterId].radioDecodings[cRadio].identifier.value;
            if(!(receiverTemp in $scope.receivers)) {
              var colorTemp = rainbow(DEFAULT_MAX_COLORS, numReceivers++ % DEFAULT_MAX_COLORS)
              $scope.receivers[receiverTemp] = {color : colorTemp, isDrawn : false, isDisplayed : true}
            }
          }
      }
 
      function updateRssiArray(sample) {
 
        for(var receiverTemp in $scope.receivers) {
 
          var updated = false;
          var seconds = $scope.rssiSeconds;
 
          // Try to update the rssi corresponding to the receiver.
          for(var cRadio = 0; cRadio < sample[$scope.transmitterId].radioDecodings.length; cRadio++) {
 
            if(sample[$scope.transmitterId].radioDecodings[cRadio].identifier.value === receiverTemp) {
              var rssi = sample[$scope.transmitterId].radioDecodings[cRadio].rssi;
              $scope.rssiSamples[receiverTemp].push({seconds : seconds, rssi : rssi });
              updated = true; 
              break;
            }
          }
          
          // If it failed to be updated, push 0 as default.
          if(!updated) {
            $scope.rssiSamples[receiverTemp].push({seconds : seconds, rssi : 0 });
          }
 
          // If it has reached the maximum number of samples, drop the oldest one.
          if($scope.rssiSamples[receiverTemp].length > MAX_NUMBER_OF_SAMPLES) {
            $scope.rssiSamples[receiverTemp].shift();
          }
        }   
    }
 
    function rainbow(numOfSteps, step) {
    // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
    // Adam Cole, 2011-Sept-14
    // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
      var r, g, b;
      var h = step / numOfSteps;
      var i = ~~(h * 6);
      var f = h * 6 - i;
      var q = 1 - f;
      switch(i % 6){
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        case 5: r = 1; g = 0; b = q; break;
      }
      var c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
      return (c);
    }
  }])
 
 
  // Linear Chart directive
  .directive('linearChart',  function($parse, $window){
    return {
      restrict: "EA",
      template: "<svg width='1000' height='300'></svg>",
      link:
        function(scope, elem, attrs) {

          var chartDataExp = $parse(attrs.chartData);
          var updateChartExp = $parse(attrs.updateChart);

          var dataToPlot = chartDataExp(scope);
          var padding = 20;
          var xScale; // Dynamic
          var yScale, xAxisGen, yAxisGen, lineFun; // Static
          var d3 = $window.d3;
          var rawSvg = elem.find('svg');
          var svg = d3.select(rawSvg[0]);

          //Initialization
          initChart();


          // Update coming from the service. Affecting dynamic content.
          scope.$watch(chartDataExp, function(newVal, oldVal) {
            console.log('updating service data');
            dataToPlot = newVal;
            dynamicSetChartParameters();
            dynamicDrawChart();
          }, true);

          // Update coming from the user. Affecting static content.
          scope.$watch(updateChartExp, function(newVal, oldVal) {
            console.log('udpating user data');
            staticSetChartParameters();
            staticDrawChart();
          }, true);



          function initChart() { // Needs to be done once.

            staticSetChartParameters();
            dynamicSetChartParameters();

            xAxisGen = d3.svg.axis()
              .scale(xScale)
              .orient("bottom")
              .ticks(MAX_NUMBER_OF_SAMPLES);

            yAxisGen = d3.svg.axis()
              .scale(yScale)
              .orient("left")
              .ticks(8);

            lineFun = d3.svg.line()
              .x(function(d) { return xScale(d.seconds); })
              .y(function(d) { return yScale(d.rssi); })
              .interpolate("basis");
            console.log('drawing x axis');
            svg.append("svg:g")
              .attr("class", "x axis")
              .attr("transform", "translate(9,270)")
              .call(xAxisGen);
 
            console.log('drawing y axis')
            svg.append("svg:g")
              .attr("class", "y axis")
              .attr("transform", "translate(40,-10)")
              .call(yAxisGen);

            staticDrawChart();
          }
            
          function staticSetChartParameters() {
            yScale = d3.scale.linear()
              .domain([scope.minRSSI, scope.maxRSSI])
              .range([rawSvg.attr("height") - padding, 0]);

            xAxisGen = d3.svg.axis()
              .scale(xScale)
              .orient("bottom")
              .ticks(MAX_NUMBER_OF_SAMPLES);
          }  

          function dynamicSetChartParameters() {
            var beginDomain = Math.max(1, scope.rssiSeconds - MAX_NUMBER_OF_SAMPLES );
            var endDomain = Math.max(0,scope.rssiSeconds - 1);

            console.log('Domain ranging from ' + beginDomain + ' to ' + endDomain);
            xScale = d3.scale.linear()
              .domain([beginDomain,endDomain])
              .range([padding + 5, rawSvg.attr("width") - padding]);
          }

          function staticDrawChart() {
            svg.selectAll("*").remove(); // Removing all receivers from the chart.
            svg.selectAll("g.y.axis").call(yAxisGen);
            svg.selectAll("g.x.axis").call(xAxisGen);
            console.log('drawing static chart');
          }

          function dynamicDrawChart() {
            svg.selectAll("g.x.axis").call(xAxisGen); // Redrawing the x axis.

            for(var receiverTemp in scope.receivers) {

              if(receiverTemp.isDisplayed) {

                if(receiverTemp.isDrawn) {
                  svg.selectAll("." + 'path_' + receiverTemp)
                    .attr({ d: lineFun(dataToPlot[receiverTemp]) }); 
                }

                else {
                  vg.append("svg:path")
                      .attr({
                        d: lineFun(dataToPlot[receiverTemp]),
                        "stroke": receiverTemp.color,
                        "stroke-width": 2,
                        "fill": "none",
                        "class": 'path_' + receiverTemp});
                  receiverTemp.isDrawn = true;
                }
              }

            else {
              if(receiverTemp.isDrawn) {
                svg.selectAll("." + 'path_' + receiverTemp).remove();
                receiverTemp.isDrawn = false;
              }
            }
          }
        }
      }
    }
  });
