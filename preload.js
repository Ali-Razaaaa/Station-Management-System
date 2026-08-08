const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  printReceipt: function (htmlContent, options) {
    return ipcRenderer.invoke("print-receipt", htmlContent, options);
  },
  getPrinters: function () {
    return ipcRenderer.invoke("get-printers");
  },

  // NEW (added only) — Google Drive backup folder support
  selectBackupFolder: function () {
    return ipcRenderer.invoke("select-backup-folder");
  },
  getBackupFolder: function () {
    return ipcRenderer.invoke("get-backup-folder");
  },
  saveBackupFile: function (jsonString, filename) {
    return ipcRenderer.invoke("save-backup-file", jsonString, filename);
  },
});