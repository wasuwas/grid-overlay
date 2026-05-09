const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("gridOverlayApi", {
  onConfig: (callback) => {
    ipcRenderer.on("overlay:config", (_event, payload) => callback(payload));
  },
});
