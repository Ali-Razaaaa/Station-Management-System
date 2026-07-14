const { app, BrowserWindow, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, "icon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile("index.html");

  // Check for updates after app starts
  autoUpdater.checkForUpdatesAndNotify();
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ===== AUTO UPDATE EVENTS =====

// Update available
autoUpdater.on("update-available", () => {
  dialog.showMessageBox(win, {
    type: "info",
    title: "Update Available",
    message: "A new version is available.\nIt will be downloaded automatically."
  });
});

// Update downloaded
autoUpdater.on("update-downloaded", () => {
  dialog.showMessageBox(win, {
    type: "info",
    title: "Update Ready",
    message: "Update downloaded successfully.\nClick OK to restart and install.",
    buttons: ["OK"]
  }).then(() => {
    autoUpdater.quitAndInstall();
  });
});

// Error
autoUpdater.on("error", (err) => {
  console.log("Update Error:", err);
});