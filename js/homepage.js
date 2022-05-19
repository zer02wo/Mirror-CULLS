var {PythonShell} = require('python-shell');

//Mirror widgets/modules mapped to cartesian coordinates as 2D array indexes
const modules = [["spotify", "weather", "clock"], ["3d", "fitbit", "news"], ["pokemon", "maps", "calendar"]];
//Global coordinates of modules
var x, y;

function init() {
  //Display Mirror-CULLS logo for 4 seconds to give time for gesture sensor to initialise
  if(document.location.href.split("/").pop() == "homepage.html?boot=true") {
    setTimeout(function() { document.getElementById('logo-container').classList.add("hidden"); }, 4000);
  } else {
    //Hide logo instantly
    document.getElementById('logo-container').style.display = "none";
  }

  //Default with middle module selected
  x = 1;
  y = 1;

  //Initialise display in UI
  selectModule();
}

//Transform the module name to the div element id
function getDivName(module) {
  return module + "-nav";
}

//Transform the module name to the img element id
function getImgName(module) {
  return module + "-icon";
}

//Select the module via cartesian coordinates
function selectModule() {
  //Get div id at current position
  let mod = getDivName(modules[x][y]);
  //Get element related to current position
  mod = document.getElementById(mod);
  //Add selected class to div
  mod.classList.add('selected');

  //Get img id at current position
  let img = getImgName(modules[x][y]);
  //Get element related to current position
  img = document.getElementById(img);
  //Remove convert-white class from img
  img.classList.remove('convert-white');
  //Add convert-colour class to img
  img.classList.add('convert-colour');
}

//Clear the currently selected module
function clearModule() {
  //Get div that is currently selected
  let mod = document.getElementsByClassName('selected')[0];
  //Remove selected class from div
  mod.classList.remove('selected');
  //Add cleared class to div
  mod.classList.add('cleared');
  //Set timeout to remove cleared class from div in 200 milliseconds
  setTimeout(function() { mod.classList.remove('cleared'); }, 200);

  //Get img that is currently selected
  let img = document.getElementsByClassName('convert-colour')[0];
  //Remove convert-colour class from img
  img.classList.remove('convert-colour');
  //Add convert-white class to div
  img.classList.add('convert-white');
}

//Navigate to the currently selected widget
function engageModule() {
  //Get selected module name via cartesian coordinates
  let mod = modules[x][y];
  //Navigate to relevant module html page
  document.location.href = mod + ".html";
}

//Remove error window when redirected from config.json error
if(document.location.href.split("/").pop() == "homepage.html?error=true") {
  //Get browser window
  var { BrowserWindow } = require('electron').remote;
  var win = BrowserWindow.getAllWindows()[1];
  //Close error child window after 5 seconds
  setTimeout(function() {win.getChildWindows()[0].close();}, 5000);
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
      //Select module above currently selected after checking bounds
      clearModule();
      y++;
      if(y >= modules[x].length) {
        y = 0;
      }
      selectModule();
      break;
    case "Down":
      //Select module below currently selected after checking bounds
      clearModule();
      y--;
      if(y < 0) {
        y = modules[x].length - 1;
      }
      selectModule();
      break;
    case "Left":
      //Select module left of currently selected after checking bounds
      clearModule();
      x--;
      if(x < 0) {
        x = modules.length - 1;
      }
      selectModule();
      break;
    case "Right":
      //Select module right of currently selected after checking bounds
      clearModule();
      x++;
      if(x >= modules.length) {
        x = 0;
      }
      selectModule();
      break;
    case "Wave":
      //Navigate to selected module
      engageModule();
      break;
  }
});
