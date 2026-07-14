const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");

let autoUpdater = null;
try {
  const { autoUpdater: updater } = require("electron-updater");
  autoUpdater = updater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
} catch (e) {}

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, "icon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  win.loadFile("index.html");
}

ipcMain.handle("print-receipt", async (event, htmlContent) => {
  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        sandbox: false,
        nodeIntegration: false,
      },
    });
    printWin.webContents.on("did-finish-load", () => {
      printWin.webContents.print(
        { silent: false, printBackground: true, margins: { marginType: "none" } },
        (success) => {
          setTimeout(() => {
            if (!printWin.isDestroyed()) printWin.close();
          }, 3000);
          resolve(success);
        },
      );
    });
    printWin.webContents.on("did-fail-load", () => {
      if (!printWin.isDestroyed()) printWin.close();
      resolve(false);
    });
    printWin.loadURL("data:text/html;charset=UTF-8," + encodeURIComponent(htmlContent));
  });
});

app.whenReady().then(() => {
  createWindow();
  if (autoUpdater) {
    try {
      autoUpdater.checkForUpdates();
    } catch (e) {}
  }
});

if (autoUpdater) {
  autoUpdater.on("update-available", (info) => {
    dialog.showMessageBox(win, {
      type: "info",
      title: "Update",
      message: `v${info.version} available.\nDownloading...`,
    });
  });
  autoUpdater.on("update-downloaded", () => {
    dialog
      .showMessageBox(win, {
        type: "info",
        title: "Ready",
        message: "Restart?",
        buttons: ["Restart"],
      })
      .then((r) => {
        if (r.response === 0) autoUpdater.quitAndInstall();
      });
  });
  autoUpdater.on("error", () => {});
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});