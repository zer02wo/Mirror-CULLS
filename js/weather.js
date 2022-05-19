var {PythonShell} = require('python-shell');
const storage = require('electron-json-storage-sync');
var moment = require('moment-timezone');
//Global weather data variable
var input, startTime, timeout;

//Init JSON API response into global variable and init default display
function init() {
  //Initialises persistent storage on first run
  if(storage.keys().status == false) {
    let result = storage.set('test', 0);
    if(result.error) {
      throw result.error;
    } else {
      storage.remove('temp');
    }
  }

  //Get startTime from persistent storage
  if(storage.keys().data.includes("weatherStart")) {
    let result = storage.get('weatherStart');
    if(result.status) {
      startTime = result.data;
    } else {
      throw result.error;
    }
  }

  //If less than 30 minutes since start time has passed, get data from persistent storage
  // -> prevents frequent API calls when switching between widgets
  if(startTime + (30*60000) > Date.now()) {
    //Get weather information from persistent storage
    let result = storage.get('weather');
    if(result.status) {
      input = result.data;
    } else {
      throw result.error;
    }
    dayView();
  } else {  //Else make a new API request
    //Update startTime to current time
    startTime = Date.now();
    //Update timeout to run for another 30 minutes
    timeout = setTimeout(init, (30*60000));
    //Set startTime into persistent storage
    let result = storage.set('weatherStart', startTime);
    if(result.error) {
      throw result.error;
    }

    var lat;
    //If no destination latitude within config file
    if(config.dest_lat == undefined || config.dest_lat == "") {
      //Supply default latitude
      lat = 52.4783909;
    } else {
      //Use latitude from config file
      lat = config.dest_lat;
    }
    var lng;
    //If no destination longitude within config file
    if(config.dest_lng == undefined || config.dest_lng == "") {
      //Supply default longitude
      lng = -1.9127066;
    } else {
      //Use longitude from config file
      lng = config.dest_lng;
    }

    //API request to weatherbit to fetch 7 day forecast data at latitude/longitude specified in config file
    var url = "https://api.weatherbit.io/v2.0/forecast/daily?lat=" + lat + "&lon=" + lng + "&days=7&key=" + config.weather_key;
    fetch(url)
    .then(res => res.json())
    .then((data) => {
      //Set API response to global variable
      input = data;
      //Set weather information into persistent storage
      let result = storage.set('weather', input);
      if(result.error) {
        throw result.error;
      }
      //If no error retriveing data from API
      if(data.error == undefined) {
        //Init display within UI
        dayView();
      } else {
        //Throw error
        throw data.error;
      }
    })
    .catch((err) => {
      //displayError("There was an issue getting the weather.\nPlease ensure config.json is correctly configured.");
      displayError(err);
      storage.remove("weather");
      storage.remove("weatherStart");
    });
  }
  //Display loading icon for 4 seconds to give time for gesture sensor to initialise and Weatherbit API to respond
  setTimeout(function() { document.getElementById('loading').classList.add("hidden"); }, 4000);
}

//Default display, showing single large weather forecast for today
function dayView() {
  //Display city name
  document.getElementById('city').innerHTML = input.city_name;
  //Display weather icon associated with weather description
  var iconClass = getIconClass(input.data[0]);
  var temp = input.data[0].temp;
  document.getElementById('today-weather').innerHTML = "<i class='" + iconClass + "'></i> " + temp.toFixed(1) + "<i class='wi wi-celsius'></i>";
  //Set colour based on temperature
  document.getElementById('today-weather').style.color = getColour(temp);

  //Display description of weather
  var desc = input.data[0].weather.description.replace("with", "/");
  document.getElementById('today-details').innerHTML = desc;
  //Display probability of raining
  var rainProb = input.data[0].pop;
  document.getElementById('today-details').innerHTML += " | <i class='wi wi-umbrella'></i> " + rainProb + "%";
  //Display precipitation to 1dp
  var precip = input.data[0].precip.toFixed(1);
  document.getElementById('today-details').innerHTML += " | <i class='wi wi-raindrop'></i> " + precip + "mm";
  //Display cloud coverage
  var humidity = input.data[0].rh;
  document.getElementById('today-details').innerHTML += " | <i class='wi wi-humidity'></i> " + humidity + "%";
  //Display wind direction
  var windDir = calcWindDir(input.data[0]);
  document.getElementById('today-details').innerHTML += " | <i class='wi wi-wind towards-" + windDir + "-deg'></i>";
  //Display wind speed to 0dp
  var windSpeed = input.data[0].wind_spd.toFixed(0);
  document.getElementById('today-details').innerHTML += " <i class='wi wi-windy'></i> " + windSpeed + "mph"

  //Get information to display within weeks forecast - hidden by default
  weekInit();
}

//Map colour to temperature
function getColour(temp) {
  //Colour map gradient from blue to red based on temperature, based on kelvin colour temperature
  var temperatureColours = [
    { tmp: 3, color: {r: 104, g: 220, b: 255} },  //Icy blue
    { tmp: 9, color: {r: 255, g: 255, b: 255} },  //Snow white
    { tmp: 12, color: {r: 255, g: 236, b: 10} },  //Mellow yellow
    { tmp: 18, color: {r: 255, g: 192, b: 0} },   //Warm orange
    { tmp: 24, color: {r: 255, g: 71, b: 71} }    //Red hot
  ];

  //Break when temperature above a colour threshold
  for(var i = 1; i < temperatureColours.length - 1; i++) {
    if(temp < temperatureColours[i].tmp) {
      break;
    }
  }
  //Define upper and lower bounds of colour values
  var lowerBound = temperatureColours[i - 1];
  var upperBound = temperatureColours[i];
  //Define range of colour values
  var range = (temp - lowerBound.tmp) / (upperBound.tmp - lowerBound.tmp);
  //Define upper and lower bounds within range
  var rangeLower = 1 - range;
  var rangeUpper = range;
  //Create new colour via multiplication combination on upper and lower bounds
  var rgb = {
    r: Math.floor(lowerBound.color.r * rangeLower + upperBound.color.r * rangeUpper),
    g: Math.floor(lowerBound.color.g * rangeLower + upperBound.color.g * rangeUpper),
    b: Math.floor(lowerBound.color.b * rangeLower + upperBound.color.b * rangeUpper)
  };
  //Return the created colour as a css rgb colour string
  return "rgb(" + [rgb.r, rgb.g, rgb.b].join(',') + ")";
}

//Display forecast for the week's details
function weekInit() {
  var week = document.getElementsByClassName('weather');
  for(var i = 1; i < input.data.length; i++) {
    //Display icon associated with weather description
    var iconClass = getIconClass(input.data[i]);
    week[i-1].innerHTML = "<p><i class='" + iconClass + "'></i></p>";
    //Display day of the week associated to the forecast
    var weekDay = getDayOfWeek(input.data[i]);
    week[i-1].innerHTML += "<p>" + weekDay + "</p>"
    //Display weather description
    var desc = input.data[i].weather.description.replace("with", "/");
    week[i-1].innerHTML += "<p>" + desc + ": </p>";
    //Display temperature to 1dp in appropriate colour
    var temp = input.data[i].temp;
    week[i-1].innerHTML += "<p style='color:" + getColour(temp) + "'>" + temp.toFixed(1) + "<i class='wi wi-celsius'></i></p>";
    //Display probability of raining
    var rainProb = input.data[i].pop;
    week[i-1].innerHTML += "<p><i class='wi wi-umbrella'></i> " + rainProb + "%</p>";
  }
}

//Hide week's forecast details
function hideWeek() {
  let week = document.getElementById('week');
  let today = document.getElementById('today');
  if(!week.classList.contains('hidden')) {
    week.classList.add('hidden');
    today.classList.add('shift');
  }
}

function viewWeek() {
  let week = document.getElementById('week');
  let today = document.getElementById('today');
  if(week.classList.contains('hidden')) {
    week.classList.remove('hidden');
    today.classList.remove('shift');
  }
}

function getIconClass(data) {
  //Convert weathercode to icon class
  let code = data.weather.code;
  let lookup = codeLookup(code);
  //Build icon class string with prefixes
  if(!lookup.includes("wi-")) {
    //Create moment based on timezone of weather location and get the timezone offset from UTC
    var m = moment().tz(input.timezone).utcOffset();
    //Get current date-time in UTC
    var utc = new Date().getTime();
    //Add time offset in milliseconds to get local time
    var localTime = new Date(utc + (m * 60000));
    //Get sunset date-time from API
    var sunset = new Date(data.sunset_ts * 1000);
    //Get sunrise date-time from API
    var sunrise = new Date(data.sunrise_ts * 1000);
    //Day or night prefix dependent on sunset/sunrise
    if(localTime < sunset && localTime.getHours() > sunrise.getHours()) {
      var icon = "wi-day-" + lookup;
    } else {
      var icon = "wi-night-alt-" + lookup;
    }
  } else {
    var icon = "" + lookup;
  }
  //Final component of icon class name
  var iconClass = "wi " + icon;
  //Specific case for icons non-consistent with naming scheme
  if(code == 800) {
    if(localTime < sunset && localTime.getHours() > sunrise.getHours()) {
      var iconClass = "wi wi-day-sunny";
    } else {
      var iconClass = "wi wi-night-clear";
    }
  }
  return iconClass;
}

//Round wind direction to nearest 45 degrees
function calcWindDir(data) {
  let degrees = Math.round(data.wind_dir / 45) * 45;
  return degrees;
}

//Get the abbreviated days of the week
function getDayOfWeek(data) {
  let date = new Date(data.valid_date);
  let day = date.getDay();
  let days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[day];
}

//Map weather code to icon class information
function codeLookup(code) {
  switch(code) {
    default:
    return "wi-na";
    case 200:
    return "lightning";
    case 201:
    return "thunderstorm";
    case 202:
    return "thunderstorm";
    case 230:
    return "lightning";
    case 231:
    return "storm-showers";
    case 232:
    return "storm-showers";
    case 233:
    return "hail";
    case 300:
    return "showers";
    case 301:
    return "sprinkle";
    case 302:
    return "sprinkle";
    case 500:
    return "rain-mix";
    case 501:
    return "rain";
    case 502:
    return "rain-wind";
    case 511:
    return "rain";
    case 520:
    return "showers";
    case 521:
    return "showers";
    case 522:
    return "rain-mix";
    case 600:
    return "snow";
    case 601:
    return "snow-wind";
    case 602:
    return "snow-wind";
    case 610:
    return "snow";
    case 611:
    return "sleet";
    case 612:
    return "sleet";
    case 621:
    return "snow";
    case 622:
    return "snow-wind";
    case 623:
    return "snow";
    case 700:
    return "fog";
    case 721:
    return "fog";
    case 721:
    return "haze";
    case 731:
    return "wi-sandstorm";
    case 741:
    return "wi-fog";
    case 751:
    return "fog";
    case 800:
    return "sunny/clear";
    case 801:
    return "cloudy";
    case 802:
    return "cloudy";
    case 803:
    return "wi-cloudy";
    case 804:
    return "cloudy-high";
    case 900:
    return "wi-raindrops";
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
      //Hide week view of the weather
      hideWeek();
      break;
    case "Down":
      //Display week view of the weather
      viewWeek();
      break;
    case "Wave":
      //Navigate back to homepage for module selection
      document.location.href = "homepage.html";
      break;
  }
});
