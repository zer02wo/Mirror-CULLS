var {PythonShell} = require('python-shell');

//Global variables
var map, directionsService, directionsDisplay;

//Initialises Google Maps API
function initMap() {
  try {
    //Checking config.json
    if(config.origin_lat == "" || config.origin_lat == undefined || config.origin_lng == "" || config.origin_lng == undefined) {
      throw "NOT_FOUND";
    }
    map = new google.maps.Map(document.getElementById('map'), {
    backgroundColor: 'hsla(0, 0%, 0%, 0)',
    keyboardShortcuts: false,
    disableDefaultUI: true,
    styles: [
      //Set background to black
      {
        featureType: 'landscape',
        elementType: 'geometry',
        stylers: [{visibility: 'off'}]
      },
      {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [{visibility: 'off'}]
      },
      {
        featureType: 'administrative',
        elementType: 'geometry',
        stylers: [{visibility: 'off'}]
      },
      //Set label text to black
      {
        featureType: 'all',
        elementType: 'labels.text.fill',
        stylers: [{color: '#000000'}]
      },
      //Set label outline to white
      {
        featureType: 'all',
        elementType: 'labels.text.stroke',
        stylers: [{color: '#FFFFFF'}]
      },
      //Remove all labels
      {
        featureType: 'all',
        elementType: 'labels',
        stylers: [{visibility: 'off'}]
      },
      //Turn on road labels specifically
      {
        featureType: 'road',
        elementType: 'labels',
        stylers: [{visibility: 'on'}]
      },
      //Turn on transit labels specifically
      {
        featureType: 'transit',
        elementType: 'labels',
        stylers: [{visibility: 'on'}]
      },
      //Turn on poi icons specficially
      {
        featureType: 'poi',
        elementType: 'labels.icon',
        stylers: [{visibility: 'on'}]
      },
      //Simplify roads to appear thinner
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{visibility: 'simplified'}]
      }
    ]
  });
  //Only display route when a destination is given
  if(config.dest_lat != "" && config.dest_lng != "") {
    //Initialise directions variables
    directionsService = new google.maps.DirectionsService();
    directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
    //Set directions renderer to map
    directionsDisplay.setMap(map);
    //Display direction route on map
    displayRoute();
  }

  //Display traffic data on map
  var trafficLayer = new google.maps.TrafficLayer();
  trafficLayer.setMap(map);
  //Display loading icon for 4 seconds to give time for gesture sensor to initialise and Google Maps to load
  setTimeout(function() { document.getElementById('loading').classList.add("hidden"); }, 4000);
  } catch(err) {
    displayError(err);
  }
}

//Calculate route and display on map
function displayRoute() {
  //Configure request to be sent to directions service
  var o = config.origin_lat + "," + config.origin_lng;
  var d = config.dest_lat + "," + config.dest_lng;
  var request = {
    origin: o,
    destination: d,
    travelMode: checkTravelMode(),
    transitOptions: {
      departureTime: new Date(Date.now())
    },
    drivingOptions: {
      departureTime: new Date(Date.now()),
      trafficModel: 'bestguess'
    },
  };

  //Send request to directions service with above configurations
  directionsService.route(request, function(result, status) {
    //Request successful
    if(status == 'OK') {
      //Render directions onto map
      directionsDisplay.setDirections(result);

      //Get legs of journey from response
      var steps = result.routes[0].legs[0].steps;
      //Get start marker location
      let startLat = steps[0].start_location.lat(function() { return a; })
      let startLng = steps[0].start_location.lng(function() { return b; });
      let startLatLng = new google.maps.LatLng(startLat, startLng);
      //Create start marker
      let startMarker = new google.maps.Marker({
        position: startLatLng,
        map: map,
        icon: "https://maps.google.com/mapfiles/markerA.png"
      });

      //Get marker location
      let lat = steps[steps.length-1].end_location.lat(function() { return a; });
      let lng = steps[steps.length-1].end_location.lng(function() { return b; });
      let latLng = new google.maps.LatLng(lat, lng);
      //Create marker
      let marker = new google.maps.Marker({
        position: latLng,
        map: map,
        icon: "https://maps.google.com/mapfiles/markerB.png"
      });

      //Get route information depending on mode of transportation
      var contentStr;
      if(checkTravelMode() == "TRANSIT") {
        //Get route information to display
        let departure = result.routes[0].legs[0].departure_time.text;
        let arrival = result.routes[0].legs[0].arrival_time.text;
        let distance = result.routes[0].legs[0].distance.text;
        let duration = result.routes[0].legs[0].duration.text;

        //Format route information
        contentStr = "Depart: " + departure + " - Arrive: " + arrival + "<br/> ";
        contentStr += distance + " / " + duration;
      } else if(checkTravelMode() == "DRIVING"){
        //Get route information to display
        let distance = result.routes[0].legs[0].distance.text;
        let duration = result.routes[0].legs[0].duration.text;
        let trafficDuration = result.routes[0].legs[0].duration_in_traffic.text;
        let departure = new Date();
        let arrival = new Date(Date.now() + (result.routes[0].legs[0].duration.value * 1000));

        //Format route information
        contentStr = "Depart: " + departure.getHours() + ":" + departure.getMinutes() + " - Arrive: " + arrival.getHours() + ":" + arrival.getMinutes() + "<br/>";
        contentStr += distance + " / " + duration + "<br/>";
        contentStr += "With traffic: " + trafficDuration;
      } else {
        //Get route information to display
        let distance = result.routes[0].legs[0].distance.text;
        let duration = result.routes[0].legs[0].duration.text;
        let departure = new Date();
        let arrival = new Date(Date.now() + (result.routes[0].legs[0].duration.value * 1000));

        //Format route information
        contentStr = "Depart: " + departure.getHours() + ":" + departure.getMinutes() + " - Arrive: " + arrival.getHours() + ":" + arrival.getMinutes() + "<br/>";
        contentStr += distance + " / " + duration;
      }

      //Create info window to display formatted information content
      let infoWindow = new google.maps.InfoWindow({
        content: contentStr
      });
      //Display info window above marker at end of journey
      infoWindow.open(map, marker);
      //Close info window after 10 seconds to clean up map view
      setTimeout(function() { infoWindow.close(); }, 10000);
      //Animate marker to bounce
      marker.setAnimation(google.maps.Animation.BOUNCE);
  } else { //Request unsucessful
    //Display error in div based on request status
    displayError(status);
  }
  });
}

//Check for alternate wording in config file
function checkTravelMode() {
  if(config.travel_mode.toUpperCase() == "DRIVING" || config.travel_mode.toUpperCase() == "DRIVE") {
    return "DRIVING";
  }
  if(config.travel_mode.toUpperCase() == "TRANSIT" || config.travel_mode.toUpperCase() == "BUS" || config.travel_mode.upperCase() == "TRAIN") {
    return "TRANSIT";
  }
  if(config.travel_mode.toUpperCase() == "BICYCLING" || config.travel_mode.toUpperCase() == "BIKE") {
    return "BICYCLING";
  }
  if(config.travel_mode.toUpperCase() == "WALKING" || config.travel_mode.toUpperCase() == "WALK") {
    return "WALKING";
  }
  //If config file matches none of the above formats, default to DRIVING
  return "DRIVING";
}

//Format number of minutes into human-readable format
function formatMinutes(minutes) {
  //Number of minutes less than two digits
  if(minutes < 10) {
    //Prepend zero to number of minutes
    return "0" + minutes;
  } else {
    return minutes;
  }
}

//Display error message in div depending on directions request status
function displayError(status) {
  //Error message to be determined based on status of directions query
  var err;
  if(status == "NOT_FOUND") {
    err = "One or more locations could not be found/geocoded.\nPlease ensure the config file is correctly configured.";
  } else if(status == "ZERO_RESULTS") {
    err = "No possible route could be found between origin and destination.\nPlease ensure the config file is correctly configured.";
  } else if(status == "MAX_ROUTE_LENGTH_EXCEEDED") {
    err = "Route is too long to be displayed or has too many complex directions.\nPlease try using a simpler route.";
  } else if(status == "INVALID_REQUEST") {
    err = "Invalid request.\nPlease ensure the config file is correctly configured.";
  } else if(status == "OVER_QUERY_LIMIT") {
    err = "Too many requests have been sent within a short period of time.\nPlease wait before trying again.";
  } else if(status == "REQUEST_DENIED") {
    err = "Unable to process directions.\nPlease check your network settings.";
  } else {
    err = "An unknown error has occurred.\nPlease try again.";
  }

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
      //Pan up 100 pixels
      map.panBy(0,-100);
      break;
    case "Down":
      //Pan down 100 pixels
      map.panBy(0,100);
      break;
    case "Left":
      //Pan left 100 pixels
      map.panBy(-100,0);
      break;
    case "Right":
      //Pan right 100 pixels
      map.panBy(100,0);
      break;
    case "Forward":
      //Zoom in
      map.setZoom(map.getZoom()+1);
      break;
    case "Backward":
      //Zoom out
      map.setZoom(map.getZoom()-1);
      break;
    case "Wave":
      //Navigate back to homepage for module selection
      document.location.href = "homepage.html";
      break;
  }
});
