import { app } from 'electron';
app.commandLine.appendSwitch('enable-pinch-zoom');
app.commandLine.appendSwitch('enable-features', 'PinchZoom');

import { BrowserWindow, ipcMain, dialog, shell, session } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import pkg from 'electron-updater';
import path from 'path';
import { EventEmitter } from 'events';
const { autoUpdater } = pkg;
import contextMenu from 'electron-context-menu';
import createBrowserView from './createBrowserView.js';
import { historyManager } from './src/utils/historyManager.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

ipcMain.setMaxListeners(0);
EventEmitter.defaultMaxListeners = 0;

const isDev =
  process.env.NODE_ENV === 'development' ||
  !existsSync(join(__dirname, 'dist', 'index.html'));

let mainWindow;
let incognitoWindow;
let activeWindow = null;

let win = null;

let modal = null;

let headerHeight = 84.86;
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 900;
const MIN_WIDTH = 800;
const MIN_HEIGHT = 800;

const mainViews = new Map();
const incognitoViews = new Map();
let activeTabId = null;

const POOL_SIZE = 25;
const viewPool = [];
const viewInUse = new Map();
const faviconCache = new Map();
const MAX_FAVICON_CACHE = 50;
let faviconSession;

let suggestionsWindow = null;

function setActiveWindow(window) {
  if (!window || window.isDestroyed()) {
    console.warn('setActiveWindow: Invalid window');
    return;
  }
  activeWindow = window;
  win = window;

  // Обновляем флаги инкогнито для всех view
  const views = window === mainWindow ? mainViews : incognitoViews;
  const isIncognito = window === incognitoWindow;
  
  for (const view of views.values()) {
    if (view && !view.webContents.isDestroyed()) {
      view._isIncognito = isIncognito;
      console.log('Updated view incognito flag:', { 
        tabId: view._tabId, 
        isIncognito,
        windowId: window.id
      });
    }
  }
}

function getCurrentView() {
  if (!activeTabId) return null;
  if (!activeWindow || activeWindow.isDestroyed()) {
    console.warn('getCurrentView: No valid active window');
    return null;
  }

  const views = activeWindow === mainWindow ? mainViews : incognitoViews;
  const view = views.get(activeTabId);

  if (!view) return null;
  try {
    if (view.webContents && !view.webContents.isDestroyed()) {
      return view;
    }
  } catch (err) {
    console.warn('View validation failed:', err);
  }
  return null;
}

function setActiveView(view) {
  if (!view) {
    console.warn('setActiveView: view is null');
    return;
  }

  if (!activeWindow || activeWindow.isDestroyed()) {
    console.warn('setActiveView: No valid active window');
    return;
  }

  const old = getCurrentView();
  if (old && old !== view) {
    try {
      activeWindow.removeBrowserView(old);
    } catch (err) {
      console.warn('Failed to remove old view:', err);
    }
  }

  try {
    activeWindow.setBrowserView(view);
    updateViewBounds(view);
  } catch (err) {
    console.warn('Failed to set new view:', err);
  }
}

function updateViewBounds(view) {
  if (!view) {
    console.warn('updateViewBounds: view is null');
    return;
  }

  const currentWindow = BrowserWindow.getFocusedWindow();
  if (!currentWindow || currentWindow.isDestroyed()) {
    console.warn('updateViewBounds: No valid focused window');
    return;
  }

  try {
    const { width, height } = currentWindow.getContentBounds();
    const bounds = {
      x: 0,
      y: Math.floor(headerHeight),
      width,
      height: Math.floor(height - headerHeight),
    };

    // Проверяем, что размеры действительно изменились
    const currentBounds = view.getBounds();
    if (
      currentBounds.width !== bounds.width ||
      currentBounds.height !== bounds.height ||
      currentBounds.y !== bounds.y
    ) {
      view.setBounds(bounds);
    }
  } catch (err) {
    console.warn('Failed to update view bounds:', err);
  }
}

function resizeAll() {
  const currentWindow = BrowserWindow.getFocusedWindow();
  if (!currentWindow) return;

  const views = currentWindow === mainWindow ? mainViews : incognitoViews;
  for (const view of views.values()) {
    if (view) {
      updateViewBounds(view);
    }
  }
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

  if (view?.webContents) {
    view.webContents.on('did-start-loading', () => {
      if (
        win?.webContents &&
        !win.webContents.isDestroyed() &&
        view?._tabId != null
      ) {
        win.webContents.send('bvDidStartLoading', { tabId: view._tabId });
        win.webContents.send('loadProgress', { progress: 0 });
      }
    });

    view.webContents.on('did-progress', (_e, progress) => {
      if (
        win?.webContents &&
        !win.webContents.isDestroyed() &&
        typeof progress === 'number'
      ) {
        win.webContents.send('loadProgress', { progress });
      }
    });

    view.webContents.on('did-stop-loading', () => {
      if (
        win?.webContents &&
        !win.webContents.isDestroyed() &&
        view?._tabId != null
      ) {
        win.webContents.send('bvDidStopLoading', { tabId: view._tabId });
        win.webContents.send('loadProgress', { progress: 1 });
      }
    });

    view.webContents.on('ready-to-show', () => {
      if (
        win?.webContents &&
        !win.webContents.isDestroyed() &&
        view?._tabId != null
      ) {
        win.webContents.send('bvDomReady', view._tabId);
      }
    });

    view.webContents.on('page-title-updated', (_e, title) => {
      if (
        win?.webContents &&
        !win.webContents.isDestroyed() &&
        view?._tabId != null &&
        typeof title === 'string'
      ) {
        win.webContents.send('tabTitleUpdated', { id: view._tabId, title });
      }
    });

    view.webContents.on('did-finish-load', () => {
      const url = view.webContents.getURL();
      const title = view.webContents.getTitle();

      if (url && !url.startsWith('about:') && !url.startsWith('file:')) {
        if (!view._isIncognito) {
          console.log('[History] Страница загружена, добавление в историю:', { url, title });
          try {
            historyManager.addEntry(url, title);
            console.log('[History] Запись успешно добавлена после загрузки');
          } catch (error) {
            console.error('[History] Ошибка при добавлении записи после загрузки:', error);
          }
        } else {
          console.log('[History] Пропуск записи в историю - режим инкогнито');
        }
      }
    });

    view.webContents.on('page-favicon-updated', async (_e, favicons) => {
      if (!favicons?.length) {
        if (win?.webContents && !win.webContents.isDestroyed() && view?._tabId != null) {
          win.webContents.send('tabFaviconUpdated', { id: view._tabId, favicon: null });
        }
        return;
      }

      const url = view.webContents.getURL();
      const title = view.webContents.getTitle();

      if (url && !url.startsWith('about:') && !url.startsWith('file:')) {
        try {
          const faviconUrl = new URL(favicons[0], url).href;
          console.log('Favicon updated:', {
            url,
            title,
            favicon: faviconUrl,
          });
          
          if (win?.webContents && !win.webContents.isDestroyed() && view?._tabId != null) {
            win.webContents.send('tabFaviconUpdated', { id: view._tabId, favicon: faviconUrl });
          }
          
          if (!view._isIncognito) {
            historyManager.addEntry(url, title, faviconUrl);
          } else {
            console.log('Skipping history entry with favicon - incognito mode');
          }
        } catch (error) {
          console.error('Error processing favicon URL:', error);
          if (win?.webContents && !win.webContents.isDestroyed() && view?._tabId != null) {
            win.webContents.send('tabFaviconUpdated', { id: view._tabId, favicon: null });
          }
        }
      }
    });
  }

  view.webContents.on('did-navigate', (_e, url) => {
    if (win?.webContents?.send) {
      win.webContents.send('tabUrlUpdated', { id: view._tabId, url });
    }
    updateNavigationState(view);
  });

  view.webContents.on('did-navigate-in-page', (_e, url) => {
    if (win?.webContents?.send) {
      win.webContents.send('tabUrlUpdated', { id: view._tabId, url });
    }
    updateNavigationState(view);
  });
}

function updateNavigationState(view) {
  if (!view || !view.webContents || view.webContents.isDestroyed()) return;

  const canGoBack = view.webContents.canGoBack();
  const canGoForward = view.webContents.canGoForward();

  win.webContents.send('navigationStateChanged', {
    canGoBack,
    canGoForward,
  });
}

function cleanupFaviconCache() {
  if (faviconCache.size > MAX_FAVICON_CACHE) {
    const keys = Array.from(faviconCache.keys());
    const keysToDelete = keys.slice(0, keys.length - MAX_FAVICON_CACHE);
    keysToDelete.forEach((key) => faviconCache.delete(key));
  }
}

async function createPooledView(poolId) {
  const partition = `persist:pool-${poolId}`;
  const tabSession = session.fromPartition(partition, { cache: true });
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
    try {
      await view.webContents.loadFile(tpl);
    } catch (err) {
      console.warn('Failed to load tab-content.html:', err);
    }
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
  // Устанавливаем флаг инкогнито при создании view
  view._isIncognito = activeWindow === incognitoWindow;
  console.log('View created with incognito flag:', view._isIncognito);
  
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
    // console.log('adasdasdadadasdasd');
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

function createWindow() {
  mainWindow = new BrowserWindow({
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

  setActiveWindow(mainWindow);

  function resizeAll() {
    const currentWindow = BrowserWindow.getFocusedWindow();
    if (!currentWindow) return;

    const views = currentWindow === mainWindow ? mainViews : incognitoViews;
    for (const view of views.values()) {
      if (view) {
        updateViewBounds(view);
      }
    }
  }

  const debouncedResizeAll = debounce(resizeAll, 20);

  [
    'resize',
    'enter-full-screen',
    'leave-full-screen',
    'maximize',
    'unmaximize',
  ].forEach((evt) => mainWindow.on(evt, debouncedResizeAll));

  mainWindow.on('focus', () => {
    setActiveWindow(mainWindow);
    const view = getCurrentView();
    if (view) {
      setActiveView(view);
    }
  });

  mainWindow.on('blur', () => {});

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow.webContents) {
      mainWindow.webContents.setZoomFactor(1);
      mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
    }
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control) {
      const key = input.key.toLowerCase();

      if (['=', '+', '-', '0'].includes(key)) {
        event.preventDefault();
      }

      if (key === 'i' && input.shift) {
        event.preventDefault();
      }
    }

    if (input.type === 'mouseWheel' && input.control) {
      event.preventDefault();
    }
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:isMaximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:isMaximized', false);
  });

  mainWindow.on('closed', () => {
    if (activeWindow === mainWindow) {
      activeWindow = null;
      win = null;
    }
  });

  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  if (isDev) {
    mainWindow.loadFile(join(__dirname, 'dist', 'index.html'));
  } else {
    mainWindow.loadFile(join(__dirname, 'dist', 'index.html'));
  }
}

function createIncognitoWindow() {
  if (incognitoWindow && !incognitoWindow.isDestroyed()) {
    incognitoWindow.focus();
    return;
  }

  incognitoWindow = new BrowserWindow({
    frame: false,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    transparent: false,
    backgroundColor: '#FFFFFF',
    show: false,
    webPreferences: {
      partition: 'temp:incognito-' + Date.now(),
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
      additionalArguments: ['--incognito'],
    },
  });

  setActiveWindow(incognitoWindow);

  function resizeAll() {
    const currentWindow = BrowserWindow.getFocusedWindow();
    if (!currentWindow || currentWindow.isDestroyed()) return;

    const views = currentWindow === mainWindow ? mainViews : incognitoViews;
    for (const view of views.values()) {
      if (!view) continue;
      try {
        if (view.webContents && !view.webContents.isDestroyed()) {
          const { width, height } = currentWindow.getContentBounds();
          view.setBounds({
            x: 0,
            y: Math.floor(headerHeight),
            width,
            height: Math.floor(height - headerHeight),
          });
        }
      } catch (err) {
        console.warn('Failed to resize view:', err);
      }
    }
  }

  const debouncedResizeAll = debounce(resizeAll, 20);

  // Добавляем обработчики для всех событий изменения размера
  [
    'resize',
    'enter-full-screen',
    'leave-full-screen',
    'maximize',
    'unmaximize',
    'restore',
    'move',
    'moved',
  ].forEach((evt) => {
    incognitoWindow.on(evt, () => {
      // Принудительно вызываем ресайз без дебаунса для критических событий
      if (evt === 'maximize' || evt === 'unmaximize' || evt === 'restore') {
        resizeAll();
      } else {
        debouncedResizeAll();
      }
    });
  });

  // Добавляем обработчик изменения размера контента
  incognitoWindow.webContents.on('did-finish-load', () => {
    resizeAll();
  });

  // Добавляем обработчик изменения размера при фокусе
  incognitoWindow.on('focus', () => {
    setActiveWindow(incognitoWindow);
    const view = getCurrentView();
    if (view) {
      setActiveView(view);
      resizeAll(); // Принудительно обновляем размеры при фокусе
    }
  });

  incognitoWindow.on('blur', () => {
    // Remove background throttling
  });

  incognitoWindow.once('ready-to-show', () => {
    incognitoWindow.show();
    incognitoWindow.focus();
  });

  incognitoWindow.webContents.on('did-finish-load', () => {
    if (incognitoWindow.webContents) {
      incognitoWindow.webContents.setZoomFactor(1);
      incognitoWindow.webContents.setVisualZoomLevelLimits(1, 1);
    }
  });

  incognitoWindow.on('closed', () => {
    if (activeWindow === incognitoWindow) {
      activeWindow = null;
      win = null;
    }
    incognitoWindow = null;
    incognitoViews.clear();
  });

  // incognitoWindow.webContents.openDevTools({ mode: 'detach' });

  if (isDev) {
    incognitoWindow.loadFile(join(__dirname, 'dist', 'index.html'));
  } else {
    incognitoWindow.loadFile(join(__dirname, 'dist', 'index.html'));
  }
}

ipcMain.handle('window:createIncognitoWindow', async () => {
  if (incognitoWindow && !incognitoWindow.isDestroyed()) {
    incognitoWindow.focus();
    return;
  }

  createIncognitoWindow();
  if (mainWindow) {
    mainWindow.blur();
  }
});

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

  const view = getCurrentView();
  if (!view) return { success: false, error: 'View for active tab not found' };

  // Проверяем инкогнито режим в начале загрузки
  const isIncognito = activeWindow === incognitoWindow;
  console.log('Loading URL in mode:', isIncognito ? 'incognito' : 'normal');

  try {
    if (url.startsWith('file://')) {
      const filePath = url.replace('file://', '');
      const normalized = path.normalize(filePath);

      // Разрешаем загрузку history.html
      if (filePath === 'history.html') {
        const historyPath = join(__dirname, 'dist', 'history.html');
        console.log('Loading history.html from:', historyPath);

        if (!existsSync(historyPath)) {
          console.error('history.html not found at:', historyPath);
          return { success: false, error: 'history.html not found' };
        }

        try {
          await view.webContents.loadFile(historyPath);
          console.log('history.html loaded successfully');
          return { success: true };
        } catch (error) {
          console.error('Failed to load history.html:', error);
          return { success: false, error: error.message };
        }
      }

      // Для остальных файлов проверяем доступ к dist
      if (!normalized.startsWith(path.resolve(__dirname, 'dist'))) {
        return { success: false, error: 'Access denied' };
      }
      const publicPath = join(__dirname, 'dist', filePath);
      if (existsSync(publicPath)) {
        await view.webContents.loadFile(publicPath);
        return { success: true };
      }
    }

    // Устанавливаем флаг инкогнито для view
    view._isIncognito = isIncognito;
    
    await view.webContents.loadURL(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.on('bvDestroy', (_event, tabId) => {
  const view = getCurrentView();
  if (view) {
    win.removeBrowserView(view);
    view.webContents.destroy();
    view.webContents.removeAllListeners();
    if (activeWindow === mainWindow) {
      mainViews.delete(tabId);
    } else if (activeWindow === incognitoWindow) {
      incognitoViews.delete(tabId);
    }

    if (activeTabId === tabId) {
      activeTabId = null;
    }
  }
});

// --------- Работа с табами ---------- //
// 1. Создание таба //
ipcMain.handle('window:bvCreateTab', async (_e, { id, url }) => {
  const currentWindow = BrowserWindow.getFocusedWindow();
  if (!currentWindow || currentWindow.isDestroyed()) {
    return { success: false, error: 'No valid active window' };
  }

  const views = currentWindow === mainWindow ? mainViews : incognitoViews;

  if (views.has(id)) {
    return { success: false, error: 'Tab already exists' };
  }

  try {
    const view = await acquireView(id);
    if (!view) {
      return { success: false, error: 'Failed to create view' };
    }

    views.set(id, view);
    activeTabId = activeTabId ?? id;
    setActiveView(view);

    if (url && url.trim()) {
      try {
        await view.webContents.loadURL(url);
      } catch (err) {
        console.error('Failed to load URL in pooled view:', err);
      }
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to create tab:', err);
    return { success: false, error: err.message };
  }
});

// 2. Смена таба //
ipcMain.handle('window:bvSwitchTab', (_e, id) => {
  if (id === activeTabId) return;

  const currentWindow = BrowserWindow.getFocusedWindow();
  if (!currentWindow || currentWindow.isDestroyed()) {
    console.warn('bvSwitchTab: No valid focused window');
    return;
  }

  const views = currentWindow === mainWindow ? mainViews : incognitoViews;
  if (!views.has(id)) {
    console.warn('bvSwitchTab: Tab not found');
    return;
  }

  try {
    const newV = views.get(id);
    if (!newV || !newV.webContents || newV.webContents.isDestroyed()) {
      console.warn('bvSwitchTab: Invalid view');
      return;
    }

    setActiveView(newV);
    activeTabId = id;
    currentWindow.webContents.send('tabSwitched', id);
  } catch (err) {
    console.error('Failed to switch tab:', err);
  }
});

// 3. Закрытие таба //
ipcMain.on('window:closeTab', async (_e, id) => {
  const currentWindow = BrowserWindow.getFocusedWindow();
  if (!currentWindow || currentWindow.isDestroyed()) {
    console.warn('closeTab: No valid focused window');
    return;
  }

  const views = currentWindow === mainWindow ? mainViews : incognitoViews;
  const view = views.get(id);
  if (!view) {
    console.warn('closeTab: Tab not found');
    return;
  }

  try {
    views.delete(id);
    if (activeTabId === id) activeTabId = null;

    await releaseView(view);

    const next = Array.from(views.keys())[0];
    if (next) {
      activeTabId = next;
      const nv = views.get(next);
      if (nv && nv.webContents && !nv.webContents.isDestroyed()) {
        setActiveView(nv);
        currentWindow.webContents.send('tabSwitched', next);
      }
    }
  } catch (err) {
    console.error('Failed to close tab:', err);
  }
});

// ------------------------------- //

// --------- Работа с окнами ---------- //
// 1. Назад
ipcMain.handle('window:bvGoBack', async () => {
  const view = getCurrentView();
  if (view && view.webContents.canGoBack()) {
    // Сохраняем контекст окна
    const viewWindow = activeWindow;
    
    console.log('Navigating back...');
    view.webContents.goBack();
    
    // Ждем завершения навигации
    view.webContents.once('did-finish-load', () => {
      const url = view.webContents.getURL();
      const title = view.webContents.getTitle();
      console.log('Navigation complete:', { url, title });
      
      if (url && !url.startsWith('about:') && !url.startsWith('file:')) {
        // Используем сохраненный контекст окна
        if (viewWindow !== incognitoWindow) {
          console.log('Adding to history after back navigation');
          historyManager.addEntry(url, title);
        } else {
          console.log('Skipping history entry - incognito mode');
        }
      }
    });
  }
});

// 2. Вперед
ipcMain.handle('window:bvGoForward', async () => {
  const view = getCurrentView();
  if (view && view.webContents.canGoForward()) {
    // Сохраняем контекст окна
    const viewWindow = activeWindow;
    
    console.log('Navigating forward...');
    view.webContents.goForward();
    
    // Ждем завершения навигации
    view.webContents.once('did-finish-load', () => {
      const url = view.webContents.getURL();
      const title = view.webContents.getTitle();
      console.log('Navigation complete:', { url, title });
      
      if (url && !url.startsWith('about:') && !url.startsWith('file:')) {
        // Используем сохраненный контекст окна
        if (viewWindow !== incognitoWindow) {
          console.log('Adding to history after forward navigation');
          historyManager.addEntry(url, title);
        } else {
          console.log('Skipping history entry - incognito mode');
        }
      }
    });
  }
});

// 3. Перезагрузка
ipcMain.handle('window:bvReload', async () => {
  const view = getCurrentView();
  if (view) {
    view.webContents.reload();
  }
});

// 4. Остановка загрузки
ipcMain.handle('window:bvStopLoading', async () => {
  const view = getCurrentView();
  if (view) {
    view.webContents.stop();
  }
});

// ------------------------------- //

// --------- Работа с окном браузера --------- //
// 1. Свернуть
ipcMain.on('window:minimize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    window.minimize();
  }
});
// 2. Закрыть
ipcMain.on('window:close', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window) {
    window.close();
  }
});

// 3. Полноэкранный/оконный режим
ipcMain.handle('window:toggleMaximize', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return false;

  if (window.isMaximized()) {
    window.unmaximize();
    return false;
  } else {
    window.maximize();
    return true;
  }
});

// 4. Адаптивное вычисление шапки
ipcMain.on('window:setHeaderHeight', (_event, newHeaderHeight) => {
  if (typeof newHeaderHeight !== 'number' || newHeaderHeight < 0) return;
  console.log('Новая высота заголовка:', newHeaderHeight);
  headerHeight = newHeaderHeight;

  const currentWindow = BrowserWindow.getFocusedWindow();
  if (!currentWindow || currentWindow.isDestroyed()) return;

  const views = currentWindow === mainWindow ? mainViews : incognitoViews;
  for (const view of views.values()) {
    if (!view) continue;
    try {
      if (view.webContents && !view.webContents.isDestroyed()) {
        updateViewBounds(view);
      }
    } catch (err) {
      console.warn(
        'Failed to update view bounds after header height change:',
        err,
      );
    }
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

  modal = new BrowserWindow({
    width: 500,
    title: 'Обновление',
    height: 400,
    modal: true,
    parent: win,
    devTools: false,
    show: false,
    backgroundColor: '#1e293b',
    frame: false,
    resizable: false,
    center: true,
    skipTaskbar: true,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, 'preload.js'),
    },
  });

  modal.setMenu(null);
  modal.setResizable(false);
  modal.loadFile(join(__dirname, 'dist', 'update-modal.html'));

  modal.once('ready-to-show', () => {
    modal.webContents.send('onUpdateInfo', info);
    modal.show();
    win.focus();
  });
});

ipcMain.on('window:installUpdate', () => {
  if (modal && !modal.isDestroyed()) modal.close();

  autoUpdater.quitAndInstall(true, true);
});

ipcMain.on('window:deferUpdate', () => {
  if (modal && !modal.isDestroyed()) modal.close();
});

autoUpdater.on('error', (err) => console.error('Ошибка обновления', err));

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function openFakeUpdateModal() {
  modal = new BrowserWindow({
    width: 500,
    title: 'Обновление',
    height: 400,
    modal: true,
    parent: win,
    devTools: false,
    show: false,
    backgroundColor: '#1e293b',
    frame: false,
    resizable: false,
    // center: true,
    skipTaskbar: true,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    // alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, 'preload.js'),
    },
  });

  modal.loadFile(path.join(__dirname, 'dist', 'update-modal.html'));

  modal.webContents.once('did-finish-load', () => {
    const fakeUpdateInfo = {
      version: '2.1.3',
      releaseDate: new Date().toISOString(),
      releaseNotes: [
        'Добавлена поддержка drag-and-drop.',
        'Исправлены баги с отображением темной темы.',
        'Обновлены зависимости.',
      ],
    };

    modal.webContents.send('onUpdateInfo', fakeUpdateInfo);
    modal.show();
  });
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      setActiveWindow(mainWindow);
    }
  });

  app.whenReady().then(async () => {
    autoUpdater.checkForUpdatesAndNotify();
    // setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 2000);
    createWindow();
    // openFakeUpdateModal();
    faviconSession = session.defaultSession;
    // setTimeout(() => initViewPool(), 1000);
    initViewPool();
    // contextMenu({ showInspectElement: isDev });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

function createSuggestionsWindow() {
  if (suggestionsWindow) {
    suggestionsWindow.destroy();
  }

  suggestionsWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
    },
  });

  suggestionsWindow.loadFile(join(__dirname, 'dist', 'suggestions.html'));
  suggestionsWindow.setVisibleOnAllWorkspaces(true);
  suggestionsWindow.setAlwaysOnTop(true, 'floating');
  suggestionsWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });
  suggestionsWindow.setFocusable(false);
  suggestionsWindow.setHasShadow(false);
  suggestionsWindow.setBackgroundColor('#00000000');
}

ipcMain.on('showSuggestions', (event, { bounds, suggestions }) => {
  if (!suggestionsWindow) {
    createSuggestionsWindow();
  }

  suggestionsWindow.setBounds(bounds);
  suggestionsWindow.show();
  suggestionsWindow.webContents.send('updateSuggestions', suggestions);
});

ipcMain.on('hideSuggestions', () => {
  if (suggestionsWindow) {
    suggestionsWindow.hide();
  }
});

ipcMain.on('updateSuggestions', (event, suggestions) => {
  if (suggestionsWindow) {
    suggestionsWindow.webContents.send('updateSuggestions', suggestions);
  }
});

ipcMain.on('suggestionSelected', (event, suggestion) => {
  win.webContents.send('suggestionSelected', suggestion);
  if (suggestionsWindow) {
    suggestionsWindow.hide();
  }
});

// Обработчики истории
function isIncognitoMode() {
  const currentWindow = BrowserWindow.getFocusedWindow();
  if (!currentWindow) {
    console.log('[History] Нет активного окна');
    return false;
  }
  
  const isIncognito = currentWindow === incognitoWindow;
  console.log('[History] Проверка инкогнито:', {
    isIncognito,
    currentWindowId: currentWindow.id,
    incognitoWindowId: incognitoWindow?.id,
    currentWindowDestroyed: currentWindow.isDestroyed(),
    incognitoWindowDestroyed: incognitoWindow?.isDestroyed()
  });
  
  return isIncognito;
}

ipcMain.handle('window:isIncognito', () => {
  return isIncognitoMode();
});

ipcMain.on('window:historyAdd', (_event, { url, title, favicon }) => {
  console.log('[History] Получено событие добавления в историю:', { url, title, favicon });
  
  if (!url || url.startsWith('about:') || url.startsWith('file:')) {
    console.log('[History] Пропуск записи - недопустимый URL');
    return;
  }

  if (isIncognitoMode()) {
    console.log('[History] Пропуск записи - режим инкогнито');
    return;
  }

  try {
    historyManager.addEntry(url, title, favicon);
    console.log('[History] Запись успешно добавлена');
  } catch (error) {
    console.error('[History] Ошибка при добавлении записи:', error);
  }
});

ipcMain.handle('window:getHistory', () => {
  console.log('Get history request received');
  const history = historyManager.getHistory();
  console.log('Returning history:', history.length, 'items');
  return history;
});

ipcMain.on('window:clearHistory', () => {
  console.log('Clear history request received');
  historyManager.clearHistory();
});

ipcMain.on('window:removeHistoryEntry', (_event, id) => {
  console.log('Remove history entry request received:', id);
  historyManager.removeEntry(id);
});

// Обработчик изменения URL
ipcMain.on('window:changeUrl', async (event, url) => {
  console.log('URL change requested:', url);
  const view = getCurrentView();
  if (view) {
    try {
      await view.webContents.loadURL(url);
      console.log('URL loaded successfully:', url);

      view.webContents.once('did-finish-load', () => {
        const title = view.webContents.getTitle();
        console.log('Page loaded, title:', title);

        view.webContents.once('page-favicon-updated', async (_e, favicons) => {
          console.log('Favicons received:', favicons);
          let favicon = null;

          if (favicons && favicons.length > 0) {
            try {
              const faviconUrl = new URL(favicons[0], url).href;
              console.log('Favicon URL:', faviconUrl);
              favicon = faviconUrl;
            } catch (error) {
              console.error('Error processing favicon URL:', error);
            }
          }

          if (url && !url.startsWith('about:') && !url.startsWith('file:')) {
            if (!isIncognitoMode()) {
              console.log('Adding to history:', { url, title, favicon });
              historyManager.addEntry(url, title, favicon);
            } else {
              console.log('Skipping history entry - incognito mode');
            }
          }
        });
      });
    } catch (error) {
      console.error('Error loading URL:', error);
    }
  }
});

// Обработчик клика по ссылке
ipcMain.on('window:linkClicked', async (event, url) => {
  console.log('Link clicked:', url);
  const view = getCurrentView();
  if (view) {
    try {
      await view.webContents.loadURL(url);
      console.log('Link URL loaded successfully:', url);

      view.webContents.once('did-finish-load', () => {
        const title = view.webContents.getTitle();
        console.log('Page loaded, title:', title);

        view.webContents.once('page-favicon-updated', async (_e, favicons) => {
          console.log('Favicons received:', favicons);
          let favicon = null;

          if (favicons && favicons.length > 0) {
            try {
              const faviconUrl = new URL(favicons[0], url).href;
              console.log('Favicon URL:', faviconUrl);
              favicon = faviconUrl;
            } catch (error) {
              console.error('Error processing favicon URL:', error);
            }
          }

          if (url && !url.startsWith('about:') && !url.startsWith('file:')) {
            if (!isIncognitoMode()) {
              console.log('Adding to history:', { url, title, favicon });
              historyManager.addEntry(url, title, favicon);
            } else {
              console.log('Skipping history entry - incognito mode');
            }
          }
        });
      });
    } catch (error) {
      console.error('Error loading link URL:', error);
    }
  }
});

// Обработчик для открытия URL в активной вкладке
ipcMain.on('window:openExternalUrl', async (_event, url) => {
  console.log('Opening URL in active tab:', url);
  const view = getCurrentView();
  if (view) {
    try {
      await view.webContents.loadURL(url);
      console.log('URL loaded successfully:', url);
    } catch (error) {
      console.error('Error loading URL:', error);
    }
  }
});
