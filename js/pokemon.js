var {PythonShell} = require('python-shell');
const colorThief = require('colorthief');
//Lightweight PokeApi js wrapper
const PokeApi = require('pokeapi-js-wrapper');

//Global variables to track Pokedex position
var [min, max] = getGenerationBounds();
//Generate random id within bounds
var pokeId = getRandomInt(max, min);

//Initialise Pokedex
function init() {
  //Initialise Pokemon API
  var pokedex = new PokeApi.Pokedex();
  //Get pokemon information from id
  pokedex.getPokemonByName(pokeId)
  .then((res) => {
    //Get URL of sprite
    var spriteURL = res.sprites.front_default;
    //If sprite exists
    if(spriteURL != null) {
      //Display within UI
      document.getElementById('sprite').src = spriteURL;
      //Get colour palette from sprite
      colorThief.getPalette(spriteURL)
      .then((res) => {
        //Find most dominant colour in palette
        var colour = findDominantColour(res);
        //Update UI with colour
        document.getElementById('wave-path').style.fill = "rgba(" + colour.r + "," + colour.g + "," + colour.b + ",1)";
        document.getElementById('wave-base').style.backgroundColor = "rgba(" + colour.r + "," + colour.g + "," + colour.b + ",1)";
        document.getElementById('shadow-path').style.fill = "rgba(" + colour.r + "," + colour.g + "," + colour.b + ",0.7)";
      })
      .catch((err) => {
        displayError("An issue occurred loading the sprite. Please reload and try again, this may be due to your connection speed.");
      })
    } else {
      //Set to placeholder sprite
      spriteURL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png";
      //Update UI with standard colour
      document.getElementById('sprite').src = spriteURL;
      document.getElementById('wave-path').style.fill = "rgba(255, 99, 132, 1)";
      document.getElementById('wave-base').style.backgroundColor = "rgba(255, 99, 132, 1)";
      document.getElementById('shadow-path').style.fill = "rgba(255, 99, 132, 0.7)";
    }

    //Capitalise first letter of name
    var name = capitaliseFirstLetter(res.name);
    //Add zeros to the front of the id based on its value/length
    var id = prependZeros(res.id);
    document.getElementById('pokemon').innerHTML = "#" + id + " - " + name;
    //Get types array from Pokedex
    var types = res.types;
    //First type will always exist
    document.getElementById('type1').src = "img/pokemon/" + types[0].type.name + ".svg";
    //If dual typed display within UI
    if(types.length > 1) {
      let type2 = document.getElementById('type2')
      type2.src = "img/pokemon/" + types[1].type.name + ".svg";
      type2.style.display = "initial";
    } else { //Else hide from UI
      document.getElementById('type2').style.display = "none";
    }
    //Convert height from decimetres to metres
    var height = (res.height / 10).toFixed(2);
    //Convert weight from hectograms to kilograms
    var weight = (res.weight / 10).toFixed(1);
    var measurements = document.getElementById('measurements');
    measurements.innerHTML = height + "m" + "&ensp;//&ensp;" + weight + "kg";
    //4 random Pokedex moves for this entry
    var moves = generateUniqueMoves(res.moves);
    var moveDivs = document.getElementsByClassName('move');
    for(var i = 0; i < moveDivs.length; i++) {
      moveDivs[i].innerHTML = moves[i].move.name;
    }
    //Pokedex base stats for this entry
    var speed = res.stats[0].base_stat;
    document.getElementById('speed').value = speed;
    var spDef = res.stats[1].base_stat;
    document.getElementById('spDef').value = spDef;
    var spAtk = res.stats[2].base_stat;
    document.getElementById('spAtk').value = spAtk;
    var defence = res.stats[3].base_stat;
    document.getElementById('defence').value = defence;
    var attack = res.stats[4].base_stat;
    document.getElementById('attack').value = attack;
    var hp = res.stats[5].base_stat;
    document.getElementById('hp').value = hp;
  })
  .catch((err) => {
    displayError("There was an issue obtaining information from the Pokedex. Please reload and try again.");
  });

  //Get Pokemon species information from id
  pokedex.getPokemonSpeciesByName(pokeId)
  .then((res) => {
    //Pokedex entry flavour text
    var flavour = getEntryByLanguage(res.flavor_text_entries, "en").flavor_text;
    flavour = removeAccents(flavour);
    flavour = replaceApostrophe(flavour);
    document.getElementById('flavour').innerHTML = flavour;
    //Pokedex entry genus
    var genus = getEntryByLanguage(res.genera, "en").genus;
    genus = "The " + removeAccents(genus) + ".";
    document.getElementById('genus').innerHTML = genus;
    //Name in Japanese
    var name = getEntryByLanguage(res.names, "ja").name;
    document.getElementById('name').innerHTML = name;
  })
  .catch((err) => {
    displayError("There was an issue obtaining information from the Pokedex. Please reload and try again.");
  });
  //Display loading icon for 4 seconds to give time for gesture sensor to initialise and PokeAPI to respond
  setTimeout(function() { document.getElementById('loading').classList.add("hidden"); }, 4000);
}

//Get the lower and upper bounds of each generation of Pokemon supported by the API
function getGenerationBounds() {
  //Get generation choice from config file
  var gen = config.poke_gen;
  if(gen != undefined && gen != "") {
    //return bounds based on generation, default generation 1
    switch(gen) {
      case 1:
        return [1, 151];
      case 2:
        return [152, 251];
      case 3:
        return [252, 386];
      case 4:
        return [387, 493];
      case 5:
        return [494, 649];
      case 6:
        return [650, 721];
      case 7:
        return [722, 807];
      default:
        return [1, 151];
    }
  } else {
    //If not specified, display all pokemon
    return [1, 807];
  }
}

//Generate random integer within bounds (inclusive)
function getRandomInt(max, min) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Return the dominant colour in an array of rgb colours
function findDominantColour(colours) {
  //Iterate through colours array
  for(var i = 0; i < colours.length; i++) {
    //Convert from rgb to hsv values
    let hsv = rgbToHsv(colours[i][0], colours[i][1], colours[i][2]);
    //Return first colour to meet one of the criteria
    if(hsv[2] > 72.5 && hsv[1] > 37.5) {
      return colour = {
        r: colours[i][0],
        g: colours[i][1],
        b: colours[i][2]
      };
    } else if(hsv[2] > 65 && hsv[1] > 40) {
      return colour = {
        r: colours[i][0],
        g: colours[i][1],
        b: colours[i][2]
      };
    } else if(hsv[2] > 85 && hsv[1] > 20) {
      return colour = {
        r: colours[i][0],
        g: colours[i][1],
        b: colours[i][2]
      };
    }
  }
  //Return first colour in palette if none meet criteria
  return colour = {
    r: colours[0][0],
    g: colours[0][1],
    b: colours[0][2]
  };
}

//Convert rgb colour values to hsv colour values
function rgbToHsv(r, g, b) {
  //Divide r, g, b by 255
  r /= 255;
  g /= 255;
  b /= 255;
  //Calculate maximum and minimum values
  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var dif = max - min;
  //Create h, s, v variables
  var h, s, v;

  //Calculate hue
  if(dif == 0) {
    h = 0;
  } else {
    switch(max) {
      case
        r: h = (60 * ((g - b) / dif) + 360) % 360;
        break;
      case
        g: h = (60 * ((b - r) / dif) + 120) % 360;
        break;
      case g:
        h = (60 * ((r - g) / dif) + 240) % 360;
        break;
    }
  }
  //Calculate saturation
  if(max == 0) {
    s = 0;
  } else {
    s = (dif / max) * 100;
  }
  //Calculate value
  v = max * 100;

  return [h, s, v];
}

//Capitalise the first letter of a string
function capitaliseFirstLetter(str) {
  let capitalised = str.charAt(0).toUpperCase() + str.slice(1);
  return capitalised;
}

//Pick 4 unique random moves from an array of moves
function generateUniqueMoves(moves) {
  var arr = [];
  //Repeat until 4 moves in array
  while(arr.length < 4) {
    //Get random index within bounds
    var i = getRandomInt(moves.length, 1) - 1;
    //Only add to array if not already within it
    if(arr.indexOf(moves[i]) === -1) {
      arr.push(moves[i]);
    }
  }
  return arr;
}

//Append zeros to the front of id based on its value
function prependZeros(id) {
  var n = id;
  //Prepend until 3 characters in length
  if(n < 10) {
    return "00" + n;
  } else if (n < 100) {
    return "0" + n;
  } else {
    return n;
  }
}

//Return entry matching specified language
function getEntryByLanguage(entries, lang) {
  //Iterate through array
  for(var i = 0; i < entries.length; i++) {
    //Return element if in specified language
    if(entries[i].language.name == lang) {
      return entries[i];
    }
  }
}

//Remove accented characters from string
function removeAccents(str) {
  //Normalise to NFD Unicode to seperate combination characters
  //Use regex to remove any accents within the Unicode range
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

//Replace single right qutoation mark with standard apostrophe character
function replaceApostrophe(str) {
  return str.replace(/\’/g, "\'");
}

//Ensure the index is within the bounds specified
function checkIndex() {
  //If less than lower bound
  if(pokeId < min) {
    //Set to upper bound
    pokeId = max;
  }
  //If greater than upper bound
  if(pokeId > max) {
    //Set to lower bound
    pokeId = min;
  }
  //Re-initialise UI
  init();
}

//Display error message within UI
function displayError(err) {
  //Get error div
  let errDiv = document.getElementById('error');
  //Show error message in div
  errDiv.classList.add('transition');
  errDiv.innerHTML = err;
  //Transition-out after 5 seconds
  setTimeout(function() {errDiv.classList.remove('transition');}, 5000);
}

//Display gesture within UI
function displayGesture(gesture) {
  //Get gesture div
  let gesDiv = document.getElementById('gesture');
  //Show gesture message in div
  gesDiv.classList.add('transition');
  gesDiv.innerHTML = gesture;
  //Transition-out after 5 seconds
  setTimeout(function() {gesDiv.classList.remove('transition');}, 2000);
}

//Use output from gesture sensor python script as control
let pyshell = new PythonShell('py/gesture_print.py');
pyshell.on('message', function(gesture) {
  displayGesture(gesture);
  switch(gesture) {
    case "Up":
      //Navigate to random Pokedex entry within bounds
      pokeId = getRandomInt(max, min);
      checkIndex();
      break;
    case "Down":
      //Navigate to random Pokedex entry within bounds
      pokeId = getRandomInt(max, min);
      checkIndex();
      break;
    case "Left":
      //Navigate to previous Pokedex entry
      pokeId--;
      checkIndex();
      break;
    case "Right":
      //Navigate to next Pokedex entry
      pokeId++;
      checkIndex();
      break;
    case "Clockwise":
      //Navigate to the Pokedex upper bound
      pokeId = max;
      checkIndex();
      break;
    case "Anti-clockwise":
      //Navigate to the Pokedex lower bound
      pokeId = min;
      checkIndex();
      break;
    case "Wave":
      //Navigate back to homepage for module selection
      document.location.href = "homepage.html";
      break;
  }
});
