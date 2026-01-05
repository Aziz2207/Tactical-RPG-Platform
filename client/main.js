const { app, BrowserWindow } = require("electron");
const path = require("path");

let appWindow;

function initWindow() {
  appWindow = new BrowserWindow({
    height: 800,
    width: 1000,
    title: "Age of Mythology",
    icon: path.join(__dirname, "icon.png"), // Your PNG icon
    webPreferences: {
      nodeIntegration: true,
    },
  });

  // Electron Build Path
  const filePath = `file://${__dirname}/dist/client/index.html`;
  appWindow.loadURL(filePath);

  appWindow.maximize();

  appWindow.setMenuBarVisibility(false);

  // Initialize the DevTools.
  // appWindow.webContents.openDevTools()

  appWindow.on("closed", function () {
    appWindow = null;
  });
}

app.on("ready", initWindow);

// Close when all windows are closed.
app.on("window-all-closed", function () {
  // On macOS specific close process
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (appWindow === null) {
    initWindow();
  }
});
