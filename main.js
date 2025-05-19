import { app, BrowserWindow, Menu, screen, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import pkg from 'electron-updater';
import path from 'path';
const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev =
  process.env.NODE_ENV === 'development' ||
  !existsSync(join(__dirname, 'dist', 'index.html'));

let win;
const incognitoWindows = new Set();
const detachedWindows = new Set();

function createWindow() {
  // const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    frame: false,
    titleBarStyle: 'hidden',
    // width,
    // height,
    width: 1200,
    height: 900,
    transparent: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });
  win.on('closed', () => {
    win = null;
  });
  win.webContents.openDevTools();

  win.webContents.on('did-navigate', (event, url) => {
    const isSecure = url.startsWith('https://');
    win.webContents.send('security-status', isSecure);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://trusted-site.com')) {
      return { action: 'allow' };
    }
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(join(__dirname, 'dist', 'index.html'));
  }

  Menu.setApplicationMenu(null);
}

if (isDev) {
  (async () => {
    try {
      const reloader = await import('electron-reloader');
      reloader.default(module);
    } catch (_) {}
  })();
}
function createNewWindowWithUrl(url) {
  const newWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });
  if (isDev) {
    newWindow.loadURL('http://localhost:5173');
  } else {
    newWindow.loadFile(join(__dirname, 'dist', 'index.html'));
  }

  newWindow.webContents.on('did-finish-load', () => {
    newWindow.webContents.send('init-tab-url', url);
  });

  detachedWindows.add(newWindow);
  newWindow.webContents.openDevTools();

  newWindow.on('closed', () => {
    detachedWindows.delete(newWindow);
  });

  return newWindow;
}

function createNewIncognitoWindowWithUrl(url) {
  const partitionName = `persist:incognito-${Date.now()}`;
  const incognitoWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      partition: partitionName,
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      additionalArguments: ['--incognito'],
    },
  });

  incognitoWindow.webContents.openDevTools();

  incognitoWindows.add(incognitoWindow);

  incognitoWindow.on('closed', () => {
    incognitoWindows.delete(incognitoWindow);
  });

  if (isDev) {
    incognitoWindow.loadURL('http://localhost:5173');
  } else {
    incognitoWindow.loadFile(join(__dirname, 'dist', 'index.html'));
  }

  incognitoWindow.webContents.on('did-finish-load', () => {
    incognitoWindow.webContents.send('init-tab-url', url);
  });

  return incognitoWindow;
}

const historyFilePath = join(__dirname, 'history.json');
let history = [];
if (existsSync(historyFilePath)) {
  try {
    const data = readFileSync(historyFilePath, 'utf-8');
    history = JSON.parse(data);
  } catch (error) {
    console.error('Ошибка при чтении файла истории:', error);
    history = [];
  }
}

ipcMain.on('window-minimize', (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (senderWin && !senderWin.isDestroyed()) {
    senderWin.minimize();
  }
});
ipcMain.handle('window-toggleMaximize', (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (!senderWin || senderWin.isDestroyed()) return false;

  if (senderWin.isMaximized()) {
    senderWin.unmaximize();
    return false;
  } else {
    senderWin.maximize();
    return true;
  }
});

ipcMain.on('history-add', (event, entry) => {
  history.push(entry);
  try {
    writeFileSync(historyFilePath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Ошибка при записи файла истории:', error);
  }
});

ipcMain.handle('get-history', () => history);

ipcMain.on('window-close', (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (senderWin && !senderWin.isDestroyed()) {
    senderWin.close();
  }
});
ipcMain.on('go-back', (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (senderWin && senderWin.webContents.canGoBack()) {
    senderWin.webContents.goBack();
  }
});
ipcMain.on('go-forward', (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (senderWin && senderWin.webContents.canGoForward()) {
    senderWin.webContents.goForward();
  }
});
ipcMain.on('reload', (event) => {
  const senderWin = BrowserWindow.fromWebContents(event.sender);
  if (senderWin) {
    senderWin.webContents.reload();
  }
});
app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
  createWindow();
});

ipcMain.on('window-createIncognitoWindow', () => {
  console.log('Создание инкогнито-окна...');

  const incognitoWindow = new BrowserWindow({
    frame: false,
    titleBarStyle: 'hidden',
    width: 1200,
    height: 800,
    webPreferences: {
      partition: `persist:incognito-${Date.now()}`,
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      additionalArguments: ['--incognito'],
    },
  });

  incognitoWindow.webContents.openDevTools();

  incognitoWindows.add(incognitoWindow);

  incognitoWindow.on('closed', () => {
    incognitoWindows.delete(incognitoWindow);
  });

  if (isDev) {
    incognitoWindow.loadURL('http://localhost:5173');
  } else {
    incognitoWindow.loadFile(join(__dirname, 'dist', 'index.html'));
  }
});
ipcMain.handle('window-detachTab', (event, { url, incognito, id }) => {
  if (incognito) {
    return createNewIncognitoWindowWithUrl(url);
  } else {
    return createNewWindowWithUrl(url);
  }
});

autoUpdater.on('checking-for-update', () =>
  console.log('Проверка обновлений…'),
);
autoUpdater.on('update-available', (info) =>
  console.log('Есть обновление', info),
);
autoUpdater.on('update-downloaded', () => {
  console.log('Обновление скачано, скоро перезапуск…');
  autoUpdater.quitAndInstall();
});
autoUpdater.on('error', (err) => console.error('Ошибка обновления', err));

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
