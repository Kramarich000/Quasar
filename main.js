import { app } from 'electron';
app.commandLine.appendSwitch('enable-pinch-zoom');
app.commandLine.appendSwitch('enable-features', 'PinchZoom');

import {
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  BrowserView,
  webContents,
  session,
} from 'electron';

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import pkg from 'electron-updater';
import path from 'path';
const { autoUpdater } = pkg;
import contextMenu from 'electron-context-menu';
import createBrowserView from './config/createBrowserView.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev =
  process.env.NODE_ENV === 'development' ||
  !existsSync(join(__dirname, 'dist', 'index.html'));

let win;
let headerHeight = 84.86;

const views = new Map();
let activeTabId = null;

function getCurrentView() {
  if (!activeTabId) return null;
  return views.get(activeTabId) || null;
}

function createWindow() {
  // const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    frame: false,
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 800,
    transparent: false,
    backgroundColor: '#FFFFFF',
    show: false,
    webPreferences: {
      partition: 'persist:browser',
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      devTools: false,
      nodeIntegration: false,
      webviewTag: false,
      sandbox: true,
      offscreen: false,
      scrollBounce: true,
      experimentalFeatures: false,
      enableWebGL: true,
      backgroundThrottling: false,
      enableBlinkFeatures: [
        'PictureInPicture',
        'FileSystemAccess',
        'MediaCapabilities',
        'WebCodecs',
        'PinchZoom',
      ].join(','),
      enableAccelerated2dCanvas: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      disableHtmlFullscreenWindowResize: true,
      enableAcceleratedLayers: true,
      enableAcceleratedVideo: true,
      enableAcceleratedVideoDecode: true,
      enableAcceleratedVideoEncode: true,
      enableAcceleratedCompositing: true,
      spellcheck: false,
      plugins: false,
      cache: true,
    },
  });

  win.setMaxListeners(20);

  // Запрещаем открытие DevTools для главного окна
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && input.key === 'i') {
      event.preventDefault();
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('focus', () => {
    const view = getCurrentView();
    if (view) {
      view.webContents.setBackgroundThrottling(false);
    }
  });

  win.on('blur', () => {
    const view = getCurrentView();
    if (view) {
      view.webContents.setBackgroundThrottling(true);
    }
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(1);
    win.webContents.setVisualZoomLevelLimits(1, 3);
  });

  win.on('maximize', () => {
    win.webContents.send('window:isMaximized', true);
  });

  win.on('unmaximize', () => {
    win.webContents.send('window:isMaximized', false);
  });

  win.on('resize', () => {
    const view = getCurrentView();
    if (view) {
      const { width, height } = win.getContentBounds();
      view.setBounds({
        x: 0,
        y: Math.floor(headerHeight),
        width,
        height: Math.floor(height - headerHeight),
      });
    }
  });

  win.on('enter-full-screen', () => {
    const view = getCurrentView();
    if (view) {
      const { width, height } = win.getContentBounds();
      view.setBounds({
        x: 0,
        y: Math.floor(headerHeight),
        width,
        height: Math.floor(height - headerHeight),
      });
    }
  });

  win.on('leave-full-screen', () => {
    const view = getCurrentView();
    if (view) {
      const { width, height } = win.getContentBounds();
      view.setBounds({
        x: 0,
        y: Math.floor(headerHeight),
        width,
        height: Math.floor(height - headerHeight),
      });
    }
  });

  win.on('closed', () => {
    win = null;
  });
  // win.webContents.openDevTools({ mode: 'detach' });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    // win.loadURL('http://localhost:5173');
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

ipcMain.handle('window:openExternalUrl', async (event, url) => {
  if (url && typeof url === 'string' && url.startsWith('http')) {
    await shell.openExternal(url);
  }
});

ipcMain.on('window:freezeTab', (event, wcId) => {
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

ipcMain.on('window:unfreezeTab', (event, wcId) => {
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

ipcMain.handle('window:bvLoadUrl', async (_e, url) => {
  if (!activeTabId) return { success: false, error: 'No active tab' };

  const view = views.get(activeTabId);
  if (!view) return { success: false, error: 'View for active tab not found' };

  try {
    // Если это локальный файл из public директории
    if (url.startsWith('file://')) {
      const filePath = url.replace('file://', '');
      const publicPath = join(__dirname, 'dist', filePath);
      if (existsSync(publicPath)) {
        await view.webContents.loadFile(publicPath);
        return { success: true };
      }
    }
    // Для обычных URL
    await view.webContents.loadURL(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.on('bvDestroy', (_event, tabId) => {
  const view = views.get(tabId);
  if (view) {
    win.removeBrowserView(view);
    view.webContents.destroy();
    views.delete(tabId);

    if (activeTabId === tabId) {
      activeTabId = null;
      // Здесь можно переключить на другую вкладку или скрыть BrowserView
    }
  }
});

// --------- Работа с табами ---------- //
// 1. Создание таба //
ipcMain.handle('window:bvCreateTab', async (_e, { id, url }) => {
  // Создаем новую сессию для вкладки
  const tabSession = session.fromPartition(`persist:tab-${id}`, { cache: false });
  const t0 = performance.now();
  const view = createBrowserView({
    webPreferences: { 
      contextIsolation: true, 
      sandbox: true,
      partition: `persist:tab-${id}`,
      webSecurity: true,
      allowRunningInsecureContent: false,
      nodeIntegration: false,
      webviewTag: false,
      backgroundThrottling: false,
      enableRemoteModule: false,
      spellcheck: false,
      plugins: false,
      session: tabSession,
    },
    win,
  });
  const t1 = performance.now();
  console.log(`Создание view: ${t1 - t0} мс`);
  // Добавляем слушатели
  view.webContents.on('did-start-loading', () => {
    win.webContents.send('bvDidStartLoading', id);
  });
  
  view.webContents.on('did-stop-loading', () => {
    win.webContents.send('bvDidStopLoading', id);
  });
  
  view.webContents.on('ready-to-show', () => {
    win.webContents.send('bvDomReady', id);
  });

  // Добавляем обработчики для заголовка и URL
  view.webContents.on('page-title-updated', (event, title) => {
    win.webContents.send('tabTitleUpdated', { id, title });
  });

  view.webContents.on('page-favicon-updated', (event, favicons) => {
    if (favicons && favicons.length > 0) {
      // Преобразуем относительный URL в абсолютный
      const faviconUrl = new URL(favicons[0], view.webContents.getURL()).href;
      win.webContents.send('tabFaviconUpdated', { id, favicon: faviconUrl });
    }
  });

  view.webContents.on('did-navigate', (event, url) => {
    win.webContents.send('tabUrlUpdated', { id, url });
  });

  view.webContents.on('did-navigate-in-page', (event, url) => {
    win.webContents.send('tabUrlUpdated', { id, url });
  });

  // Устанавливаем размеры
  const { width, height } = win.getContentBounds();
  view.setBounds({
    x: 0,
    y: Math.floor(headerHeight),
    width,
    height: Math.floor(height - headerHeight),
  });

  // Сохраняем view в Map
  views.set(id, view);

  // Если это первая вкладка, делаем её активной
  if (activeTabId == null) {
    activeTabId = id;
    win.setBrowserView(view);
  }

  // Загружаем контент
  try {
    if (!url || url.trim() === '') {
      const newTabPath = join(__dirname, 'dist', 'tab-content.html');
      if (existsSync(newTabPath)) {
        const t2 = performance.now();
        await view.webContents.loadFile(newTabPath);
        const t3 = performance.now();
        console.log(`Загрузка файла: ${t3 - t2} мс`);
      }
    } else {
      await view.webContents.loadURL(url);
    }
  } catch (error) {
    console.error('Failed to load content:', error);
  }

  return { success: true };
});

// 2. Смена таба //
ipcMain.handle('window:bvSwitchTab', async (_e, id) => {
  if (!views.has(id) || id === activeTabId) return;
  
  const newView = views.get(id);
  const oldView = views.get(activeTabId);

  // Просто переключаем видимость вкладок
  win.setBrowserView(newView);
  activeTabId = id;
  win.webContents.send('tabSwitched', activeTabId);
});

// 3. Закрытие таба //
ipcMain.on('window:closeTab', (_e, id) => {
  const view = views.get(id);
  if (!view) return;

  // Уничтожаем view
  win.removeBrowserView(view);
  view.webContents.destroy();
  views.delete(id);

  // Если закрыли активную вкладку, переключаемся на другую
  if (activeTabId === id) {
    const remaining = Array.from(views.keys());
    activeTabId = remaining.length ? remaining[0] : null;
    
    if (activeTabId) {
      const nextView = views.get(activeTabId);
      nextView.webContents.setBackgroundThrottling(false);
      win.setBrowserView(nextView);
      win.webContents.send('tabSwitched', activeTabId);
    }
  }
});
// ------------------------------- //

// --------- Работа с окнами ---------- //
// 1. Назад
ipcMain.on('window:bvGoBack', () => {
  const view = getCurrentView();
  if (view && view.webContents.canGoBack()) {
    view.webContents.goBack();
  }
});

// 2. Вперед
ipcMain.on('window:bvGoForward', () => {
  const view = getCurrentView();
  if (view && view.webContents.canGoForward()) {
    view.webContents.goForward();
  }
});

// 3. Перезагрузка
ipcMain.on('window:bvReload', () => {
  const view = getCurrentView();
  if (view) {
    view.webContents.reload();
  }
});

// ------------------------------- //

// --------- Работа с окном браузера --------- //
// 1. Свернуть
ipcMain.on('window:minimize', () => {
  win.minimize();
});
// 2. Закрыть
ipcMain.on('window:close', () => {
  win.close();
});
// 3. Полноэкранный/оконный режим
ipcMain.handle('window:toggleMaximize', () => {
  if (win.isMaximized()) {
    win.unmaximize();
    return false;
  } else {
    win.maximize();
    return true;
  }
});

// 4. Адаптивное вычисление шапки
ipcMain.on('window:setHeaderHeight', (_event, newHeaderHeight) => {
  if (typeof newHeaderHeight !== 'number' || newHeaderHeight < 0) return;
  console.log('Новая высота заголовка:', newHeaderHeight);
  headerHeight = newHeaderHeight;

  const view = getCurrentView();
  if (view && win) {
    const { width, height: windowHeight } = win.getContentBounds();
    view.setBounds({
      x: 0,
      y: Math.floor(newHeaderHeight), // Округляем для избежания проблем с пикселями
      width,
      height: Math.floor(windowHeight - newHeaderHeight), // Округляем для избежания проблем с пикселями
    });
    view.setAutoResize({ 
      width: true, 
      height: true,
      horizontal: true,
      vertical: true
    });
  }
});

// ------------ //

// ---- Обновление ----- //

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

// Добавляем обработчик для получения favicon
ipcMain.handle('window:getFavicon', async (_e, tabId) => {
  const view = views.get(tabId);
  if (!view) return { favicon: null };

  try {
    const favicon = await view.webContents.executeJavaScript(`
      (() => {
        const iconLink = document.querySelector('link[rel="icon"]');
        if (iconLink && iconLink.href) {
          return iconLink.href;
        }
        return '/favicon.ico';
      })()
    `);

    if (favicon) {
      // Преобразуем относительный URL в абсолютный
      const absoluteUrl = new URL(favicon, view.webContents.getURL()).href;
      return { favicon: absoluteUrl };
    }
  } catch (error) {
    console.error('Error getting favicon:', error);
  }

  return { favicon: null };
});
