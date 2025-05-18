import { app, BrowserWindow, Menu, screen } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { ipcMain } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev =
  process.env.NODE_ENV === 'development' ||
  !existsSync(join(__dirname, 'dist', 'index.html'));

let win;

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
  // win.webContents.openDevTools();

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

ipcMain.on('window-minimize', () => win.minimize());

ipcMain.handle('toggleMaximize', () => {
  if (win.isMaximized()) {
    win.unmaximize();
    return false;
  } else {
    win.maximize();
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

ipcMain.on('window-close', () => win.close());
ipcMain.on(
  'go-back',
  () => win.webContents.canGoBack() && win.webContents.goBack(),
);
ipcMain.on(
  'go-forward',
  () => win.webContents.canGoForward() && win.webContents.goForward(),
);
ipcMain.on('reload', () => win.webContents.reload());

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
