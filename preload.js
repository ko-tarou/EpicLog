const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcBridge', {
  runScripts: () => ipcRenderer.invoke('run-scripts'),
  saveStory: (data) => ipcRenderer.send('save-story', data),
  loadHistory: () => ipcRenderer.invoke('load-history')
});
