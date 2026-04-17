const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    // We assume Vite runs on 5173 by default
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

ipcMain.handle('export-report', async (event, content, defaultPath) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath || 'report.txt',
  });
  if (!canceled && filePath) {
    // If it's a Buffer (like xlsx), write directly. If string, write with utf-8
    const isBuffer = Buffer.isBuffer(content) || content instanceof Uint8Array;
    if (isBuffer) {
      fs.writeFileSync(filePath, Buffer.from(content));
    } else {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return true;
  }
  return false;
});

ipcMain.handle('backup-data', async (event, dataString) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup Data',
    defaultPath: 'smart-class-manager-backup.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  if (!canceled && filePath) {
    fs.writeFileSync(filePath, dataString, 'utf-8');
    return true;
  }
  return false;
});

ipcMain.handle('restore-data', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore Data',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (!canceled && filePaths.length > 0) {
    return fs.readFileSync(filePaths[0], 'utf-8');
  }
  return null;
});
