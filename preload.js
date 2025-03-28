const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcBridge', {
  runScripts: () => ipcRenderer.invoke('run-scripts')
});
