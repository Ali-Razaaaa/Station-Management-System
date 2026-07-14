const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  printReceipt: function (htmlContent) {
    return ipcRenderer.invoke("print-receipt", htmlContent);
  },
});