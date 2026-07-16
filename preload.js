const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  printReceipt: function (htmlContent, options) {
    return ipcRenderer.invoke("print-receipt", htmlContent, options);
  },
  getPrinters: function () {
    return ipcRenderer.invoke("get-printers");
  },
});