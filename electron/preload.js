const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  isElectron: true,
  loginWithGoogle: () => ipcRenderer.invoke("start-google-login"),
  apiFetch: (url, options) => ipcRenderer.invoke("api-fetch", url, options)
});
