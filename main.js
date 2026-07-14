const { app, BrowserWindow, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

// ========== ENABLE PRINT PREVIEW SUPPORT ==========
app.commandLine.appendSwitch('enable-print-preview');
app.commandLine.appendSwitch('enable-features', 'PrintPreview');

let win;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
    win = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: path.join(__dirname, "icon.ico"),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            plugins: true,
            webSecurity: false  // Allow cross-origin printing
        }
    });

    win.loadFile("index.html");

    // Handle navigation
    win.webContents.on('will-navigate', (event, url) => {
        event.preventDefault();
    });
    
    // ✅ ENABLE PRINT FOR THIS WINDOW
    win.webContents.on('will-frame-navigate', (event, url) => {
        event.preventDefault();
    });
}

// ========== ENABLE PRINT FOR ALL WINDOWS ==========
app.on('browser-window-created', (event, win) => {
    win.webContents.on('will-preferences', (event, preferences) => {
        preferences.printBackground = true;
    });
    
    // Allow window.print() to work
    win.webContents.session.setPermissionRequestHandler(
        (webContents, permission, callback) => {
            const allowedPermissions = ['media', 'notifications', 'midiSysex'];
            if (allowedPermissions.includes(permission)) {
                callback(true);
            } else {
                callback(false);
            }
        }
    );
});

app.whenReady().then(() => {
    createWindow();
    console.log("Checking for updates...");
    autoUpdater.checkForUpdates();
});

// ========== AUTO UPDATE EVENTS ==========
autoUpdater.on("checking-for-update", () => {
    console.log("Checking for update...");
});

autoUpdater.on("update-available", (info) => {
    console.log("Update Available:", info.version);
    dialog.showMessageBox(win, {
        type: "info",
        title: "Update Available",
        message: `Version ${info.version} is available.\nDownloading...`
    });
});

autoUpdater.on("update-not-available", () => {
    console.log("No updates found.");
});

autoUpdater.on("download-progress", (progress) => {
    console.log(`Downloading ${progress.percent.toFixed(1)}%`);
});

autoUpdater.on("update-downloaded", () => {
    dialog.showMessageBox(win, {
        type: "info",
        title: "Update Ready",
        message: "Update downloaded.\nRestart now?",
        buttons: ["Restart"]
    }).then(() => {
        autoUpdater.quitAndInstall();
    });
});

autoUpdater.on("error", (err) => {
    console.error("Auto-updater error:", err);
});

// ========== APP EVENTS ==========
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});