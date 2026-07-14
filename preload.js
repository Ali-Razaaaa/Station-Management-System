const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  printReceipt: function (htmlContent) {
    return ipcRenderer.invoke("print-receipt", htmlContent);
  },
  getPrinters: function () {
    return ipcRenderer.invoke("get-printers");
  },
});