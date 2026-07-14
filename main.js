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

ipcMain.handle("get-printers", async () => {
  try {
    const printers = await win.webContents.getPrintersAsync();
    return printers || [];
  } catch (e) {
    return [];
  }
});

ipcMain.handle("print-receipt", async (event, htmlContent) => {
  let printers = [];
  try {
    printers = await win.webContents.getPrintersAsync();
  } catch (e) {
    printers = [];
  }

  if (!printers || printers.length === 0) {
    return { success: false, reason: "no-printer" };
  }

  return new Promise((resolve) => {
    let settled = false;
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        sandbox: false,
        nodeIntegration: false,
      },
    });

    const finish = (result) => {
      if (settled) return;
      settled = true;
      setTimeout(() => {
        if (!printWin.isDestroyed()) printWin.close();
      }, 3000);
      resolve(result);
    };

    // Safety timeout in case print dialog / callback never fires
    const safetyTimer = setTimeout(() => {
      finish({ success: false, reason: "timeout" });
    }, 30000);

    printWin.webContents.on("did-finish-load", () => {
      printWin.webContents.print(
        {
          silent: false,
          printBackground: true,
          margins: { marginType: "none" },
        },
        (success, failureReason) => {
          clearTimeout(safetyTimer);
          finish({
            success: success,
            reason: success ? null : failureReason || "print-failed",
          });
        },
      );
    });

    printWin.webContents.on("did-fail-load", (e, code, desc) => {
      clearTimeout(safetyTimer);
      finish({ success: false, reason: "load-failed: " + desc });
    });

    printWin.loadURL(
      "data:text/html;charset=UTF-8," + encodeURIComponent(htmlContent),
    );
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