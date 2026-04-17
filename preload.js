const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  exportReport: (data, defaultPath) => ipcRenderer.invoke('export-report', data, defaultPath),
  backupData: (data) => ipcRenderer.invoke('backup-data', data),
  restoreData: () => ipcRenderer.invoke('restore-data'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});
