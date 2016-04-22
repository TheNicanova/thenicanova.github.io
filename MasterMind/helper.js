
var tmp_query = [];
var tmp_sample = [];
var hypothesis = [];
var remainingHypothesis = [];
var total_entropy = 0;
var total_entropy = [];


function init_hypothesis() {
hypothesis = [];
  for(var i = 0; i < 8; i++) {
    for(var j = 0;j < 8; j++) {
        for(var k =0; k<8; k++ ) {
            for(var l = 0; l <8; l++) {
              hypothesis.push([i,j,k,l]);
             }
        }
    }  
  }
}

function init_meaning() {
  for (i = 0; i < 4; i++) {
  meaning[i] = Math.floor((Math.random() * 8));
  document.getElementById('c' + i).src = './images/color_' + meaning[i]+ '.gif';
  }
}

function getPartition (query, hypothesis_array) {

  var partition = {};
  var tmp_value = 0;

  for(var i = 0; i < hypothesis_array.length; i++) {
    tmp_value = compare(query,hypothesis_array[i]);

    if(!partition[tmp_value]){ // Making sure the object has been created.
      partition[tmp_value] = [];
    }

    partition[tmp_value].push(hypothesis_array[i]);

  }

  return partition;

}

function getEntropy(partition) {
  var sum = 0;
  var total = 0;

  for(var set in partition) {
    total += partition[set].length;
  }

  for(var set in partition) {
    if(partition[set].length > 0) {
      sum += Math.log(partition[set].length/total)*(partition[set].length/total);
    }
  }
  return -sum;
}

function compare(query, color_sample) {

  var tmp_bulls = 0;
  var tmp_cows = 0;

  for(var i = 0; i < 4; i++) {
    tmp_query[i] = query[i];
    tmp_sample[i] = color_sample[i];
  }

  for(var i = 0; i < 4; i++) {
    if(tmp_query[i] == tmp_sample[i]) {
      tmp_bulls++;
      tmp_query[i] = -1;
      tmp_sample[i] = -2;
    }
  }

  for(var i = 0; i < 4; i++) {
      for(var j = 0; j < 4; j++) {
          if(tmp_query[i] == tmp_sample[j]) {
              tmp_cows++;
              tmp_query[i] = -1;
              tmp_sample[j] = -2;
          }
      }
    }
  
  return 10 * tmp_bulls + tmp_cows;
}

function guessGreedyEntropy(hypothesis_array) {

  var maxEntropy = 0;
  var indexOfMax = 0;
  var tmp_entropy = 0;

  for(var i = 0; i < hypothesis.length; i++) {

    tmp_entropy = getEntropy(getPartition(hypothesis[i],hypothesis_array));
    if(tmp_entropy > maxEntropy) {
      maxEntropy = tmp_entropy;
      indexOfMax = i;
    }

  }
//console.log("The query that has the most entropy have : " + maxEntropy);
if(maxEntropy == 0) return hypothesis_array[0];
total_entropy += maxEntropy;
console.log("Exhausted a total of : " + total_entropy);
entropy.push(maxEntropy);



return hypothesis[indexOfMax];
}

function computeAverage(entropy) {
  var sum = 0;
  for(var i = 0; i< entropy.length; i++) {
    sum += entropy[i];
  }
  return sum/entropy.length;
}

function computeVariance(entropy, average) {
  var sum = 0;
  for(var i = 0; i  < entropy.length; i++) {
    sum += Math.pow(entropy[i] - average, 2);
  }
  return sum/entropy.length;
}

function consistentGuessGreedyEntropy(hypothesis_array) {

  var maxEntropy = 0;
  var indexOfMax = 0;
  var tmp_entropy = 0;

  for(var i = 0; i < hypothesis_array.length; i++) {

    tmp_entropy = getEntropy(getPartition(hypothesis_array[i],hypothesis_array));
    if(tmp_entropy > maxEntropy) {
      maxEntropy = tmp_entropy;
      indexOfMax = i;
    }

  }
console.log("The query that has the most entropy have : " + maxEntropy);

total_entropy += maxEntropy;
console.log("Exhausted a total of : " + total_entropy);

entropy.push(maxEntropy);

if(maxEntropy == 0) return hypothesis_array[0];
entropy.push(maxEntropy);

return hypothesis_array[indexOfMax];
}

function guessLessEntropy(hypothesis_array) {

  var minEntropy = 999;
  var indexOfMin = 0;
  var tmp_entropy = 0;

  for(var i = 0; i < hypothesis_array.length; i++) {

    tmp_entropy = getEntropy(getPartition(hypothesis_array[i],hypothesis_array));
    if(tmp_entropy < minEntropy) {
      minEntropy = tmp_entropy;
      indexOfMin = i;
    }

  }
console.log("The query that has the min entropy have : " + minEntropy);
entropy.push(minEntropy);
return hypothesis_array[indexOfMin];
}


function knuth(hypothesis_array) {

   /* Refactoring */
}


function deepEntropyTwo(hypothesis_array) {

  var tmp_entropy = 0;
  var maxEntropy = 0;
  var indexOfMax = 0;
  var tmp_partition;
  var cummul_partition;
  var tmp_partition2;
  var guess_tmp;
  var j = 0;

  

  for(var i = 0; i < hypothesis.length; i++) {
    cummul_partition = [];
    tmp_partition = getPartition(hypothesis[i], hypothesis_array);

    for(var set in tmp_partition) {
      guess_tmp = guessGreedyEntropy(set);

      tmp_partition2 = getPartition(guess_tmp, tmp_partition[set]);
      console.log(JSON.stringify(tmp_partition2));    
      for(var set2 in tmp_partition2) {
        cummul_partition.concat(tmp_partition2[set2]);
        console.log(cummul_partition);
        console.log("balba" + tmp_partition2[set2]);
      }

    }

    tmp_entropy = getEntropy(cummul_partition);

    if(tmp_entropy > maxEntropy) {
      console.log("Found a better query!");
      maxEntropy = tmp_entropy;
      indexOfMax = i;
    }

  }

  console.log("maxEntropy : " + maxEntropy);
  return hypothesis[i];

}
