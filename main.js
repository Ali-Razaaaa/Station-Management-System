const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// ============================================================
// NEW (ADDED ONLY): Google Drive backup folder support.
// Lets the renderer (app.js) select a local folder (typically the
// user's Google Drive Desktop sync folder) once, and then silently
// write backup JSON files into it on a schedule with no further
// clicks needed. Google Drive Desktop itself takes care of
// uploading anything placed in that folder to the cloud.
//
// FIX (config-loss-on-update): this file used to live inside
// app.getPath("userData"). electron-builder's NSIS installer/uninstaller
// can wipe that ENTIRE folder on some update/uninstall flows (it does
// NOT touch localStorage/IndexedDB, which is where the real token /
// invoice / inventory data lives — that stays 100% intact — but it *can*
// remove this small config file, which only stores the Google Drive
// folder PATH, nothing else). Moving it to the Documents folder means it
// survives app updates. The one-time migration block below copies the
// OLD config into the NEW location automatically the first time this
// runs, so an existing user does not need to re-select their Google
// Drive folder after updating.
// ============================================================
const OLD_CONFIG_PATH = path.join(app.getPath("userData"), "backup-config.json");
const CONFIG_PATH = path.join(
  app.getPath("documents"),
  "ServiceStation_BackupConfig.json",
);

function migrateOldConfigIfNeeded() {
  try {
    if (!fs.existsSync(CONFIG_PATH) && fs.existsSync(OLD_CONFIG_PATH)) {
      fs.copyFileSync(OLD_CONFIG_PATH, CONFIG_PATH);
    }
  } catch (e) {}
}
migrateOldConfigIfNeeded();

function loadBackupConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (e) {
    return {};
  }
}
function saveBackupConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  } catch (e) {}
}

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

ipcMain.handle("print-receipt", async (event, htmlContent, options) => {
  options = options || {};
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

    const safetyTimer = setTimeout(() => {
      finish({ success: false, reason: "timeout" });
    }, 30000);

    printWin.webContents.on("did-finish-load", () => {
      const printOptions = {
        silent: false,
        printBackground: true,
      };
      if (options.pageSize) printOptions.pageSize = options.pageSize;
      if (options.margins) printOptions.margins = options.margins;

      printWin.webContents.print(printOptions, (success, failureReason) => {
        clearTimeout(safetyTimer);
        finish({
          success: success,
          reason: success ? null : failureReason || "print-failed",
        });
      });
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

// ============================================================
// NEW (ADDED ONLY): backup-folder selection + silent file writer.
// Existing get-printers / print-receipt handlers above are untouched.
// ============================================================
ipcMain.handle("select-backup-folder", async () => {
  const result = await dialog.showOpenDialog(win, {
    title: "Select your Google Drive folder for backups",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths.length) {
    return { success: false };
  }
  const folder = result.filePaths[0];
  const cfg = loadBackupConfig();
  cfg.backupFolder = folder;
  saveBackupConfig(cfg);
  return { success: true, folder: folder };
});

ipcMain.handle("get-backup-folder", async () => {
  const cfg = loadBackupConfig();
  return cfg.backupFolder || null;
});

// NOTE: "filename" passed in from app.js is now always the SAME fixed
// name ("servicepro_latest_backup.json"). Every 30-min cycle OVERWRITES
// this one file — it never creates a new file. Since each snapshot
// already contains the FULL localStorage data (every token, invoice,
// vehicle, etc. — not just what changed since last time), this single
// file is always a complete, up-to-date, one-file recovery point.
ipcMain.handle("save-backup-file", async (event, jsonString, filename) => {
  const cfg = loadBackupConfig();
  if (!cfg.backupFolder) {
    return { success: false, reason: "no-folder-selected" };
  }
  try {
    if (!fs.existsSync(cfg.backupFolder)) {
      return { success: false, reason: "folder-missing" };
    }
    const backupsDir = path.join(cfg.backupFolder, "ServicePro_Backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    // Write to a temp file first, then rename over the real file. This
    // avoids a half-written/corrupted backup if the app closes or the
    // machine loses power mid-write — the real file is only ever
    // replaced by a fully-written, valid file.
    const filePath = path.join(backupsDir, filename);
    const tmpPath = filePath + ".tmp";
    fs.writeFileSync(tmpPath, jsonString, "utf8");
    fs.renameSync(tmpPath, filePath);

    return { success: true, path: filePath };
  } catch (e) {
    return { success: false, reason: String(e) };
  }
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