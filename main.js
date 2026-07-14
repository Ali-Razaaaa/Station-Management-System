const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let autoUpdater = null;
try {
    const { autoUpdater: updater } = require("electron-updater");
    autoUpdater = updater;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
} catch(e) {
    console.log("Auto-updater not available:", e.message);
}

app.commandLine.appendSwitch('enable-print-preview');
let win;

function createWindow() {
    const preloadPath = path.join(__dirname, "preload.js");
    console.log("Preload path:", preloadPath);
    console.log("Preload exists:", fs.existsSync(preloadPath));
    
    win = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: path.join(__dirname, "icon.ico"),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            plugins: true,
            webSecurity: false,
            preload: preloadPath
        }
    });
    
    win.loadFile("index.html");
    
    win.webContents.on('will-navigate', (event, url) => {
        event.preventDefault();
    });
    
    win.webContents.openDevTools();
}

// ==================== PRINT HANDLER ====================
ipcMain.handle("print-receipt", async (event, htmlContent) => {
    console.log("PRINT RECEIVED! Length:", htmlContent.length);
    
    return new Promise((resolve) => {
        const printWin = new BrowserWindow({
            width: 320,
            height: 700,
            show: true,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        printWin.loadURL("data:text/html;charset=UTF-8," + encodeURIComponent(htmlContent));

        printWin.webContents.on("did-finish-load", () => {
            printWin.webContents.print(
                { silent: false, printBackground: true, margins: { marginType: "none" } },
                (success, errorType) => {
                    console.log("Print done. Success:", success);
                    setTimeout(() => printWin.close(), 1000);
                    resolve(success);
                }
            );
        });
        
        printWin.webContents.on("did-fail-load", () => {
            printWin.close();
            resolve(false);
        });
    });
});

app.on('browser-window-created', (event, win) => {
    win.webContents.on('will-preferences', (event, preferences) => {
        preferences.printBackground = true;
    });
});

app.whenReady().then(() => {
    createWindow();
    if (autoUpdater) {
        try { 
            console.log("Checking for updates...");
            autoUpdater.checkForUpdates(); 
        } catch(e) {
            console.log("Update check failed:", e.message);
        }
    }
});

// ==================== AUTO UPDATE EVENTS (COMPLETE) ====================
if (autoUpdater) {
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
        console.log("No updates found. App is up to date.");
    });

    autoUpdater.on("download-progress", (progress) => {
        console.log(`Downloading: ${progress.percent.toFixed(1)}%`);
    });

    autoUpdater.on("update-downloaded", () => {
        console.log("Update downloaded!");
        dialog.showMessageBox(win, {
            type: "info",
            title: "Update Ready",
            message: "Update downloaded.\nRestart now?",
            buttons: ["Restart"]
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
            }
        });
    });

    autoUpdater.on("error", (err) => {
        console.error("Update error:", err.message);
    });
}

app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') app.quit(); 
});

app.on('activate', () => { 
    if (BrowserWindow.getAllWindows().length === 0) createWindow(); 
});