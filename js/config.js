//Read config.json synchronously - config variables required before continuing
var app = require('electron').remote.app;
var fs = require('fs');
let path = app.getPath("userData") + "/config.json";
let data = fs.readFileSync(path);
//Global variable of settings
var config;
try {
  //Try parsing config.json as JSON
  config = JSON.parse(data);
} catch(err) {
  //Get browser window
  var { BrowserWindow } = require('electron').remote;
  var win = BrowserWindow.getAllWindows()[0];
  //Create child browser window to display error
  let errWin = new BrowserWindow({ width: 200, height: 100, frame: false, transparent: true, parent: win });
  errWin.loadURL(`file://${__dirname}/error.html`);
  errWin.on('closed', () => {
    errWin = null;
  });
  //Return to homepage with error query string
  document.location.href = "homepage.html?error=true";
}
