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
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 900;
const MIN_WIDTH = 800;
const MIN_HEIGHT = 800;

const views = new Map();
let activeTabId = null;

const POOL_SIZE = 25;
const viewPool = [];
const viewInUse = new Map();
const faviconCache = new Map();
const MAX_FAVICON_CACHE = 50; // Максимальное количество favicon в кэше
let faviconSession;

function setActiveView(view) {
  const old = getCurrentView();
  if (old && old !== view) {
    // Оптимизируем старый view
    old.webContents.setBackgroundThrottling(true);
    old.webContents.setFrameRate(5); // Снижаем FPS, но не до минимума
    win.removeBrowserView(old);
  }
  win.setBrowserView(view);
  // Восстанавливаем нормальную работу для активного view
  view.webContents.setBackgroundThrottling(false);
  view.webContents.setFrameRate(60);
}

function updateViewBounds(view) {
  const { width, height } = win.getContentBounds();
  view.setBounds({
    x: 0,
    y: Math.floor(headerHeight),
    width,
    height: Math.floor(height - headerHeight),
  });
}

const debounce = (fn, ms) => {
  let timer;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
};

function attachViewListeners(view) {
  if (!view || !view.webContents || view.webContents.isDestroyed()) {
    console.warn('View or webContents destroyed. Skipping favicon load.');
    return;
  }

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
    if (!favicons?.length) {
      return win.webContents.send('tabFaviconUpdated', {
        id: view._tabId,
        favicon: null,
      });
    }

    const cacheKey = `${view._tabId}|${favicons[0]}`;
    if (faviconCache.has(cacheKey)) {
      return win.webContents.send('tabFaviconUpdated', {
        id: view._tabId,
        favicon: faviconCache.get(cacheKey),
      });
    }

    let onHeadersReceivedCallback = (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Access-Control-Allow-Origin': ['*'],
          'Access-Control-Allow-Methods': ['GET'],
          'Access-Control-Allow-Headers': ['*'],
        },
      });
    };

    try {
      const currentUrl = view.webContents.getURL();
      if (
        !currentUrl ||
        currentUrl === 'about:blank' ||
        currentUrl.startsWith('file://')
      ) {
        throw new Error('Invalid URL for favicon');
      }
      const faviconUrl = new URL(favicons[0], view.webContents.getURL()).href;
      console.log('Fetching favicon:', faviconUrl);
      if (faviconUrl.endsWith('.svg') || faviconUrl.endsWith('.webmanifest')) {
        throw new Error('Unsupported favicon type');
      }
      faviconSession.webRequest.onHeadersReceived(onHeadersReceivedCallback);

      const response = await fetch(faviconUrl, {
        headers: {
          Accept: 'image/*',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch favicon: ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('Response is not an image');
      }
      const dataUrl = `data:${blob.type};base64,${Buffer.from(
        await blob.arrayBuffer(),
      ).toString('base64')}`;

      cleanupFaviconCache();

      faviconCache.set(cacheKey, dataUrl);

      win.webContents.send('tabFaviconUpdated', {
        id: view._tabId,
        favicon: dataUrl,
      });
    } catch (error) {
      console.error('Error loading favicon:', error);

      try {
        const domain = new URL(view.webContents.getURL()).hostname;
        const googleFaviconUrl = `https://www.google.com/s2/favicons?domain= ${domain}`;

        const response = await fetch(googleFaviconUrl);
        if (!response.ok)
          throw new Error(`Google Favicon API error: ${response.status}`);

        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          throw new Error(`Google returned non-image: ${blob.type}`);
        }
        const dataUrl = `data:${blob.type};base64,${Buffer.from(
          await blob.arrayBuffer(),
        ).toString('base64')}`;

        faviconCache.set(cacheKey, dataUrl);

        if (!win.webContents.isDestroyed()) {
          win.webContents.send('tabFaviconUpdated', {
            id: view._tabId,
            favicon: dataUrl,
          });
        }
      } catch (fallbackError) {
        console.error('Fallback favicon failed:', fallbackError);
        if (!win.webContents.isDestroyed()) {
          win.webContents.send('tabFaviconUpdated', {
            id: view._tabId,
            favicon: defaultFavicon,
          });
        }
      }
    } finally {
      faviconSession.webRequest.onHeadersReceived(null);
    }
  });
  view.webContents.on('did-navigate', (_e, url) =>
    win.webContents.send('tabUrlUpdated', { id: view._tabId, url }),
  );
  view.webContents.on('did-navigate-in-page', (_e, url) =>
    win.webContents.send('tabUrlUpdated', { id: view._tabId, url }),
  );
}

// Функция для очистки старых favicon
function cleanupFaviconCache() {
  if (faviconCache.size > MAX_FAVICON_CACHE) {
    // Получаем все ключи и сортируем их по времени добавления
    const keys = Array.from(faviconCache.keys());
    // Удаляем старые записи, оставляя только MAX_FAVICON_CACHE самых новых
    const keysToDelete = keys.slice(0, keys.length - MAX_FAVICON_CACHE);
    keysToDelete.forEach((key) => faviconCache.delete(key));
  }
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

async function acquireView(tabId) {
  let view = viewPool.find((v) => !viewInUse.get(v));

  if (!view) {
    if (viewPool.length < POOL_SIZE) {
      view = await createPooledView(viewPool.length);
      viewPool.push(view);
    } else {
      const lru = viewPool.shift();
      win.removeBrowserView(lru);
      viewInUse.delete(lru);
      await releaseView(lru);
      attachViewListeners(lru);
      viewPool.push(lru);
      view = lru;
    }
  }

  view._tabId = tabId;
  viewInUse.set(view, true);
  return view;
}

async function releaseView(view) {
  if (!view) return;

  try {
    // view.webContents.forcefullyCrashRenderer();

    view.webContents.stop();

    // view.webContents.setAudioMuted(true);

    await Promise.all([
      view.webContents.session.clearCache(),
      view.webContents.session.clearStorageData({
        storages: [
          'cache',
          'cookies',
          'filesystem',
          'indexDB',
          'localStorage',
          'mediaKeys',
        ],
      }),
    ]);
    await view.webContents.loadURL('about:blank');
    console.log('adasdasdadadasdasd');
    const tpl = join(__dirname, 'dist', 'tab-content.html');
    if (existsSync(tpl)) {
      await view.webContents.loadFile(tpl);
    }

    view.webContents.removeAllListeners();

    viewInUse.set(view, false);
  } catch (error) {
    console.error('Error releasing view:', error);
  }
}

function getCurrentView() {
  if (!activeTabId) return null;
  return views.get(activeTabId) || null;
}

function createWindow() {
  // const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    frame: false,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
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
      hardwareAcceleration: true,
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
  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (
      input.type === 'keyDown' &&
      input.control &&
      input.shift &&
      input.code === 'keyI'
    ) {
      event.preventDefault();
    }
  });

  // const resizeHandler = () => {
  //   const v = getCurrentView();
  //   if (!v) return;
  //   const { width, height } = win.getContentBounds();
  //   v.setBounds({
  //     x: 0,
  //     y: Math.floor(headerHeight),
  //     width,
  //     height: Math.floor(height - headerHeight),
  //   });
  // };

  function resizeAll() {
    for (const v of views.values()) {
      updateViewBounds(v);
    }
  }

  const debouncedResizeAll = debounce(resizeAll, 20);

  [
    'resize',
    'enter-full-screen',
    'leave-full-screen',
    'maximize',
    'unmaximize',
  ].forEach((evt) => win.on(evt, debouncedResizeAll));

  win.on('focus', () => {
    const view = getCurrentView();
    if (view) {
      view.webContents.setBackgroundThrottling(false);
      view.webContents.setFrameRate(60);
    }
  });

  win.on('blur', () => {
    const view = getCurrentView();
    if (view) {
      view.webContents.setBackgroundThrottling(true);
      view.webContents.setFrameRate(5);
    }
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(1);
    win.webContents.setVisualZoomLevelLimits(1, 3);
  });

  // win.on('maximize', () => {
  //   win.webContents.send('window:isMaximized', true);
  // });

  // win.on('unmaximize', () => {
  //   win.webContents.send('window:isMaximized', false);
  // });

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

ipcMain.handle('window:openExternal', async (event, url) => {
  if (url && typeof url === 'string' && url.startsWith('http')) {
    await shell.openExternal(url);
  }
});

ipcMain.handle('window:bvLoadUrl', async (_e, url) => {
  if (!activeTabId) return { success: false, error: 'No active tab' };

  const view = views.get(activeTabId);
  if (!view) return { success: false, error: 'View for active tab not found' };

  try {
    if (url.startsWith('file://')) {
      const filePath = url.replace('file://', '');
      const normalized = path.normalize(filePath);
      if (!normalized.startsWith(path.resolve(__dirname, 'dist'))) {
        return { success: false, error: 'Access denied' };
      }
      const publicPath = join(__dirname, 'dist', filePath);
      if (existsSync(publicPath)) {
        await view.webContents.loadFile(publicPath);
        return { success: true };
      }
    }
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
    view.webContents.removeAllListeners();
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
  if (views.has(id)) {
    return { success: false, error: 'Tab already exists' };
  }
  const view = await acquireView(id);
  views.set(id, view);

  activeTabId = activeTabId ?? id;
  setActiveView(view);
  updateViewBounds(view);

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
  setActiveView(newV);
  updateViewBounds(newV);
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
    setActiveView(nv);
    updateViewBounds(nv);
    win.webContents.send('tabSwitched', next);
  }
});

// ------------------------------- //

// --------- Работа с окнами ---------- //
// 1. Назад
ipcMain.on('window:bvGoBack', () => {
  const view = getCurrentView();
  if (view && view.webContents.navigationHistory.canGoBack()) {
    view.webContents.navigationHistory.goBack();
  }
});

// 2. Вперед
ipcMain.on('window:bvGoForward', () => {
  const view = getCurrentView();
  if (view && view.webContents.navigationHistory.canGoForward()) {
    view.webContents.navigationHistory.goForward();
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

  const modal = new BrowserWindow({
    width: 500,
    height: 400,
    modal: true,
    parent: mainWindow,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload-update.js'),
    },
  });

  modal.loadFile('update-modal.html');
  modal.once('ready-to-show', () => {
    modal.webContents.send('update-info', info); 
    modal.show();
  });
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
    autoUpdater.checkForUpdatesAndNotify();
    // setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 2000);
    createWindow();
    faviconSession = session.defaultSession;
    // setTimeout(() => initViewPool(), 1000);
    initViewPool();
    // contextMenu({ showInspectElement: isDev });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
