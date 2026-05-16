const { contextBridge, ipcRenderer } = require('electron');

// eslint-disable-next-line no-console
console.log('[ClassScore preload] start', { __filename: typeof __filename !== 'undefined' ? __filename : '' });

try {
  contextBridge.exposeInMainWorld('api', {
    exportReport: (data, defaultPath) => ipcRenderer.invoke('export-report', data, defaultPath),
    backupData: (data) => ipcRenderer.invoke('backup-data', data),
    restoreData: () => ipcRenderer.invoke('restore-data'),
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    capturePage: (rect) => ipcRenderer.invoke('capture-page', rect),
    /** Gửi một dòng log từ renderer ra file classscore-debug.log (main process). */
    rendererLog: (text) => ipcRenderer.send('classscore-renderer-log', text),
  });
  // eslint-disable-next-line no-console
  console.log('[ClassScore preload] contextBridge exposeInMainWorld(api) OK');
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('[ClassScore preload] contextBridge FAILED', err);
}
