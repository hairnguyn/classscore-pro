const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const distRoot = path.join(__dirname, 'dist');

/** True when user wants verbose traces (terminal + log file + optional DevTools). */
function wantsDebug() {
  return (
    process.env.CLASSSCORE_DEBUG === '1' ||
    process.argv.includes('--classscore-debug')
  );
}

function wantsDevTools() {
  return (
    process.env.CLASSSCORE_DEVTOOLS === '1' ||
    process.argv.includes('--classscore-devtools') ||
    wantsDebug()
  );
}

let debugLogPath = '';

function bootLog(line) {
  const ts = new Date().toISOString();
  const msg = `[ClassScore ${ts}] ${line}`;
  // eslint-disable-next-line no-console
  console.log(msg);
  if (debugLogPath) {
    try {
      fs.appendFileSync(debugLogPath, `${msg}\n`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[ClassScore] appendFileSync failed:', e && e.message);
    }
  }
}

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

let mainWindow;

function getWindowIconPath() {
  if (app.isPackaged) {
    return path.join(distRoot, 'ico', 'default_256_windows.ico');
  }
  return path.join(__dirname, 'public', 'ico', 'default_256_windows.ico');
}

function attachWindowDebugLogging(win) {
  const wc = win.webContents;

  wc.on('did-start-loading', () => bootLog('webContents did-start-loading'));
  wc.on('did-finish-load', () => bootLog('webContents did-finish-load'));
  wc.on('dom-ready', () => bootLog('webContents dom-ready'));

  wc.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    bootLog(
      `did-fail-load mainFrame=${isMainFrame} code=${errorCode} desc=${errorDescription} url=${validatedURL}`,
    );
  });

  wc.on('render-process-gone', (event, details) => {
    bootLog(`render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
  });

  wc.on('unresponsive', () => bootLog('webContents unresponsive'));

  if (wantsDebug()) {
    wc.on('console-message', (event, level, message, line, sourceId) => {
      bootLog(`[renderer console L${level}] ${message} (${sourceId}:${line})`);
    });
  }
}

function createWindow() {
  bootLog(
    `createWindow isPackaged=${app.isPackaged} isDev=${isDev} __dirname=${__dirname} wantsDevTools=${wantsDevTools()}`,
  );

  const indexHtml = path.join(distRoot, 'index.html');
  bootLog(`distRoot=${distRoot} indexHtml exists=${fs.existsSync(indexHtml)}`);

  if (!isDev) {
    try {
      const distEntries = fs.readdirSync(distRoot);
      bootLog(`dist top-level (${distEntries.length} entries): ${distEntries.slice(0, 20).join(', ')}${distEntries.length > 20 ? '…' : ''}`);
    } catch (e) {
      bootLog(`readdirSync(distRoot) failed: ${e && e.message}`);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    icon: getWindowIconPath(),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  attachWindowDebugLogging(mainWindow);

  if (wantsDevTools()) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    bootLog('openDevTools(detach) enabled');
  }

  mainWindow.once('ready-to-show', () => {
    bootLog('BrowserWindow ready-to-show');
    mainWindow.show();
    
    // Force focus in Windows if another process stole it (like the terminal)
    // by momentarily setting the window to always-on-top.
    if (process.platform === 'win32') {
      mainWindow.setAlwaysOnTop(true);
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(false);
    } else {
      mainWindow.focus();
    }
  });

  if (isDev) {
    bootLog('loadURL dev server http://localhost:5173/');
    mainWindow.loadURL('http://localhost:5173/');
  } else {
    bootLog(`loadFile(${indexHtml})`);
    mainWindow.loadFile(indexHtml).catch((err) => {
      bootLog(`loadFile() rejected: ${err && err.message}`);
    });
  }
}

app
  .whenReady()
  .then(() => {
    try {
      debugLogPath = path.join(app.getPath('userData'), 'classscore-debug.log');
      fs.appendFileSync(debugLogPath, `\n========== session start ${new Date().toISOString()} ==========\n`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[ClassScore] could not init debug log file:', e && e.message);
    }

    bootLog(
      `app.whenReady version=${process.versions.electron} node=${process.versions.node} execPath=${process.execPath}`,
    );
    bootLog(`debugLogPath=${debugLogPath}`);
    bootLog(`argv=${JSON.stringify(process.argv)}`);

    createWindow();

    app.on('activate', () => {
      bootLog(`activate windows=${BrowserWindow.getAllWindows().length}`);
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[ClassScore] app.whenReady failed', err);
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

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

/** Renderer can call this to append one line to the same boot log file. */
ipcMain.on('classscore-renderer-log', (event, text) => {
  bootLog(`[from renderer] ${String(text)}`);
});

ipcMain.handle('capture-page', async (event, rect) => {
  const image = await mainWindow.webContents.capturePage(rect);
  const buffer = image.toPNG();
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Screenshot',
    defaultPath: `Recap_${Date.now()}.png`,
    filters: [{ name: 'Images', extensions: ['png'] }],
  });
  if (!canceled && filePath) {
    fs.writeFileSync(filePath, buffer);
    return true;
  }
  return false;
});

ipcMain.handle('export-report', async (event, content, defaultPath) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath || 'report.txt',
  });
  if (!canceled && filePath) {
    const isBuffer = Buffer.isBuffer(content) || content instanceof Uint8Array;
    if (isBuffer) fs.writeFileSync(filePath, Buffer.from(content));
    else fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
});

ipcMain.handle('backup-data', async (event, dataString) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup Data',
    defaultPath: 'smart-class-manager-backup.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
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
    properties: ['openFile'],
  });
  if (!canceled && filePaths.length > 0) return fs.readFileSync(filePaths[0], 'utf-8');
  return null;
});
