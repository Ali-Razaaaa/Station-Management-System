const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");

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
            preload: path.join(__dirname, "preload.js")   // 👈 add this
        }
    });
    win.loadFile("index.html");
    win.webContents.on('will-navigate', (event, url) => {
        event.preventDefault();
    });
}

// ==================== PRINT HANDLER (NEW) ====================
ipcMain.handle("print-receipt", async (event, htmlContent) => {
    return new Promise((resolve) => {
        const printWin = new BrowserWindow({
            width: 320,
            height: 700,
            show: false,               // stays hidden, no second window visible
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        printWin.loadURL(
            "data:text/html;charset=UTF-8," + encodeURIComponent(htmlContent)
        );

        printWin.webContents.on("did-finish-load", () => {
            printWin.webContents.print(
                {
                    silent: false,      
                    printBackground: true,
                    margins: { marginType: "none" }
                },
                (success, errorType) => {
                    if (!success) console.log("Print failed:", errorType);
                    printWin.close();
                    resolve(success);
                }
            );
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
        try { autoUpdater.checkForUpdates(); } catch(e) {}
    }
});