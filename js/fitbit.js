var {PythonShell} = require('python-shell');
const { BrowserWindow, BrowserView } = require('electron').remote;
var win = BrowserWindow.getAllWindows()[0];
const storage = require('electron-json-storage-sync');
var Chart = require('chart.js');
const querystring = require('querystring');
//Lightweight Node Fitbit API wrapper
var Fitbit = require('fitbit-node');

//Global Fitbit API variables
var fitbitApi, accessToken, refreshToken, endTime, displayPointer;

//Initialises authorisation and Fitbit API
function init() {
  try {
    //Initialises persistent storage on first run
    if(storage.keys().status == false) {
      let result = storage.set('test', 0);
      if(result.error) {
        throw result.error;
      } else {
        storage.remove('temp');
      }
    }

    //Fitbit API client variables
    let clientId = config.fitbit_client_id,
    clientSecret = config.fitbit_client_secret;
    //Initialise Fitbit API
    fitbitApi = new Fitbit({clientId: clientId, clientSecret: clientSecret, apiVersion: "1.2"});
    //Get endTime from persistent storage
    if(storage.keys().data.includes("fitbitEnd")) {
      let result = storage.get('fitbitEnd');
      if(result.status) {
        endTime = result.data;
      } else {
        throw result.error;
      }
    }
    //Get accessToken from persistent storage
    if(storage.keys().data.includes("fitbitAccess")) {
      let result = storage.get('fitbitAccess');
      if(result.status) {
        accessToken = result.data;
      } else {
        throw result.error;
      }
    }
    //Get refreshToken from persistent storage
    if(storage.keys().data.includes("fitbitRefresh")) {
      let result = storage.get('fitbitRefresh');
      if(result.status) {
        refreshToken = result.data;
      } else {
        throw result.error;
      }
    } else {
      //If not in storage, perform initial authorisation flow
      initialAuth();
    }
    //Refresh access token if no longer valid
    checkExpiration();

    //Set default font for charts
    Chart.defaults.global.defaultFontFamily = 'ONEDAY';
    //Initialise UI
    initView();
    //Set display pointer to start
    displayPointer = 0;
    //View first display within UI
    displayView();
    //Display loading icon for 4 seconds to give time for gesture sensor to initialise and Fitbit API to respond
    setTimeout(function() { document.getElementById('loading').classList.add("hidden"); }, 4000);
  } catch(err) {
    displayError("An error occurred initialising the widget. Please reload and try again.");
  }
}

function initialAuth() {
  //API settings
  let scope = "activity heartrate nutrition sleep weight",
  redirectUrl = "fitbit://callback",
  prompt = "none",
  state = "fitbit";
  //No query string in URL
  if(!document.location.href.includes("?")) {
    var authURL = fitbitApi.getAuthorizeUrl(scope, redirectUrl, prompt, state);
    //Create browser view to fix compatability issues
    var view = new BrowserView();
    //Set as child view of browser window
    win.setBrowserView(view);
    view.setBounds(win.getBounds());
    //Load authorisation url to view
    view.webContents.loadURL(authURL);
  } else { //Query string in URL after OAuth redirect
    //Remove browser view after redirect
    if(BrowserView.getAllViews().length > 0) {
      let view = BrowserView.getAllViews()[0];
      view.setBounds({x: 0, y:0, width: 0, height: 0});
      view.destroy();
    }

    //Get query string from URL and parse it
    let qryStr = document.location.href.split("?")[1];
    qryStr = querystring.parse(qryStr);
    //Get authorisation code from query string
    let code = qryStr.code;

    //Get OAuth2 tokens from API using authorisation code
    fitbitApi.getAccessToken(code, redirectUrl)
    .then((res) => {
      //Set access token into persistent storage
      accessToken = res.access_token;
      let accessRes = storage.set('fitbitAccess', accessToken);
      if(accessRes.error) {
        throw accessRes.error;
      }
      //Set refresh token into persistent storage
      refreshToken = res.refresh_token;
      let refreshRes = storage.set('fitbitRefresh', refreshToken);
      if(refreshRes.error) {
        throw refreshRes.error;
      }
      //Set end time (ms) into persistent stoage
      endTime = Date.now() + (res.expires_in * 1000);
      let timeRes = storage.set('fitbitEnd', endTime);
      if(timeRes.error) {
        throw timeRes.error;
      }
    })
    .catch((err) => {
      //Display error within UI
      displayError("An issue occured in authenticating the API. Please reload and try again.")
    });
  }
}

function checkExpiration() {
  //Access tokens expire after 28800 seconds/8 hours
  if(endTime < Date.now()) { //Token invalid
    //Get refreshed token for API
    fitbitApi.refreshAccessToken(accessToken, refreshToken)
    .then((res) => {
      //Set refreshed access token into persistent storage
      accessToken = res.access_token;
      let accessRes = storage.set('fitbitAccess', accessToken);
      if(accessRes.error) {
        throw accessRes.error;
      }
      refreshToken = res.refresh_token;
      let refreshRes = storage.set('fitbitRefresh', refreshToken);
      if(refreshRes.error) {
        throw refreshRes.error;
      }
      //Set new end time into persistent storage
      endTime = Date.now() + (res.expires_in * 1000);
      let timeRes = storage.set('fitbitEnd', endTime);
      if(timeRes.error) {
        throw timeRes.error;
      }
    })
    .catch((err) => {
      //Display error within UI
      displayError("An issue occured in reauthenticating the API. Please reload and try again.")
    });
  }
}

function initView() {
  //Create formatted date string for API requests
  let d = new Date();
  var formattedDate = formatDate(d);
  //Initialise activity information
  initActivity(formattedDate);
  //Initialise weight information
  initWeight(formattedDate);
  //Initialise sleep information
  initSleep(formattedDate);
  //Initialise nutrition information
  initNutrition(formattedDate);
  //Update every hour
  var t = setTimeout(initView, 3600*1000);
}

function formatDate(date) {
  var yyyy = date.getFullYear();
  var mm = date.getMonth() + 1;
  if(mm < 10) {
    mm = "0" + mm;
  }
  var dd = date.getDate();
  if(dd < 10) {
    dd = "0" + dd;
  }

  return yyyy + "-" + mm + "-" + dd;
}

//Initialise UI regarding activity information
function initActivity(formattedDate) {
  //Refresh access token if no longer valid
  checkExpiration();
  //API call to activities endpoint
  var activityRes = fitbitApi.get("/activities/date/" + formattedDate + ".json", accessToken);
  //API call to heartrate endpoint
  var heartRateRes = fitbitApi.get("/activities/heart/date/" + formattedDate + "/1d.json", accessToken);
  Promise.all([activityRes, heartRateRes]).then((data) => {
    try {
      //Check status of activity endpoint API call
      var activityStatus = data[0][1].statusCode;
      if(activityStatus != 200) {
        throw "Error " + activityStatus + " when attempting to perform API request. \nRefresh the widget and try again.";
      }
      //Check status of heart rate endpoint API call
      var heartRateStatus = data[1][1].statusCode;
      if(heartRateStatus != 200) {
        throw "Error " + heartRateStatus + " when attempting to perform API request. \nRefresh the widget and try again.";
      }
      //General activity information
      var activity = data[0][0];
      var steps = activity.summary.steps;
      var floors = activity.summary.floors;
      var calories = activity.summary.calories.total;
      //Goal activity information
      var goalSteps = activity.goals.steps;
      var goalFloors = activity.goals.floors;
      var goalCalories = activity.goals.calories;
      //Init steps chart
      var stepsDataset = createChartData([steps,(goalSteps-steps)]);
      var stepsTitle = steps + " Steps";
      var stepsChart = createChart("steps", "doughnut", stepsDataset, stepsTitle);
      //Init calories chart
      var caloriesDataset = createChartData([calories,(goalCalories-calories)]);
      var caloriesTitle = calories + " Calories";
      var caloriesChart = createChart("calories", "doughnut", caloriesDataset, caloriesTitle);
      //Init floors chart
      var floorsDataset = createChartData([floors,(goalFloors-floors)]);
      var floorsTitle = floors + " Floors";
      var floorsChart = createChart("floors", "doughnut", floorsDataset, floorsTitle);
      //Resting heartrate information
      var heartRate = data[1][0]["activities-heart"][0].value.restingHeartRate;
      if(heartRate != undefined) {
        //Init heartrate display
        document.getElementById('heart-rate').innerHTML = heartRate + " bpm";
      } else {
        //No heartrate information available
        document.getElementById('heart-rate').innerHTML = "No heart rate data"
      }
    } catch(err) {
      //Display error within UI
      displayError(err);
    }
  });
}

//Initialise UI regarding weight information
function initWeight(formattedDate) {
  //Refresh access token if no longer valid
  checkExpiration();
  //API call to weight endpoint
  var weightRes = fitbitApi.get("/body/log/weight/date/" + formattedDate + ".json", accessToken);
  //API call to goal weight endpoint
  var goalWeightRes = fitbitApi.get("/body/log/weight/goal.json", accessToken);
  //API call to goal fat endpoint
  var goalFatRes = fitbitApi.get("/body/log/fat/goal.json", accessToken);
  Promise.all([weightRes, goalWeightRes, goalFatRes]).then((data) => {
    try {
      //Check status of weight endpoint API call
      var weightStatus = data[0][1].statusCode;
      if(weightStatus != 200) {
        throw "Error " + weightStatus + " when attempting to perform API request. \nRefresh the widget and try again.";
      }
      //Check status of goal weight endpoint API call
      var goalWeightStatus = data[1][1].statusCode;
      if(goalWeightStatus != 200) {
        throw "Error " + goalWeightStatus + " when attempting to perform API request. \nRefresh the widget and try again.";
      }
      //Check status of goal fat endpoint API call
      var goalFatStatus = data[2][1].statusCode;
      if(goalFatStatus != 200) {
        throw "Error " + goalFatStatus + " when attempting to perform API request. \nRefresh the widget and try again.";
      }
      //General weight information
      var weightInfo = data[0][0].weight;
      //Check if weight log exists for date
      if(weightInfo.length < 1) {
        //Display message when no weight record for today
        document.getElementById('physical').innerHTML = "No weight record available.<br/>Step on the scales!";
      } else {
        //General weight information
        var bmi = Math.round(weightInfo[0].bmi * 10) / 10;
        var bodyFat = weightInfo[0].fat;
        var weight = Math.round(weightInfo[0].weight * 10) / 10;
        //Goal weight information
        var startWeight = Math.round(data[1][0].goal.startWeight * 10) / 10;
        var goalWeight = Math.round(data[1][0].goal.weight * 10) / 10;
        var goalBodyFat = data[2][0].goal.fat;
        //Init weight chart
        var weightDif = Math.round(Math.abs(startWeight - weight) * 10) / 10;
        var weightDataset = createChartData([weightDif, Math.round((weight-goalWeight)*10)/10]);
        var weightTitle = weight + "kg";
        var weightChart = createChart("weight", "doughnut", weightDataset, weightTitle);
        //Init body fat chart
        var bodyFatDif = Math.abs(bodyFat - goalBodyFat);
        var bodyFatDataset = createChartData([(goalBodyFat-bodyFatDif),bodyFatDif]);
        var bodyFatTitle = bodyFat + "% Body Fat";
        var bodyFatChart = createChart("body-fat", "doughnut", bodyFatDataset, bodyFatTitle);
        //Display bmi within UI
        document.getElementById('bmi').innerHTML = bmi + " BMI";
        //Display weight lost within UI
        if(startWeight < weight) {
          document.getElementById('weight-lost').innerHTML = weightDif + "kg Gained";
        } else {
          document.getElementById('weight-lost').innerHTML = weightDif + "kg Lost";
        }
        //Display weight remaining to be lost within UI
        document.getElementById('weight-remain').innerHTML = Math.round((weight-goalWeight)*10)/10 + "kg Left to Lose";
        //Display bodyfat remaining to be lost within UI
        document.getElementById('body-fat-remain').innerHTML = bodyFatDif + "% Left to Lose";
      }
    } catch(err) {
      //Display error within UI
      displayError(err);
    }
  });
}

//Initialise UI regarding sleep information
function initSleep(formattedDate) {
  //Refresh access token if no longer valid
  checkExpiration();
  //API call to sleep endpoint
  var sleepRes = fitbitApi.get("/sleep/date/" + formattedDate + ".json", accessToken);
  //API call to goal sleep endpoint
  var goalSleepRes = fitbitApi.get("/sleep/goal.json", accessToken);
  Promise.all([sleepRes, goalSleepRes]).then((data) => {
    try {
      //Check status of sleep endpoint API call
      var sleepStatus = data[0][1].statusCode;
      if(sleepStatus != 200) {
        throw "Error " + sleepStatus + " when attempting to perform API request. \nRefresh the widget and try again.";
      }
      //Check status of goal sleep endpoint API call
      var goalSleepStatus = data[1][1].statusCode;
      if(goalSleepStatus != 200) {
        throw "Error " + goalSleepStatus + " when attempting to perform API request. \nRefresh the widget and try again.";
      }
      //Check if sleep record exists for date
      var sleepInfo = data[0][0].summary;
      if(sleepInfo.totalSleepRecords < 1) {
        //Display message when no sleep record available for today
        document.getElementById('sleep').innerHTML = "No sleep record available.<br/>Make sure to wear your Fitbit device while sleeping!";
      } else {
        //General sleep information
        var minsAsleep = sleepInfo.totalMinutesAsleep;
        var minsAwake = sleepInfo.stages.wake;
        //Sleep stage information
        var deepMins = sleepInfo.stages.deep;
        var lightMins = sleepInfo.stages.light;
        var remMins = sleepInfo.stages.rem;
        //Goal sleep information
        var goalSleepInfo = data[1][0].goal;
        var goalWakeup = goalSleepInfo.wakeupTime;
        var goalBedtime = goalSleepInfo.bedtime;
        var goalDuration = goalSleepInfo.minDuration;
        //Init sleep stage chart
        var awakeLabel = "Awake " + minsAwake + "mins";
        var remLabel = "REM " + remMins + "mins";
        var lightLabel = "Light " + lightMins + "mins";
        var deepLabel = "Deep " + deepMins + "mins";
        //Create dataset in alternate format
        var stagesDataset = {
          labels: [awakeLabel, remLabel, lightLabel, deepLabel],
          datasets: [{
            data: [minsAwake, remMins, lightMins, deepMins],
            backgroundColor: [
              "rgba(255, 99, 132, 0.2)",
              "rgba(36, 144, 221, 0.2)",
              "rgba(255, 215, 51, 0.2)",
              "rgba(161, 99, 255, 0.2)"
            ],
            borderColor: [
              "rgba(255, 99, 132, 1)",
              "rgba(36, 144, 221, 1)",
              "rgba(255, 215, 51, 1)",
              "rgba(161, 99, 255, 1)"
            ],
            borderWidth: 1
          }]
        };
        var stagesTitle = formatTime(minsAsleep);
        var stagesChart = createChart("stages", "doughnut", stagesDataset, stagesTitle);
        //Set chart to display as semi-dougnut
        stagesChart.options.circumference = 1 * Math.PI;
        stagesChart.options.rotation = -1 * Math.PI;
        //Set legend/text options
        stagesChart.options.legend.position = "left";
        stagesChart.options.legend.labels.fontColor = "#FFF";
        stagesChart.options.legend.labels.fontSize = 16;
        stagesChart.options.title.fontSize = 24;
        //Update chart to display new options
        stagesChart.update();
        //Init goal sleep chart
        var sleepDif = Math.abs(minsAsleep - goalDuration);
        var goalSleepDataset = createChartData([minsAsleep,sleepDif])
        var goalSleepTitle = "Goal: " + goalBedtime + " - " + goalWakeup;
        var goalSleepChart = createChart("goal-sleep", "doughnut", goalSleepDataset, goalSleepTitle);
      }
    } catch(err) {
      //Display error within UI
      displayError(err);
    }
  });
}

//Format a number of minutes to display as hours and minutes
function formatTime(m) {
  //Divide total minutes by 60 to get hours
  let hours = Math.floor(m / 60);
  //Get remainder of division (modulo) to get number of minutes
  let minutes = m % 60;
  //Return formatted string
  return hours + " hrs " + minutes + " mins";
}

function initNutrition(formattedDate) {
  //Refresh access token if no longer valid
  checkExpiration();
  //API call to foods endpoint
  fitbitApi.get("/foods/log/date/" + formattedDate + ".json", accessToken)
  .then((data) => {
    //Check status of foods endpoint API call
    if(data[1].statusCode == 200) {
      return data[0].summary;
    } else {
      throw "Error " + data[1].statusCode + " when attempting to perform API request. Refresh the widget and try again.";
    }
  })
  .then((nutrition) => {
    //General food information
    var calories = nutrition.calories;
    var water = nutrition.water;
    //Macronutrient information
    var carbs = nutrition.carbs;
    var fat = nutrition.fat;
    var protein = nutrition.protein;
    //Init macronutrient chart
    var carbsLabel = "Carbs " + carbs + "g";
    var fatLabel = "Fat " + fat + "g";
    var proteinLabel = "Protein " + protein + "g";
    //Create dataset in alternate format
    var macrosDataset = {
      labels: [carbsLabel, fatLabel, proteinLabel],
      datasets: [{
        data: [carbs, fat, protein],
        backgroundColor: [
          "rgba(161, 99, 255, 0.2)",
          "rgba(255, 99, 132, 0.2)",
          "rgba(36, 144, 221, 0.2)"
        ],
        borderColor: [
          "rgba(161, 99, 255, 1)",
          "rgba(255, 99, 132, 1)",
          "rgba(36, 144, 221, 1)"
        ],
        borderWidth: 1
      }]
    };
    var macrosTitle = calories + " Calories Consumed";
    var macrosChart = createChart("macros", "doughnut", macrosDataset, macrosTitle);
    //Set legend/text options
    macrosChart.options.legend.position = "left";
    macrosChart.options.legend.labels.fontColor = "#FFF";
    macrosChart.options.legend.labels.fontSize = 16;
    macrosChart.options.title.fontSize = 24;
    //Update chart to display new options
    macrosChart.update();
    //Init water chart
    var waterDataset = createChartData([water, 2000]);
    var waterTitle = water + "mL";
    var waterChart = createChart("water", "doughnut", waterDataset, waterTitle);
  })
  .catch((err) => {
    //Display error within UI
    displayError(err);
  })
}

//Create dataset to be used within charts.js chart with supplied data values
function createChartData(values) {
  //Create data object
  var data = {
    datasets: [{
      data: values,
      //Set style information for data
      backgroundColor: [
        "rgba(255, 99, 132, 0.2)",
        "rgba(0, 0, 0, 0)"
      ],
      borderColor: [
        "rgba(255, 99, 132, 1)",
        "rgba(255, 255, 255, 0.2)"
      ],
      borderWidth: 1
    }]
  };
  //Return data object
  return data;
}

//Create chart using charts.js with supplied data values
function createChart(id, type, data, title) {
  //Get canvas element by DOM id
  var ctx = document.getElementById(id);
  //Create chart object with parameterised settings and display within UI
  var chart = new Chart(ctx, {
    type: type,
    data: data,
    options: {
      responsive: false,
      cutoutPercentage: 80,
      title: {
        display: true,
        position: "bottom",
        fontSize: 24,
        fontColor: "rgba(255, 99, 132, 1)",
        text: title
      }
    }
  });
  //Return chart object
  return chart;
}

//Display specific view within UI
function displayView() {
  //Check pointer is within bounds
  checkPointer();
  //Hide all views
  document.getElementById('activity').style.display = "none";
  document.getElementById('physical').style.display = "none";
  document.getElementById('sleep').style.display = "none";
  document.getElementById('nutrition').style.display = "none";
  //Display current view based on display pointer
  switch(displayPointer) {
    case 0:
      document.getElementById('activity').style.display = "flex";
      break;
    case 1:
      document.getElementById('physical').style.display = "flex";
      break;
    case 2:
      document.getElementById('sleep').style.display = "flex";
      break;
    case 3:
      document.getElementById('nutrition').style.display = "flex";
      break;
  }
}

//Verify display pointer is within bounds
function checkPointer() {
  //If lower than lower bound
  if(displayPointer < 0) {
    //Set to upper bound
    displayPointer = 3;
  }
  //If higher than upper bound
  if(displayPointer > 3) {
    //Set to lower bound
    displayPointer = 0;
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
    case "Left":
      //Navigate to previous view
      displayPointer--;
      displayView();
      break;
    case "Right":
      //Navigate to next view
      displayPointer++;
      displayView();
      break;
    case "Wave":
      //Navigate back to homepage for module selection
      document.location.href = "homepage.html";
      break;
  }
});
