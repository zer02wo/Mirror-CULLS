var {PythonShell} = require('python-shell');
const { BrowserWindow } = require('electron').remote;
var win = BrowserWindow.getAllWindows()[0];
const {google} = require('googleapis');
const fs = require('fs');
const storage = require('electron-json-storage-sync');

//Global variables
var theta, numSlides, carouselIndex = 0;
var auth, events;
//Initialise authentication to facilitate Google Calendar API
function initAuth() {
  //Initialises persistent storage on first run
  if(storage.keys().status == false) {
    let result = storage.set('test', 0);
    if(result.error) {
      throw result.error;
    } else {
      storage.remove('temp');
    }
  }

  //Previously authenticated
  if(storage.keys().data.includes("calendarTokens")) {
    //Read credentials from file
    fs.readFile('credentials.json', (err, data) => {
      if(err) return displayError("An issue occurred reading application credentials. Please reload and try again.");
      //Parse credentials as JSON
      let credentials = JSON.parse(data);
      //Create new OAuth2 object using credentials
      const {client_id, client_secret, redirect_uris} = credentials.web;
      auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      //Get tokens from persistent storage
      let result = storage.get('calendarTokens');
      if(result.status) {
        //Set credentials of OAuth2 object using tokens -> automatic refresh upon expiration
        auth.setCredentials(result.data);
        //Initialise calendar
        init();
      } else {
        return displayError("An issue occurred accessing Google Calendar information. Please reload and try again.");
      }
    });
  } else {
    //Perform initial authentication
    //No query string in current url
    if(!document.location.href.includes("?")) {
      //Read app credentials
      fs.readFile('credentials.json', (err, data) => {
        if(err) return displayError("An issue occurred reading application credentials. Please reload and try again.");
        //Get access code to exchange for OAuth2 tokens
        getAccessCode(JSON.parse(data));
      });
    } else {
      //Query string in current url after being redirected
      //Read app credentials
      fs.readFile('credentials.json', (err, data) => {
        if(err) return displayError("An issue occurred reading application credentials. Please reload and try again.");
        //Exchange access code for OAuth2 tokens
        getTokens(JSON.parse(data), init);
      });
    }
  }
}

//Obtain access code in query string after authorising and being redirected
async function getAccessCode(credentials) {
  //Create OAuth2 object using app credentials
  const {client_id, client_secret, redirect_uris} = credentials.web;
  auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  //Define scope of API control
  const scope = ['https://www.googleapis.com/auth/calendar.events'];

  //Generate auth url to visit
  const authurl = auth.generateAuthUrl({
    access_type: 'offline',
    scope: scope
  });
  //Load auth url with Chrome user agent to prevent security error
  win.webContents.setUserAgent('Chrome');
  document.location.href = authurl;
}

//Exchange access code for OAuth2 tokens
async function getTokens(credentials, callback) {
  //Create OAuth2 object using app credentials
  const {client_id, client_secret, redirect_uris} = credentials.web;
  const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  //Get queryString from current url
  let qryStr = document.location.href.split("?")[1];
  //Get access code code from query string and decode it into usable format
  let code = qryStr.split("&")[0].substring(5);
  let decodedCode = decodeURIComponent(code);

  //Wait for promise response before continuing
  const {tokens} = await auth.getToken(decodedCode);
  //Set tokens object into persistent storage
  let accessRes = storage.set('calendarTokens', tokens);
  if(accessRes.error) {
    return displayError("An issue occurred storing Google Calendar information. Please reload and try again.");
  }
  //Set credentials using obtained OAuth2 tokens
  auth.setCredentials(tokens);

  //Callback to init() method with authenticated OAuth2 object
  callback(auth);
}

//Initialise calendar API and display
function init() {
  //Create calendar object
  const calendar = google.calendar({version: 'v3', auth});
  //Request events from API
  updateEvents(calendar);
  //Display loading icon for 4 seconds to give time for gesture sensor to initialise and DOM to build
  setTimeout(function() { document.getElementById('loading').classList.add("hidden"); }, 4000);
}

//Obtain events from API call
function updateEvents(calendar) {
  let now = new Date();
  let week = new Date();
  week.setDate(now.getDate() + 7);
  //List a maximum of 10 events from primary calendar within the next week
  calendar.events.list({
    calendarId: 'primary',
    timeMin: (now).toISOString(),
    timeMax: (week).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if(err) return displayError("Google Calendar returned an error: " + err);
    //Update UI component with API response
    updateCarousel(res.data.items);
  });
}

//Update and display events within UI
function updateCarousel(data) {
  //Update globabl variable
  events = data;
  //User has any events matching the criteria
  if(events.length) {
    //Iterate through all events in reverse order for UX in carousel
    for(var i = events.length - 1; i >= 0; i--) {
      var event = events[i];
      //Event is not already in page
      if(document.getElementById(event.id) == null) {
        //Create slide of carousel acting as container of event
        var slide = document.createElement('div');
        slide.classList.add('carousel-slide');
        //Use event id as DOM id
        slide.id = event.id;
        //Place event title/summary within UI
        var summary = document.createElement('p');
        summary.classList.add('event-summary');
        if(event.summary != undefined) {
          summary.innerHTML = event.summary;
        } else {
          summary.innerHTML = "(No Title)";
        }
        slide.appendChild(summary);

        //Event has a location
        if(event.location != undefined) {
          //Display within UI
          var location = document.createElement('p');
          location.classList.add('event-location');
          location.innerHTML = event.location;
          slide.appendChild(location);
        }

        //Create date/time nodes
        var eventTime = document.createElement('div');
        eventTime.classList.add('event-details');
        var date = document.createElement('p');
        date.classList.add('event-date');
        var time = document.createElement('p');
        time.classList.add('event-time');
        //No start time (i.e. event lasts all day)
        if(event.start.dateTime == undefined) {
          var start = new Date(event.start.date);
          //Format date and display within UI
          date.innerHTML = formatDate(start);
          slide.appendChild(date);
          //Display general time constraint within UI
          time.innerHTML = "All Day";
          slide.appendChild(time);
        } else {
          //Event has start/end time
          var start = new Date(event.start.dateTime);
          var end = new Date(event.end.dateTime);
          //Format date and display within UI
          date.innerHTML = formatDate(start);
          slide.appendChild(date);
          //Format time and display within UI
          time.innerHTML = formatTime(start, end);
          slide.appendChild(time);
        }
        //Add event slide to carousel
        document.getElementById('carousel').appendChild(slide);
      }
      //Transform event slides into vertical carousel
      updateTransformations();
    }
  } else {
    //User has no events matching required criteria
    //Display message within UI
    document.getElementById('carousel').innerHTML = "No upcoming events found. <br/> Your schedule is all clear!";
  }
}

//Update transformations of carousel slides within 3D space
function updateTransformations() {
  //Get all event slides
  var slides = document.getElementsByClassName('carousel-slide');
  numSlides = slides.length;
  //Calculate angle of each triangle made by slides
  theta = 360.0 / numSlides;
  //Calculate z-axis translation (i.e. radius) component using tan = opposite/adjacent
  var zShift = 205 / Math.tan(Math.PI / numSlides);
  //Specific cases for few sides
  if(numSlides < 3) {
    zShift = 100;
  }
  if(numSlides < 2) {
    theta = 0;
  }
  //Transform each event slide in carousel accordingly
  for(var j = 0; j < numSlides; j++) {
    slides[j].style.transform = "rotateX(" + (j * theta) + "deg) translateZ(" + zShift + "px)";
  }
  //Navigate to closest event to begin
  carouselIndex = numSlides - 1;
  navigateCarousel();
}

//Format date as string of HTML to be displayed within UI
function formatDate(date) {
  //Array of month formats
  var months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  //Get date information from date object
  var day = date.getDate();
  var month = date.getMonth();
  //Return formatted string
  return months[month] + "<br/>" + day;
}

//Format time as string of HTML to be displayed within UI
function formatTime(start, end) {
  //Format time into simple string format
  var startStr = formatTimeString(start);
  var endStr = formatTimeString(end);
  //Concatenate start/end times
  var times = startStr + " - " + endStr;

  //Calculate duration in hours and minutes
  var duration = end - start;
  var minDif = Math.floor((duration / 60000) % 60);
  var hourDif = Math.floor((duration / 3600000) % 24);
  //Format to exclude component if zero
  var dur;
  if(hourDif < 1) {
    dur = minDif + "mins";
  } else if(minDif < 1) {
    dur = hourDif + "hrs";
  } else {
    dur = hourDif + "hrs " + minDif + "mins";
  }
  //Return formatted string
  return times + "<br/>" + dur;
}

//Format a specific time as a simple string
function formatTimeString(time) {
  //Get minutes and prepend zero
  var mins = time.getMinutes();
  mins = (mins < 10) ? "0" + mins : mins;
  //Get hours and prepend zero
  var hours = time.getHours();
  hours = (hours < 10) ? "0" + hours : hours;
  //Return formatted string
  return hours + ":" + mins;
}

//Rotate the carousel to view event at index
function navigateCarousel() {
  //Ensure carouselIndex is within bounds
  checkIndex();
  //Calculate angle to rotate carousel
  var angle = theta * carouselIndex * -1;
  //Rotate carousel
  document.getElementById('carousel').style.transform = "rotateX(" + angle + "deg)";
}

//Delete an event from the calendar
function deleteEvent(direction) {
  //Create calendar object
  const calendar = google.calendar({version: 'v3', auth});
  //Get id of event to be deleted
  var index = numSlides - (carouselIndex + 1);
  var id = events[index].id;

  //Request API to delete event from primary calendar
  calendar.events.delete({
    calendarId: 'primary',
    eventId: id
  }, (err, res) => {
    if(err) return displayError("Google Calendar returned an error: " + err);
    //Remove event from global variable
    events.splice(index, 1);
    //Display swipe left/right animation of event slide based on direction
    var slides = document.getElementsByClassName('carousel-slide');
    var delSlide = slides[carouselIndex];
    delSlide.style.transform = "translateX(" + (direction*150) + "%)";
    //Remove event from DOM and update UI after animation finish
    setTimeout(function() { delSlide.remove(); updateEvents(calendar); }, 200);
  });
}

//Check index of carousel is within bounds
function checkIndex() {
  //Index above upper bound
  if(carouselIndex > numSlides - 1) {
    //Go to start
    carouselIndex = 0;
  }
  //Index below lower bound
  if(carouselIndex < 0) {
    //Go to end
    carouselIndex = numSlides - 1;
  }
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
      //Navigate to previous carousel slide
      carouselIndex--;
      navigateCarousel();
      break;
    case "Down":
      //Navigate to next carousel slide
      carouselIndex++;
      navigateCarousel();
      break;
    case "Left":
      //Delete calendar event and animate to the left
      deleteEvent(-1);
      break;
    case "Right":
      //Delete calendar event and animate to the right
      deleteEvent(1);
      break;
    case "Clockwise":
      //Navigate to start of carousel
      carouselIndex = 0;
      navigateCarousel();
      break;
    case "Anti-clockwise":
      //Navigate to end of carousel
      carouselIndex = numSlides - 1;
      navigateCarousel();
      break;
    case "Wave":
      //Navigate back to homepage for module selection
      document.location.href = "homepage.html";
      break;
  }
});
