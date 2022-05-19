var {PythonShell} = require('python-shell');

//Initialise clock
function init() {
  //Initialise analog display
  setAnalogTime();
  setAnalogDate();
  //Initialise digital display
  setDigitalTime();
  setDigitalDate();
  //Toggle clock to display within UI initially
  toggleClock();
  //Display loading icon for 4 seconds to give time for gesture sensor to build DOM
  setTimeout(function() { document.getElementById('loading').classList.add("hidden"); }, 4000);
}

function toggleClock() {
  //If currently showing analog display
  if(document.getElementById('analog-clock').style.display == "flex") {
    //Hide analog display
    document.getElementById('analog-clock').style.display = "none";
    //Unhide digital display
    document.getElementById('digital-clock').style.display = "flex";
    document.getElementById('digital-date').style.display = "inline-block";
  } else { //Else currently showing digital display
    //Hide digital display
    document.getElementById('digital-clock').style.display = "none";
    document.getElementById('digital-date').style.display = "none";
    //Unhide analog display
    document.getElementById('analog-clock').style.display = "flex";
  }
}

//Display time within the UI
function setDigitalTime() {
  //Get time from date object
  var time = new Date();
  //Display time within UI
  document.getElementById('sec').innerHTML = formatTime(time.getSeconds());
  document.getElementById('min').innerHTML = formatTime(time.getMinutes());
  document.getElementById('hour').innerHTML = time.getHours();
  //Update every 500ms
  var t = setTimeout(setDigitalTime, 500);
}

//Format time string to ensure always double digits
function formatTime(t) {
  //Prepend a zero when less than 10
  if (t < 10) { t = "0" + t; }
  return t;
}

//Display date within the UI
function setDigitalDate() {
  //Get date from date object
  var today = new Date();
  //Display date within UI
  document.getElementById('dow').innerHTML = formatDOW(today.getDay());
  document.getElementById('day').innerHTML = formatDate(today.getDate());
  document.getElementById('mon').innerHTML = formatDate(today.getMonth() + 1);
  document.getElementById('year').innerHTML = today.getFullYear();
  //Update every 100ms
  var t = setTimeout(setDigitalDate, 1000);
}

//Format date string to ensure always double digits
function formatDate(d) {
  //Prepend a zero when less than 10
  if (d < 10) { d = "0" + d; }
  return d;
}

//Format day of week to 3 character string
function formatDOW(dow) {
  //Array of days of the week
  let week = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  //Return day of the week at index
  return week[dow];
}

//Display analog time within the UI
function setAnalogTime() {
  //Get time from date object
  var time = new Date();
  //Convert time to angle to describe analog UI
  var secAngle = (time.getSeconds() / 60) * 360;
  var minAngle = (time.getMinutes() / 60) * 360;
  var hourAngle = ((time.getHours() / 24) / 2) * 360;

  //Set hands of the clock
  setHand("arcSec", 225, secAngle);
  setHand("arcMin", 205, minAngle);
  setHand("arcHour", 180, hourAngle);

  //Set "fingers" of the clock
  setFinger("dotSec", 225, secAngle);
  setFinger("dotMin", 205, minAngle);
  setFinger("dotHour", 180, hourAngle);

  //Set digital component of analog clock for clarity
  document.getElementById('sc').innerHTML = formatTime(time.getSeconds());
  document.getElementById('mn').innerHTML = formatTime(time.getMinutes());
  document.getElementById('hr').innerHTML = time.getHours();
  //Update every 500ms
  var t = setTimeout(setAnalogTime, 500);
}

//Calculate cartesian position of SVG elements
function getCoordinates(radius, deg) {
  //Convert degrees into radians with 90 degree offset
  radians = (deg - 90) * Math.PI / 180.0;
  //Convert polar coordinates to cartesian
  return {
    x: 230 + radius * Math.cos(radians),
    y: 230 + radius * Math.sin(radians)
  };
}

//Describe arc acting as hands of analog clock
function setHand(element, radius, endDeg) {
  //Get coordinates for start of arc
  let origin = getCoordinates(radius, endDeg);
  //Get coordinates for end of arc
  let point = getCoordinates(radius, 0);
  //Define arc sweep
  let direction;
  if(endDeg <= 180) {
    //Anti-clockwise turning arc
    direction = 0;
  } else {
    //Clockwise turning arc
    direction = 1;
  }

  //Move arc to origin
  let moveComponent = ['M', origin.x, origin.y].join(' ');
  //Draw arc from origin to point
  let arcComponent = ['A', radius, radius, 0, direction, 0, point.x, point.y].join(' ');
  //Create path for SVG arc to be drawn
  let arcPath = moveComponent + ' ' + arcComponent;
  document.getElementById(element).setAttribute('d', arcPath);
}

//Describe circle acting as pointer/"finger" of analog clock
function setFinger(element, radius, angle) {
  //Get coordinates for end of arc
  let pos = getCoordinates(radius, angle);
  //Get finger associated to element
  let finger = document.getElementById(element);
  //Set position of finger based on coordinates
  finger.setAttribute('cx', pos.x);
  finger.setAttribute('cy', pos.y);
}

//Display date within the analog UI
function setAnalogDate() {
  //Get date from date object
  var today = new Date();
  //Display date within UI
  document.getElementById('dw').innerHTML = formatDOW(today.getDay());
  document.getElementById('dd').innerHTML = formatDate(today.getDate());
  document.getElementById('mm').innerHTML = formatDate(today.getMonth() + 1);
  document.getElementById('yyyy').innerHTML = today.getFullYear();
  //Update every 100ms
  var t = setTimeout(setAnalogDate, 1000);
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
      //Change face of clock
      toggleClock();
      break;
    case "Down":
      //Change face of clock
      toggleClock();
      break;
    case "Left":
      //Change face of clock
      toggleClock();
      break;
    case "Right":
      //Change face of clock
      toggleClock();
      break;
    case "Wave":
      //Navigate back to homepage for module selection
      document.location.href = "homepage.html";
      break;
  }
});
