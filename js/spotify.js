var {PythonShell} = require('python-shell');
const storage = require('electron-json-storage-sync');
const querystring = require('querystring');
const colorThief = require('colorthief');
//Lightweight Node Spotify API wrapper
const Spotify = require('spotify-web-api-js');

//Global Spotify API variable
var spotifyApi, startTime, refreshToken;

//User authorises access to Spotify API through OAuth2
function getAuthCode(clientId, redirectUri, scope, state) {
  var authURL = createAuthURL(clientId, redirectUri, scope, state);

  //If no query string within url
  if(!document.location.href.includes("?")) {
    //Open authURL -> user only required to give consent once
    document.location.href = authURL;
  }
  //Get query string from URL and parse it
  qryStr = document.location.href.split("?")[1];
  qryStr = querystring.parse(qryStr);

  //Return authorisation code to be exchanged for OAuth2 tokens
  return qryStr.code;
}

//Creates the URL to enable the user to authorise the application in using Spotify API
function createAuthURL(clientId, redirectUri, scope, state) {
  //Create base of url
  var url = "https://accounts.spotify.com/authorize";
  //Add clientId to query string
  url += "?client_id=" + clientId;
  //Add response type to query string
  url += "&response_type=code"
  //Add redirectUri to query string
  url += "&redirect_uri=" + redirectUri;
  //Add scope to query string
  url += "&scope=" + scope;
  //Add state to query string
  url += "&state=" + state;

  return url;
}

//Exchange the authorisation code for the OAuth2 tokens
function getAuthTokens(clientId, code, redirectUri, clientSecret) {
  //Array to be returned
  var tokens;
  //Create base of url
  var url = "https://accounts.spotify.com/api/token";
  //Create base request body to obtain OAuth2 tokens
  var body = "grant_type=authorization_code";
  //Add authorisation code from /authorize endpoint
  body += "&code=" + code;
  //Add redirect_uri -> no actual redirection, purely used for validation to match request to /authorize endpoint
  body += "&redirect_uri=" + redirectUri;

  //Encode client id and client secret to base 64 in required format
  let clientInfo = clientId + ':' + clientSecret;
  let encodedClient = "Basic " + window.btoa(clientInfo);

  //Create post request...
  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    //If successful request
    if(this.readyState == 4 && this.status == 200) {
      //Obtain OAuth2 tokens from response
      var response = (JSON.parse(request.responseText));
      tokens = [response.access_token, response.refresh_token];
      //Set startTime into persistent storage
      startTime = Date.now();
      let result = storage.set('spotifyStart', startTime);
      if(result.error) {
        throw result.error;
      }
    }
  }
  request.open("POST", url, false);
  //... with authorization header parameter...
  request.setRequestHeader("Authorization", encodedClient);
  //... with specified content type header parameter...
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  //... and specified request body parameters
  request.send(body);

  return tokens;
}

function refreshAuth(clientId, clientSecret) {
  //Refreshed access token to be returned
  var access;
  //Create base of url
  var url = "https://accounts.spotify.com/api/token";
  //Create base request body to obtain OAuth2 tokens
  var body = "grant_type=refresh_token";
  //Add refresh token from authorisation code exchange
  body += "&refresh_token=" + refreshToken;

  //Encode client id and client secret to base 64 in required format
  let clientInfo = clientId + ':' + clientSecret;
  let encodedClient = "Basic " + window.btoa(clientInfo);

  //Create post request...
  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    //If successful request
    if(this.readyState == 4 && this.status == 200) {
      //Obtain refreshed access token from response
      var response = (JSON.parse(request.responseText));
      access = response.access_token;
      //Set startTime into persistent storage
      startTime = Date.now();
      let result = storage.set('spotifyStart', startTime);
      if(result.error) {
        throw result.error;
      }
    }
  }
  request.open("POST", url, false);
  //... with authorization header parameter...
  request.setRequestHeader("Authorization", encodedClient);
  //... with specified content type header parameter...
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  //... and specified request body parameters
  request.send(body);

  return access;
}

function initialAuth(clientId, redirectUri, scope, state, clientSecret) {
  //Get authorisation code to exchange for OAuth2 tokens
  let code = getAuthCode(clientId, redirectUri, scope, state);
  //Get access and refresh OAuth2 tokens
  let tokens = getAuthTokens(clientId, code, redirectUri, clientSecret);
  //Set access token into persistent storage
  var accessToken = tokens[0];
  let accessRes = storage.set('spotifyAccess', accessToken);
  if(accessRes.error) {
    throw accessRes.error;
  }
  //Set refresh token into persistent storage
  refreshToken = tokens[1];
  let refreshRes = storage.set('spotifyRefresh', refreshToken);
  if(refreshRes.error) {
    throw refreshRes.error;
  }
  //Set access token for API
  spotifyApi.setAccessToken(accessToken);
}

function checkExpiration(clientId, clientSecret) {
  //Access tokens expire after 3600 seconds/1 hour
  if(startTime + (3600*1000) < Date.now()) {  //Token invalid
    //Get refreshed access token for API
    let accessToken = refreshAuth(clientId, clientSecret);
    //Set access token into persistent storage
    let result = storage.set('spotifyAccess', accessToken);
    if(result.error) {
      throw result.error;
    }
    //Set access token for API
    spotifyApi.setAccessToken(accessToken);
  } else { //Token still valid
    //Get access token from persistent storage
    let result = storage.get('spotifyAccess');
    if(result.status) {
      let accessToken = result.data;
      //Set access token for API
      spotifyApi.setAccessToken(accessToken);
    } else {
      throw result.error;
    }
  }
}

//Initialise authorisation and Spotify API
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

  //Initialise Spotify API
  spotifyApi = new Spotify();
  //Authorisation information
  let clientId =  config.spotify_client_id,
      redirectUri = "spotify://callback",
      scope = "user-read-playback-state streaming user-modify-playback-state user-read-currently-playing",
      state = "spotify",
      clientSecret = config.spotify_client_secret;

  //Get startTime from persistent storage
  if(storage.keys().data.includes("spotifyStart")) {
    let result = storage.get('spotifyStart');
    if(result.status) {
      startTime = result.data;
    } else {
      throw result.error;
    }
  }

  //Get refreshToken from persistent storage
  if(storage.keys().data.includes("spotifyRefresh")) {
    //Set refreshToken to global variable
    let result = storage.get('spotifyRefresh');
    if(result.status) {
      refreshToken = result.data;
    } else {
      throw result.error;
    }
    //Refresh access token if no longer valid
    checkExpiration(clientId, clientSecret);
  } else {
    //If not in storage, perform initial authorisation
    initialAuth(clientId, redirectUri, scope, state, clientSecret);
  }

  //Initialise UI display
  initView();
  //Update UI with API call every 5 seconds to balance number of API calls with sync of player
  var t = setInterval(function() { updateView(clientId, clientSecret); }, 5000);
  //Display loading icon for 4 seconds to give time for gesture sensor to initialise and Spotify API to respond
  setTimeout(function() { document.getElementById('loading').classList.add("hidden"); }, 4000);
}

function initView() {
  //Update elements within the UI
  updateView();
  //Wait until view initialised before displaying: prevent premature loading/displaying
  document.getElementById('player').style.display = "initial";
  document.getElementById('player-info').style.display = "flex";
}

//Update the view from API information on current playback state
function updateView(clientId, clientSecret) {
  //Check if access token is still valid before attempting to update
  checkExpiration(clientId, clientSecret);

  spotifyApi.getMyCurrentPlaybackState()
  .then(function(data) {
    if(data == undefined || data == "") {
      displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
    } else {
      //Get cover art and set it as the 'vinyl'
      let vinyl = document.getElementById('vinyl').src = data.item.album.images[1].url;
      //Set box-shadow to dominant colour of cover art
      colorThief.getColor(data.item.album.images[1].url)
      .then(function(data) {
        document.getElementById('vinyl-container').style.boxShadow = "0px 15px 20px rgba(" + data[0] + "," + data[1] + "," + data[2] + ",1)";
      })
      .catch(function(err) {
        displayError("There was an issue getting to Spotify.\nPlease reload and try again.");
      })

      //Get track and display within UI
      //Trim track name if too long
      let trackName = data.item.name;
      if(trackName.length > 25) {
        trackName = trackName.substr(0, 25).trim() + "...";
      }
      document.getElementById('track').innerHTML = trackName;
      //Get artist name and display within UI
      let artists = data.item.artists;
      //If multiple artists, add features
      if(artists.length > 1) {
        var artistName = artists[0].name + " ft. ";
        for(let i = 1; i < artists.length; i++) {
          artistName += artists[i].name + ", ";
        }
      } else {
        var artistName = artists[0].name;
      }
      //Trim artist name if too long
      if(artistName.length > 25) {
        artistName = artistName.substr(0, 25).trim() + "...";
      }
      document.getElementById('artist').innerHTML = artistName;

      //Get volume percentage and display within UI
      let volume = document.getElementById('volume');
      volume.value = data.device.volume_percent;
      volume.style.background = "linear-gradient(to right, #FF6384 0%, #FF6384 " + data.device.volume_percent + "%, #C5D5E7 0%, #C5D5E7 100%)";

      //Get track duration and display within UI
      document.getElementById('duration').innerHTML = formatTrackTime(data.item.duration_ms);
      //Get track progress and display within UI
      document.getElementById('current').innerHTML = formatTrackTime(data.progress_ms);
      document.getElementById('progress').value = (data.progress_ms / data.item.duration_ms) * 100;
      //Locally update track progress between UI calls
      updateProgress(data.progress_ms, data.item.duration_ms);

      //Get shuffle state and display within UI
      if(data.shuffle_state) {
        document.getElementById('shuffle').parentNode.classList.add('active');
      } else {
        document.getElementById('shuffle').parentNode.classList.remove('active');
      }
      //Get repeat state and display within UI
      if(data.repeat_state == "context") {
        //Set active icon
        let repeat = document.getElementById('repeat')
        repeat.className = "typcn typcn-arrow-repeat";
        let parent = repeat.parentNode;
        parent.classList.add('active');
      } else if(data.repeat_state == "track") {
        //Set active alt icon
        let repeat = document.getElementById('repeat')
        repeat.className = "typcn typcn-arrow-loop";
        let parent = repeat.parentNode;
        parent.classList.add('active');
      } else {
        //Set inactive icon
        let repeat = document.getElementById('repeat')
        repeat.className = "typcn typcn-arrow-repeat";
        let parent = repeat.parentNode;
        parent.classList.remove('active');
      }

      //Get playback state and display within UI
      if(data.is_playing) {
        //Set pause icon
        document.getElementById('play').className = "typcn typcn-media-pause";
        //Spin vinyl
        document.getElementById('vinyl').style.animationPlayState = "running";
      } else {
        //Set play icon
        document.getElementById('play').className = "typcn typcn-media-play";
        //Stop vinyl
        document.getElementById('vinyl').style.animationPlayState = "paused";
      }
    }
  })
  .catch(function(err) {
    displayError("There was an issue getting to Spotify.\nPlease reload and try again.");
  });
}

//Format milliseconds into form m:ss
function formatTrackTime(ms) {
  let mins = Math.floor(ms / 60000);
  let secs = ((ms % 60000) / 1000).toFixed(0);
  return mins + ":" + (secs < 10 ? "0" : "") + secs;
}

//Locally update the track time and progress bar in time between API calls
function updateProgress(startProgress, duration) {
  var curProgress = startProgress;
  //Clear interval after 5 seconds
  var clearT = setTimeout(function() {clearInterval(setT)}, 5000);
  //Update time/progress every second
  var setT = setInterval(function() {
    //Check if playing based on current UI icon
    if(document.getElementById('play').classList.contains('typcn-media-pause')) {
      //Increment time in milliseconds
      curProgress += 1000;
      //Display updated time within UI
      document.getElementById('current').innerHTML = formatTrackTime(curProgress);
      document.getElementById('progress').value = (curProgress / duration) * 100;
    }
  },
  1000);
}

function togglePlayback() {
  //Get current playback state
  spotifyApi.getMyCurrentPlaybackState()
    .then(function(data) {
      return data.is_playing;
    })
    .then(function(playing) {
      if(playing == undefined) {
        displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
      } else if(playing) {
        //Currently playing -> pause
        spotifyApi.pause(function(err, data) {
          if(err) displayError("There was an issue pausing the track.\nPlease check the playback device.");
        });
        //Set play icon
        let play = document.getElementById('play');
        play.className = "typcn typcn-media-play";
        //Stop vinyl
        document.getElementById('vinyl').style.animationPlayState = "paused";
        //Set active styling
        let parent = play.parentNode;
        parent.classList.add('active', 'fade');
        //Remove active styling after 1 second
        setTimeout(function() {parent.classList.remove('active', 'fade');}, 1000);
      } else {
        //Currently not playing -> play
        spotifyApi.play(function(err, data) {
          if(err) displayError("There was an issue playing the track.\nPlease check the playback device.");
        });
        //Set pause icon
        let pause = document.getElementById('play');
        pause.className = "typcn typcn-media-pause";
        //Spin vinyl
        document.getElementById('vinyl').style.animationPlayState = "running";
        //Set active styling
        let parent = pause.parentNode;
        parent.classList.add('active', 'fade');
        //Remove active styling after 1 second
        setTimeout(function() {parent.classList.remove('active', 'fade');}, 1000);
      }
    })
    .catch(function(err) {
      displayError("There was an issue getting to Spotify.\nPlease reload and try again.");
    });
}

function volumeDown() {
  //Get current volume
  spotifyApi.getMyCurrentPlaybackState()
  .then(function(data) {
    return data.device.volume_percent;
  })
  .then(function(curVolume) {
    if(curVolume == undefined) {
      displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
    } else if(curVolume > 0) {
      //Amount to decrease volume by
      var decrement = 10;
      //Change decrement to mute if current volume less than 10
      if(curVolume < 10) {
        decrement = curVolume;
      }
      //Lower voume by decrement
      spotifyApi.setVolume(curVolume-decrement, function(err, data) {
        if(err) displayError("There was an issue lowering the volume.\nPlease check the playback device.");
      });
      //Get volume percentage and display within UI
      let volume = document.getElementById('volume');
      volume.value = curVolume-decrement;
      volume.style.background = "linear-gradient(to right, #FF6384 0%, #FF6384 " + (curVolume-decrement) + "%, #C5D5E7 0%, #C5D5E7 100%)";
    } else {
      //Volume at 0
      displayError("Volume is already muted.");
    }
    //Set active styling
    let volDown = document.getElementById('volume-down');
    volDown.classList.add('active', 'fade');
    //Remove active styling after 1 second
    setTimeout(function() {volDown.classList.remove('active', 'fade');}, 1000);
  })
  .catch(function(err) {
    displayError("There was an issue getting to Spotify.\nPlease reload and try again.");
  });
}

function volumeUp() {
  spotifyApi.getMyCurrentPlaybackState()
  .then(function(data) {
    return data.device.volume_percent;
  })
  .then(function(curVolume) {
    if(curVolume == undefined) {
      displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
    } else if(curVolume < 100) {
      //Amount to increase volume by
      var increment = 10;
      //Change increment to max volume if current volume greater than 90
      if(curVolume > 90) {
        increment = 100 - curVolume;
      }
      //Increase volume by increment
      spotifyApi.setVolume(curVolume+increment, function(err, data) {
        if(err) displayError("There was an issue increasing the volume.\nPlease check the playback device");
        //Get volume percentage and display within UI
        let volume = document.getElementById('volume');
        volume.value = curVolume+increment;
        volume.style.background = "linear-gradient(to right, #FF6384 0%, #FF6384 " + (curVolume+increment) + "%, #C5D5E7 0%, #C5D5E7 100%)";
      });
    } else {
      //Volume at 100
      displayError("Volume is already at maximum.");
    }
    //Set active styling
    let volUp = document.getElementById('volume-up');
    volUp.classList.add('active', 'fade');
    //Remove active styling after 1 second
    setTimeout(function() {volUp.classList.remove('active', 'fade');}, 1000);
  })
  .catch(function(err) {
    displayError("There was an issue getting to Spotify.\nPlease reload and try again.");
  });
}

function playNext() {
  spotifyApi.skipToNext(function(err, data) {
    if(data == undefined) {
      displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
    }
    if(err) {
      displayError("There was an issue playing the next track.\nPlease check the playback device.");
    } else {
      //Set active styling
      let parent = document.getElementById('next').parentNode;
      parent.classList.add('active', 'fade');
      //Remove active styling after 1 second
      setTimeout(function() {parent.classList.remove('active', 'fade');}, 1000);
    }
  });
}

function playPrev() {
  spotifyApi.getMyCurrentPlaybackState()
  .then(function(data) {
    return data.progress_ms;
  })
  .then(function(curProgress) {
    //If more than 10 seconds have progressed in track
    if(curProgress > 10*1000) {
      spotifyApi.seek(0,function(err, data) {
        if(curProgress == undefined) {
          displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
        }
        if(err) {
          displayError("There was an restarting the track.\nPlease check the playback device.");
        } else {
          //Set active styling
          let parent = document.getElementById('previous').parentNode;
          parent.classList.add('active', 'fade');
          //Remove active styling after 1 second
          setTimeout(function() {parent.classList.remove('active', 'fade');}, 1000);
        }
      });
    } else {
      spotifyApi.skipToPrevious(function(err, data) {
        if(data == undefined) {
          displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
        }
        if(err) {
          displayError("There was an issue playing the previous track.\nPlease check the playback device.");
        } else {
          //Set active styling
          let parent = document.getElementById('previous').parentNode;
          parent.classList.add('active', 'fade');
          //Remove active styling after 1 second
          setTimeout(function() {parent.classList.remove('active', 'fade');}, 1000);
        }
      });
    }
  })
  .catch(function(err) {
    displayError("There was an issue getting to Spotify.\nPlease reload and try again.");
  });
}

function toggleRepeat() {
  var states = ["off", "context", "track"];
  spotifyApi.getMyCurrentPlaybackState()
  .then(function(data) {
    return data.repeat_state;
  })
  .then(function(curState) {
    if(curState == undefined) {
      displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
    }
    var index = states.indexOf(curState) + 1;
    if(index >= states.length) {
      index = 0;
    }
    var newState = states[index];
    spotifyApi.setRepeat(newState, function(err, data) {
      if(newState == undefined) {
        displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
      }
      if(err) {
        displayError("There was an issue setting repeat.\nPlease check the playback device.");
      } else {
        if(newState == "context") {
          //Set active icon
          let repeat = document.getElementById('repeat')
          repeat.className = "typcn typcn-arrow-repeat";
          let parent = repeat.parentNode;
          parent.classList.add('active');
        } else if(newState == "track") {
          //Set active alt icon
          let repeat = document.getElementById('repeat')
          repeat.className = "typcn typcn-arrow-loop";
          let parent = repeat.parentNode;
          parent.classList.add('active');
        } else {
          //Set inactive icon
          let repeat = document.getElementById('repeat')
          repeat.className = "typcn typcn-arrow-repeat";
          let parent = repeat.parentNode;
          parent.className = "icon fade";
          //Remove fade after 1 second
          setTimeout(function() {parent.classList.remove('fade');}, 1000);
        }
      }
    });
  })
  .catch(function(err) {
    displayError("There was an issue getting to Spotify.\nPlease reload and try again.");
  });
}

function toggleShuffle() {
  spotifyApi.getMyCurrentPlaybackState()
  .then(function(data) {
    return data.shuffle_state;
  })
  .then(function(shuffling) {
    if(shuffling == undefined) {
      displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
    }
    if(shuffling) {
      spotifyApi.setShuffle(false, function(err, data) {
        if(data == undefined) {
          displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
        }
        if(err) {
          displayError("There was an issue setting shuffle.\nPlease check the playback device.");
        } else {
          //Set inactive style
          let parent = document.getElementById('shuffle').parentNode;
          parent.className = "icon fade";
          //Remove fade after 1 second
          setTimeout(function() {parent.classList.remove('fade');}, 1000);
        }
      });
    } else {
      spotifyApi.setShuffle(true, function(err, data) {
        if(data == undefined) {
          displayError("Playback device has been inactive for too long.\nPlease refresh the playback device.");
        }
        if(err) {
          displayError("There was an issue setting shuffle.\nPlease check the playback device");
        } else {
          //Set active style
          let parent = document.getElementById('shuffle').parentNode;
          parent.classList.add('active');
        }
      });
    }
  });
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
      //Turn up volume of Spotify playback device
      volumeUp();
      break;
    case "Down":
      //Turn down volume of Spotify playback device
      volumeDown();
      break;
    case "Left":
      //Play previous track
      playPrev();
      break;
    case "Right":
      //Play next track
      playNext();
      break;
    case "Clockwise":
      //Toggle shuffle of tracklist
      toggleShuffle();
      break;
    case "Anti-clockwise":
      //Toggle level of repeating tracklist
      toggleRepeat();
      break;
    case "Forward":
      //Play or pause track
      togglePlayback();
      break;
    case "Backward":
      //Play or pause track
      togglePlayback();
      break;
    case "Wave":
      //Navigate back to homepage for module selection
      document.location.href = "homepage.html";
      break;
  }
});
