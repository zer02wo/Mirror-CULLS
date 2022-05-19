const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const url = require('url');

function createWindow() {
  //Create browser window to fit display
  var win = new BrowserWindow({
    width: 800,
    height: 480,
    fullscreen: true,
    frame: false,
    backgroundColor: "#000",
    icon: path.join(__dirname, 'img/logo.png'),
    webPreferences: {
      nodeIntegration: true
    }});
  
  //Load homepage on on program start
  win.loadURL(`file://${__dirname}/homepage.html?boot=true`);

  //Execute javascript within window
  win.webContents.executeJavaScript(`
    //Load node http module
    var http = require('http');
    //Create localhost http server on port 8080
    var server = http.createServer(function (req, res) {
      //Redirected from google calendar
      if(req.url.includes("calendar")) {
        //Get query string from request url
        let qryStr = req.url.split("?")[1];
        //Load specific url with query string
        win.loadURL("file://" + __dirname + "/calendar.html?" + qryStr);
      } else {
        //Redirect back to homepage
        win.loadURL("file://" + __dirname + "/calendar.html?error=true");
      }
    })
    .listen(8080)`
  )
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.error(err);
  });

  //Create custom protocol based on Spotify redirect URI
  protocol.registerHttpProtocol('spotify', function(req, cb) {
    //Get query string from request url
    let qryStr = req.url.split("?")[1];
    //Load specific url with query string
    cb(
      win.loadURL(`file://${__dirname}/spotify.html?${qryStr}`)
      )
    }, function(err) {
      if(err) console.error("Protocol failed to be registered.");
  });
  //Create custom protocol based on Fitbit redirect URI
  protocol.registerHttpProtocol('fitbit', function(req, cb) {
    //Get query string from request url
    let qryStr = req.url.split("?")[1];
    //Load specific url with query string
    cb(
      win.loadURL(`file://${__dirname}/fitbit.html?${qryStr}`)
      )
    }, function(err) {
      if(err) console.error("Protocol failed to be registered.");
  });

  //Close server and remove reference to window when closing
  win.on('closed', () => {
    win = null;
  });
}

//Check whether config file exists
var fs = require('fs');
let filePath = app.getPath("userData") + "/config.json";
if(!fs.existsSync(filePath)) {
  //Create content for default config file
  let content = `{
    "origin_lat":52.4847418,
    "origin_lng":-1.8934762,
    "dest_lat":52.4783909,
    "dest_lng":-1.9127066,
    "travel_mode":"TRANSIT",
    "search_term":"Tesla",
    "poke_gen":1
  }`;
  //Write config file to path
  fs.writeFileSync(filePath, content, 'utf8', function(err) {
    if(err) {
      //Exit with status 1 if failing to write file
      app.exit(1);
    }
  })
}

//Create browser window when application is ready
app.on('ready', createWindow);

//Close the application when all windows are closed
app.on('window-all-closed', () => {
  app.quit();
});

//Create browser window when application is activated and no windows exist
app.on('activate', () => {
  if(BrowserWindow.getAllWindows().length === 0) createWindow();
});
