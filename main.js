import { app } from 'electron';
app.commandLine.appendSwitch('enable-pinch-zoom');
app.commandLine.appendSwitch('enable-features', 'PinchZoom');

import { BrowserWindow, ipcMain, dialog, shell, session } from 'electron';

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import pkg from 'electron-updater';
import path from 'path';
const { autoUpdater } = pkg;
import contextMenu from 'electron-context-menu';
import createBrowserView from './createBrowserView.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev =
  process.env.NODE_ENV === 'development' ||
  !existsSync(join(__dirname, 'dist', 'index.html'));

let win;
let headerHeight = 84.86;

const views = new Map();
let activeTabId = null;

const POOL_SIZE = 25;
const viewPool = [];
const viewInUse = new Map();

function attachViewListeners(view) {
  view.webContents.on('did-start-loading', () =>
    win.webContents.send('bvDidStartLoading', view._tabId),
  );
  view.webContents.on('did-stop-loading', () =>
    win.webContents.send('bvDidStopLoading', view._tabId),
  );
  view.webContents.on('ready-to-show', () =>
    win.webContents.send('bvDomReady', view._tabId),
  );
  view.webContents.on('page-title-updated', (_e, title) =>
    win.webContents.send('tabTitleUpdated', { id: view._tabId, title }),
  );
  view.webContents.on('page-favicon-updated', async (_e, favicons) => {
    console.log('Favicon update event:', { 
      tabId: view._tabId, 
      hasFavicons: !!favicons?.length,
      favicons 
    });
    
    if (!favicons?.length) {
      win.webContents.send('tabFaviconUpdated', {
        id: view._tabId,
        favicon: null,
      });
      return;
    }

    try {
      const faviconUrl = new URL(favicons[0], view.webContents.getURL()).href;
      console.log('Fetching favicon:', faviconUrl);
      
      // Создаем сессию для загрузки фавиконки
      const faviconSession = session.fromPartition('persist:favicons');
      
      // Настраиваем CORS для фавиконок
      await faviconSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Access-Control-Allow-Origin': ['*'],
            'Access-Control-Allow-Methods': ['GET'],
            'Access-Control-Allow-Headers': ['*'],
          },
        });
      });

      // Загружаем фавиконку
      const response = await fetch(faviconUrl, {
        headers: {
          'Accept': 'image/*',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch favicon: ${response.status}`);
      }

      const blob = await response.blob();
      const dataUrl = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
      
      console.log('Favicon loaded successfully:', { tabId: view._tabId, type: blob.type });
      
      // Добавляем небольшую задержку для плавности
      await new Promise(resolve => setTimeout(resolve, 100));
      
      win.webContents.send('tabFaviconUpdated', {
        id: view._tabId,
        favicon: dataUrl,
      });
    } catch (error) {
      console.error('Error loading favicon:', error);
      win.webContents.send('tabFaviconUpdated', {
        id: view._tabId,
        favicon: null,
      });
    }
  });
  view.webContents.on('did-navigate', (_e, url) =>
    win.webContents.send('tabUrlUpdated', { id: view._tabId, url }),
  );
  view.webContents.on('did-navigate-in-page', (_e, url) =>
    win.webContents.send('tabUrlUpdated', { id: view._tabId, url }),
  );
}

async function createPooledView(poolId) {
  const partition = `persist:pool-${poolId}`;
  const tabSession = session.fromPartition(partition, { cache: false });
  const view = createBrowserView({
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      partition,
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

  attachViewListeners(view);

  const tpl = join(__dirname, 'dist', 'tab-content.html');
  if (existsSync(tpl)) {
    await view.webContents.loadFile(tpl);
  }

  viewInUse.set(view, false);
  return view;
}

async function initViewPool() {
  for (let i = 0; i < POOL_SIZE; i++) {
    const view = await createPooledView(i);
    viewPool.push(view);
  }
}

function acquireView(tabId) {
  let view = viewPool.find((v) => !viewInUse.get(v));
  if (!view) {
    console.warn('Пул исчерпан — создаём новый BrowserView');
    view = createBrowserView({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        backgroundThrottling: false,
      },
      win,
    });
    attachViewListeners(view);
  }
  view._tabId = tabId;
  viewInUse.set(view, true);
  return view;
}

async function releaseView(view) {
  win.removeBrowserView(view);
  const tpl = join(__dirname, 'dist', 'tab-content.html');
  if (existsSync(tpl)) {
    await view.webContents.loadFile(tpl);
  }
  viewInUse.set(view, false);
}

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
      devTools: true,
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

  win.setMaxListeners(50);
  win.once('ready-to-show', () => {
    win.show();
  });

  // win.webContents.on('before-input-event', (event, input) => {
  //   if (
  //     input.type === 'keyDown' &&
  //     input.control &&
  //     input.shift &&
  //     input.key === 'i'
  //   ) {
  //     event.preventDefault();
  //   }
  // });

  const resizeHandler = () => {
    const v = getCurrentView();
    if (!v) return;
    const { width, height } = win.getContentBounds();
    v.setBounds({
      x: 0,
      y: Math.floor(headerHeight),
      width,
      height: Math.floor(height - headerHeight),
    });
  };
  win.on('resize', resizeHandler);
  win.on('enter-full-screen', resizeHandler);
  win.on('leave-full-screen', resizeHandler);

  win.on('focus', () =>
    getCurrentView()?.webContents.setBackgroundThrottling(false),
  );
  win.on('blur', () =>
    getCurrentView()?.webContents.setBackgroundThrottling(true),
  );

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
  win.webContents.openDevTools({ mode: 'detach' });

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
  const view = acquireView(id);
  views.set(id, view);
  activeTabId = activeTabId ?? id;
  win.setBrowserView(view);

  const { width, height } = win.getContentBounds();
  view.setBounds({
    x: 0,
    y: Math.floor(headerHeight),
    width,
    height: Math.floor(height - headerHeight),
  });

  try {
    if (url && url.trim()) {
      await view.webContents.loadURL(url);
    }
  } catch (err) {
    console.error('Failed to load URL in pooled view:', err);
  }

  return { success: true };
});

// 2. Смена таба //
ipcMain.handle('window:bvSwitchTab', (_e, id) => {
  if (id === activeTabId || !views.has(id)) return;
  const newV = views.get(id);
  win.setBrowserView(newV);
  activeTabId = id;
  win.webContents.send('tabSwitched', id);
});

// 3. Закрытие таба //
ipcMain.on('window:closeTab', async (_e, id) => {
  const view = views.get(id);
  if (!view) return;
  views.delete(id);
  if (activeTabId === id) activeTabId = null;

  await releaseView(view);

  const next = Array.from(views.keys())[0];
  if (next) {
    activeTabId = next;
    const nv = views.get(next);
    win.setBrowserView(nv);
    win.webContents.send('tabSwitched', next);
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
      vertical: true,
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

  app.whenReady().then(async () => {
    createWindow();
    await initViewPool();
    autoUpdater.checkForUpdatesAndNotify();
    contextMenu({ showInspectElement: isDev });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
