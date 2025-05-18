import { app, BrowserWindow, Menu } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let win;

function createWindow() {
  win = new BrowserWindow({
    frame: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  win.loadURL('http://localhost:5173');

  Menu.setApplicationMenu(null);
}

try {
  require('electron-reloader')(module);
} catch (_) {}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
