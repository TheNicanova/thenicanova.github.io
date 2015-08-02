REFRESH_SECONDS = 1;
MAX_NUMBER_OF_EVENTS = 10;
WHEREIS_QUERY = '/whereis/transmitter/';
WHATAT_QUERY = '/whatat/receiver/';
DEFAULT_API_ROOT = 'http://www.hyperlocalcontext.com/';
DEFAULT_TRANSMITTER_ID = '1005ecab005e';
DEFAULT_RECEIVER_ID = '001bc50940810074';
DEFAULT_SOCKET_URL = DEFAULT_API_ROOT + '/websocket';
cCOlOR = 0;
THRESHOLD = 0.1;
QUADRATIC_FACTOR = 0.01;
LINEAR_FACTOR = 0.1;
DEFAULT_COLORS_ARRAY = ['#0770a2',
                        '#ff6900',
                        '#aec844',
                        '#5a5a5a',
                        '#ffc712'];
 
 
 
 
angular.module('state', ['ui.bootstrap','btford.socket-io'])
 
  // ----- Interaction controller -----
  .controller("InteractionCtrl", function($scope) {
 
    //Used to communicate between tabs
    $scope.updateTransmitterFromReceiver = false;
    var newTransmitterId = DEFAULT_TRANSMITTER_ID;
    $scope.setNewTransmitterId = function(newVal) {newTransmitterId = newVal;}
    $scope.getNewTransmitterId = function() {return newTransmitterId;}
 

    $scope.hideme = true;
    
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
  .service('transmitterSamples', function($http, $interval) {
    var samples;
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
          samples = sample;
        })
        .error(function(data, status, headers, config) {
          console.log('Error polling ' + url);
        });
    }
    $interval(poll, REFRESH_SECONDS * 1000);
 
    return {
      getLatest: function() { return samples; },
      setUrl: function(newUrl) { url = newUrl; }
    };
  })
 
 
  // Chart controller
  .controller('ChartCtrl', ['$scope','$interval', 'transmitterSamples',
                              function($scope, $interval, transmitterSamples) {
      // Context
      $scope.apiRoot = DEFAULT_API_ROOT;
      $scope.transmitterId = DEFAULT_TRANSMITTER_ID;

 
      // Data
      $scope.rssiSamples = {};
      $scope.rssiSeconds = 0;
       
      // Meta-Data
      $scope.receivers = {};
      $scope.numReceivers = 0;
 
      // Accessible to the User. Display preference.
      $scope.minRSSI = 85;
      $scope.maxRSSI = 195;

      $scope.isDiscovering = true;
      $scope.isPaused = false;
      $scope.maxNumberOfSamplesAccessible = 10;
      $scope.maxNumberOfSamples = 10;
      $scope.updateChart = true; // Each time this value changes, the chart is being updated.
      
      $scope.$watch($scope.getNewTransmitterId, function() {
        $scope.transmitterId = $scope.getNewTransmitterId();
        $scope.updateFromUser();
      });

      function updateFromService() {
   
        var sample = transmitterSamples.getLatest(); // Getting the latest data.
 
        if(sample && sample[$scope.transmitterId]) { // Making sure the data is well-defined
          
          if($scope.isDiscovering) { 
            updateReceivers(sample); // Updating the meta-data model.
          }
 
          updateRssiArray(sample); // Updating the data model.
          $scope.rssiSeconds += REFRESH_SECONDS; // Updating the data model.
 
        }

        if(!$scope.isPaused) {
          for(var receiverTemp in $scope.receivers) {
            var indexOfLatest = $scope.rssiSamples[receiverTemp].length -1;
            $scope.receivers[receiverTemp].latest = $scope.rssiSamples[receiverTemp][indexOfLatest].rssi;
          }
        }
      }
 
      $scope.updateFromUser = function () {
 
        $scope.updateChart = !$scope.updateChart;
 
        transmitterSamples.setUrl($scope.apiRoot + WHEREIS_QUERY + $scope.transmitterId);
        $scope.maxNumberOfSamples = $scope.maxNumberOfSamplesAccessible;
        $scope.rssiSamples = {};
        $scope.receivers = {};
        $scope.numReceivers = 0;
        $scope.rssiSeconds = 0;
      }
 
      function updateReceivers(sample) {
 
          for(var cRadio = 0; cRadio <  sample[$scope.transmitterId].radioDecodings.length; cRadio++) {
            var receiverTemp = sample[$scope.transmitterId].radioDecodings[cRadio].identifier.value;
            if(!(receiverTemp in $scope.receivers)) {
              var colorTemp = DEFAULT_COLORS_ARRAY[cCOlOR++ % DEFAULT_COLORS_ARRAY.length];
              $scope.receivers[receiverTemp] = {color : colorTemp, isDrawn : false, 
                isDisplayed : true, latest : 0, receiverId : receiverTemp, xCoordinate : 100, yCoordinate : 100};
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
 
              if($scope.rssiSamples[receiverTemp]) { // If already defined.
                $scope.rssiSamples[receiverTemp].push({seconds : seconds, rssi : rssi });
              }
              else { // If not defined yet.
                $scope.rssiSamples[receiverTemp] = [];
                $scope.rssiSamples[receiverTemp].push({seconds : seconds, rssi : rssi });
              }
 
              updated = true; 
              break;
            }
          }
          
          // If it failed to be updated, push 0 as default.
          if(!updated) {
            if($scope.rssiSamples[receiverTemp]) { // If already defined.
              $scope.rssiSamples[receiverTemp].push({seconds : seconds, rssi : 0 });
            }
            else { // If not defined yet.
              $scope.rssiSamples[receiverTemp] = [];
              $scope.rssiSamples[receiverTemp].push({seconds : seconds, rssi : 0 });
            }
          }
 
          // If it has reached the maximum number of samples, drop the oldest one.
          if($scope.rssiSamples[receiverTemp].length > $scope.maxNumberOfSamples) {
            $scope.rssiSamples[receiverTemp].shift();
          }
        }   
    }
 
    $interval(updateFromService , REFRESH_SECONDS * 1000);

  }])
 
 
  // Linear Chart directive
  .directive('linearChart',  function($parse, $window) {
    return {
      restrict: "EA",
      template: "<svg width='800' height='800'></svg>",
      link:
        function(scope, elem, attrs) {
 
          var chartDataExp = $parse(attrs.chartData);
          var updateChartExp = $parse(attrs.updateChart);
 
          var dataToPlot = chartDataExp(scope);

          var svgW = 800;
          var svgH = 800;
          var cellSide = 25;

          var cells;
          var cellArray = [];

          var d3 = $window.d3;
          var rawSvg = elem.find('svg');
          var svg = d3.select(rawSvg[0]);
 
          // Update coming from the service. Affecting dynamic content.
          
          scope.$watch(chartDataExp, function(newVal, oldVal) {
 
            dataToPlot = newVal;

            //console.log(JSON.stringify(dataToPlot, null, 4));
            if(!scope.isPaused) {
              //dynamicUpdateChart();
              dynamicDrawReceivers();
            }
          }, true);
 
          // Update coming from the user. Affecting static content.
          
          scope.$watch(updateChartExp, function(newVal, oldVal) {
            //staticUpDateChart();
          }, true);
          
          // Add code here !

          function xPosition(index) {
            return ((cellSide * index) % svgW);
          }

          function yPosition(index) {
            return cellSide * Math.floor((index/ (svgW/cellSide)));
          }
          // Takes a value from 0 to 1
          function valueToColor(value) {
            //console.log("getting value : " + value);
            var h = Math.round((1 - value) * 100);
            var s = 100
            var l = Math.round(value * 50)
            var color = "hsl(" + h + ", 100%, " + l + "%)";
            //console.log(color);

            return color;
          }

          function initChart() {


            for(var i = 0; i < svgW * svgH / (cellSide * cellSide); i++) {
              cellArray.push(i/(svgW * svgH / (cellSide * cellSide)))
            }

            cells = svg.selectAll("rect")
            .data(cellArray)
            .enter()
            .append("rect")
            .attr("x", function(d,i) {
              return xPosition(i);
            })
            .attr("y", function(d,i) {
              return yPosition(i);
            })
            .attr("width",cellSide-1)
            .attr("height",cellSide-1)
            .style("fill", function(d,i) {
              return valueToColor(d);
            });

            
          }

          function staticUpdateChart() {


          }

          function dynamicDrawReceivers() {

            //console.log(cellArray);



            cells.style("fill", function(d,i) {

              var xEmitter = xPosition(i);
              var yEmitter = yPosition(i);

              var colorValueArray = [];

              for(var receiverTemp in scope.receivers) {

                var xReceiver = scope.receivers[receiverTemp].xCoordinate;
                var yReceiver = scope.receivers[receiverTemp].yCoordinate;
                var rssi = scope.receivers[receiverTemp].latest;
                var colorValue = getColor(xEmitter, yEmitter, xReceiver, yReceiver, rssi);
                colorValueArray.push(colorValue);
              }
              var colorValueFinal = mergeColorValueArray(colorValueArray);

              return valueToColor(colorValueFinal);
          });

            


            for(var receiverTemp in scope.receivers) {
 
              var isDisplayed = scope.receivers[receiverTemp].isDisplayed;
              var color = scope.receivers[receiverTemp].color;
              var isDrawn = scope.receivers[receiverTemp].isDrawn;
              var rssi = scope.receivers[receiverTemp].latest;
              var radiusMeter = rssiToMeter(rssi);
              var radius = radiusMeter = meterToPixel(radiusMeter);
              radius = Math.max(radius,0);
              var xCoordinate = scope.receivers[receiverTemp].xCoordinate;
              var yCoordinate = scope.receivers[receiverTemp].yCoordinate;

              if(isDisplayed) {
 
                if(isDrawn) {
                  svg.selectAll("." + 'circle_' + receiverTemp)
                    .attr("r", radius)
                    .attr("cx", xCoordinate)
                    .attr("cy", yCoordinate);
                }
                else {
                  console.log("apending circle!");
                  svg.append("circle")
                  .attr("class", 'circle_' + receiverTemp)
                  .attr("cx", xCoordinate)
                  .attr("cy", yCoordinate)
                  .attr("r", radius)
                  .style("fill", color)
                  .style("opacity", 0.5);
                scope.receivers[receiverTemp].isDrawn = true;
                }
              }
 
              else {
 
                if(isDrawn) {
                  svg.selectAll("." + 'circle_' + receiverTemp).remove();
                  scope.receivers[receiverTemp].isDrawn = false;
                }
              }
            }

          }


          function getColor(xEmitter, yEmitter, xReceiver, yReceiver, rssi) {

            var receiverRadius = rssiToMeter(rssi);
            var pixelDistance = getDistanceInPixel(xEmitter, yEmitter, xReceiver, yReceiver);
            var distanceFromReceiver = pixelToMeter(pixelDistance);

            return getColorValueFromDistance(receiverRadius, distanceFromReceiver, rssi);

          }
          
          function getColorValueFromDistance(receiverRadius, distanceFromReceiver, rssi) {

            // QUADRATIC : return Math.max(1 - (0.05 * Math.abs(receiverRange - distanceFromReceiver)));
            // LINEAR :
            if(receiverRadius ===-1) {
              return -1;
            }
            else {
              return  Math.max(rssi/scope.maxRSSI - (LINEAR_FACTOR  * rssi/scope.maxRSSI * Math.abs(receiverRadius - distanceFromReceiver)),0);
            }
          }

          function getDistanceInPixel(xEmitter, yEmitter, xReceiver, yReceiver){
            return Math.sqrt(Math.pow(xEmitter- xReceiver,2) + Math.pow(yEmitter- yReceiver,2));

          }

          function pixelToMeter(pixel) {
            return pixel/cellSide;
          }

          function meterToPixel(meter) {
            return meter * cellSide;
          }

          function rssiToMeter(rssi){
            if(rssi > scope.maxRSSI) return 1;
            if(rssi > 185) return 1;
            if(rssi > 177) return 2;
            if(rssi > 170) return 3;
            if(rssi > 165) return 4;
            if(rssi > 163) return 5;
            if(rssi > 160) return 6;
            if(rssi > 155) return 7;
            if(rssi > 150) return 8;
            if(rssi > 145) return 9;
            if(rssi > 143) return 10;
            if(rssi > 140) return 11;
            if(rssi > 135) return 12;
            if(rssi > 130) return 13;
            if(rssi > 125) return 14;
            if(rssi > 120) return 15;
            if(rssi > 115) return 16;
            if(rssi > 110) return 17;
            if(rssi > 105) return 18;
            if(rssi > 100) return 19;
            if(rssi > 95) return 20;
            if(rssi > 90) return 22;
            if(rssi > scope.minRSSI) return 25;
            return -1;
            
          }


          function mergeColorValueArray(colorValueArray) {

            var result = 1;
            var dirty = false;
            var zeros = 0;

            for(var cArray = 0; cArray < colorValueArray.length; cArray++) {
              if(colorValueArray[cArray] != -1){
              result = result * colorValueArray[cArray];
              dirty = true;
              }
              else{
                zeros++;
              }
            }

            result = Math.pow(result,1/(colorValueArray.length - zeros));

            if(dirty){
              return result;
            }
            else
            {
              return 0;
            }
          }


          initChart();

        }
    }
  });
 
