import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Получаем __dirname для ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let win;

function createWindow() {
  win = new BrowserWindow({
    fullscreen: true,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      webviewTag: true,
      preload: join(__dirname, 'preload.js'),
      contextIsolation: false,
    },
  });
  win.setFullScreen(!win.isFullScreen());

  win.loadURL('http://localhost:5173');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
