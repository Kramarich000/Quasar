import {
  app,
  BrowserWindow,
  Menu,
  screen,
  ipcMain,
  session,
  dialog,
  shell,
  webContents,
} from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import pkg from 'electron-updater';
import path from 'path';
const { autoUpdater } = pkg;
import contextMenu from 'electron-context-menu';

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
    defaultFontSize: 16,
    minWidth: 800,
    minHeight: 800,
    transparent: false,
    zoomFactor: 1.0,
    webPreferences: {
      partition: 'persist:browser',
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: true,
      // experimentalFeatures: true,
      offscreen: false,
      //plugins: true,
      scrollBounce: true,
      experimentalFeatures: true,
      enableWebGL: true,
      backgroundThrottling: false,
      zoomable: true,
      enableBlinkFeatures: 'PictureInPicture,FileSystemAccess',
      enableAccelerated2dCanvas: true,
      webSecurity: true,
      enableBlinkFeatures: 'MediaCapabilities,WebCodecs',
      allowRunningInsecureContent: false,
      disableHtmlFullscreenWindowResize: true,
    },
  });

  win.on('closed', () => {
    win = null;
  });

  win.webContents.setZoomLevel(0);

  win.webContents.on('before-input-event', (event, input) => {
    const zoomStep = 0.25;
    const currentZoom = win.webContents.getZoomLevel();

    const minZoom = -1.5;
    const maxZoom = 1.5;

    if (input.type === 'keyDown' && input.control) {
      if (['+', '=', 'Add'].includes(input.key)) {
        if (currentZoom + zoomStep <= maxZoom) {
          win.webContents.setZoomLevel(currentZoom + zoomStep);
        }
        event.preventDefault();
      } else if (['-', 'Subtract'].includes(input.key)) {
        if (currentZoom - zoomStep >= minZoom) {
          win.webContents.setZoomLevel(currentZoom - zoomStep);
        }
        event.preventDefault();
      } else if (['0', 'Insert'].includes(input.key)) {
        win.webContents.setZoomLevel(0);
        event.preventDefault();
      }
    }

    if (
      input.type === 'mouseWheel' &&
      input.control &&
      typeof input.deltaY === 'number'
    ) {
      const direction = input.deltaY > 0 ? -1 : 1;
      const newZoom = currentZoom + direction * zoomStep;
      if (newZoom >= minZoom && newZoom <= maxZoom) {
        win.webContents.setZoomLevel(newZoom);
      }
      event.preventDefault();
    }

    if (
      input.type === 'mouseDown' &&
      input.control &&
      input.button === 'left'
    ) {
      if (currentZoom + zoomStep <= maxZoom) {
        win.webContents.setZoomLevel(currentZoom + zoomStep);
      }
      event.preventDefault();
    }
  });

  // win.webContents.openDevTools();

  win.webContents.on('zoom-changed', (event, zoomDirection) => {
    const currentLevel = win.webContents.getZoomLevel();

    const minLevel = -3;
    const maxLevel = 5;

    if (zoomDirection === 'in' && currentLevel < maxLevel) {
      win.webContents.setZoomLevel(currentLevel + 1);
    } else if (zoomDirection === 'out' && currentLevel > minLevel) {
      win.webContents.setZoomLevel(currentLevel - 1);
    }

    event.preventDefault();
  });

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

  win.webContents.setVisualZoomLevelLimits(1, 3);

  const isMac = process.platform === 'darwin';
  const menuTemplate = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about', label: `О программе ${app.name}` },
              { type: 'separator' },
              { role: 'services', label: 'Службы' },
              { type: 'separator' },
              { role: 'hide', label: 'Скрыть' },
              { role: 'hideOthers', label: 'Скрыть другие' },
              { role: 'unhide', label: 'Показать всё' },
              { type: 'separator' },
              { role: 'quit', label: 'Выйти', accelerator: 'Command+Q' },
            ],
          },
        ]
      : []),

    {
      label: 'Файл',
      submenu: [
        isMac
          ? { role: 'close', label: 'Закрыть окно', accelerator: 'Command+W' }
          : { role: 'quit', label: 'Выйти', accelerator: 'Alt+F4' },
      ],
    },

    {
      label: 'Правка',
      submenu: [
        { role: 'undo', label: 'Отменить', accelerator: 'CmdOrCtrl+Z' },
        { role: 'redo', label: 'Вернуть', accelerator: 'CmdOrCtrl+Y' },
        { type: 'separator' },
        { role: 'cut', label: 'Вырезать', accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', label: 'Копировать', accelerator: 'CmdOrCtrl+C' },
        { role: 'paste', label: 'Вставить', accelerator: 'CmdOrCtrl+V' },
        {
          role: 'pasteAndMatchStyle',
          label: 'Вставить со стилем',
          accelerator: 'Shift+CmdOrCtrl+V',
        },
        { role: 'delete', label: 'Удалить' },
        {
          role: 'selectAll',
          label: 'Выделить всё',
          accelerator: 'CmdOrCtrl+A',
        },
      ],
    },

    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Перезагрузить', accelerator: 'CmdOrCtrl+R' },
        {
          role: 'forceReload',
          label: 'Перезагрузить без кеша',
          accelerator: 'Shift+CmdOrCtrl+R',
        },
        { role: 'viewMenu' },
        { type: 'separator' },
        {
          role: 'toggleDevTools',
          label: 'Инструменты разработчика',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        },
        { type: 'separator' },
        { role: 'toggleTabBar' },
        { role: 'selectNextTab' },
        { role: 'selectPreviousTab' },
        {
          role: 'resetZoom',
          label: 'Сбросить масштаб',
          accelerator: 'CmdOrCtrl+0',
        },
        {
          role: 'zoomIn',
          label: 'Увеличить масштаб',
          accelerator: 'CmdOrCtrl+=',
        },
        {
          role: 'zoomOut',
          label: 'Уменьшить масштаб',
          accelerator: 'CmdOrCtrl+-',
        },
        { type: 'separator' },
        {
          role: 'togglefullscreen',
          label: 'Полноэкранный режим',
          accelerator: isMac ? 'Ctrl+Command+F' : 'F11',
        },
      ],
    },
    {
      label: 'Сервисы',
      submenu: [
        { role: 'speechSubmenu' },
        { role: 'toggleSmartQuotes' },
        { role: 'toggleSmartDashes' },
      ],
    },
    {
      label: 'Окно',
      submenu: [
        { role: 'mergeAllWindows' },
        { role: 'moveTabToNewWindow' },
        { role: 'showAllTabs' },
      ],
    },
    {
      label: 'Трей',
      submenu: [
        {
          label: 'Открыть окно',
          click: () => win.show(),
        },
        {
          label: 'Выход',
          role: 'quit',
        },
      ],
    },
    {
      label: 'Инструменты',
      submenu: [
        {
          label: 'Очистить кеш',
          click: () => win.webContents.session.clearCache(),
        },
        {
          label: 'Настройки',
          click: () => {},
        },
      ],
    },
    {
      label: 'Навигация',
      submenu: [
        {
          label: 'Назад',
          accelerator: 'Alt+Left',
          click: () => {
            const webContents = win.webContents;
            if (webContents.canGoBack()) webContents.goBack();
          },
        },
        {
          label: 'Вперёд',
          accelerator: 'Alt+Right',
          click: () => {
            const webContents = win.webContents;
            if (webContents.canGoForward()) webContents.goForward();
          },
        },
        { type: 'separator' },
        {
          label: 'Домой',
          click: () => win.loadURL('https://example.com'),
        },
      ],
    },

    {
      label: 'Справка',
      submenu: [
        {
          label: 'Сообщить об ошибке',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal(
              'https://github.com/Kramarich000/Quasar/issues',
            );
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  // win.setMenuBarVisibility(false);
  // win.setAutoHideMenuBar(true);

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(join(__dirname, 'dist', 'index.html'));
  }
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
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      partition: 'persist:browser',
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: true,
      // experimentalFeatures: true,
      offscreen: false,
      //plugins: true,
      scrollBounce: true,
      enableWebGL: true,
      enableAccelerated2dCanvas: true,
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
  // newWindow.webContents.openDevTools();

  newWindow.on('closed', () => {
    detachedWindows.delete(newWindow);
  });

  return newWindow;
}

function createNewIncognitoWindowWithUrl(url) {
  const incognitoWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      partition: `in-memory-incognito-${Date.now()}`,
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: true,
      // experimentalFeatures: true,
      offscreen: false,
      //plugins: true,
      scrollBounce: true,
      enableWebGL: true,
      enableAccelerated2dCanvas: true,
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

ipcMain.handle('open-external-url', async (event, url) => {
  if (url && typeof url === 'string' && url.startsWith('http')) {
    await shell.openExternal(url);
  }
});

ipcMain.on('freeze-tab', (event, wcId) => {
  const wc = webContents.fromId(wcId);
  if (!wc || wc.isDestroyed()) return;

  wc.setBackgroundThrottling(true);

  try {
    wc.debugger.attach();
    wc.debugger.sendCommand('Page.setWebLifecycleState', { state: 'frozen' });
  } catch (e) {
    console.error('Freeze failed:', e);
  }
});

ipcMain.on('unfreeze-tab', (event, wcId) => {
  const wc = webContents.fromId(wcId);
  if (!wc || wc.isDestroyed()) return;

  wc.setBackgroundThrottling(false);

  try {
    wc.debugger.sendCommand('Page.setWebLifecycleState', { state: 'active' });
    wc.debugger.detach();
  } catch (e) {
    console.error('Unfreeze failed:', e);
  }
});

ipcMain.on('window-createIncognitoWindow', () => {
  console.log('Создание инкогнито-окна...');

  const incognitoWindow = new BrowserWindow({
    frame: false,
    titleBarStyle: 'hidden',
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      incognito: true,
      partition: `in-memory-incognito-${Date.now()}`,
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: true,
      // experimentalFeatures: true,
      //plugins: true,
      scrollBounce: true,
      enableWebGL: true,
      additionalArguments: ['--incognito'],
      enableAccelerated2dCanvas: true,
    },
  });

  // incognitoWindow.webContents.openDevTools();

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
autoUpdater.on('update-downloaded', async (info) => {
  console.log('Обновление скачано:', info);

  const { response } = await dialog.showMessageBox({
    type: 'info',
    buttons: ['Перезапустить сейчас', 'Позже'],
    defaultId: 0,
    cancelId: 1,
    title: 'Обновление доступно',
    message: 'Обновление загружено. Хотите установить его сейчас?',
    detail: info.files?.[0]?.size
      ? `Версия: ${info.version}\nРазмер: ~${(
          info.files[0].size /
          1024 /
          1024
        ).toFixed(1)} МБ`
      : `Версия: ${info.version}`,
  });

  if (response === 0) {
    try {
      autoUpdater.quitAndInstall();
    } catch (e) {
      console.error('Ошибка при установке обновления:', e);
    }
  } else {
    console.log('Установка отложена');
  }
});

autoUpdater.on('error', (err) => console.error('Ошибка обновления', err));

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    autoUpdater.checkForUpdatesAndNotify();
    createWindow();

    contextMenu({
      showInspectElement: isDev,
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
