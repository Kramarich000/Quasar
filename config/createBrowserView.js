import { BrowserView, Menu } from 'electron';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generateId = () => {
  return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
};

export default function createBrowserView(options = {}, win) {
  let id = generateId();
  const uniquePartition = `persist:tab-${id}`;
  const defaultWebPreferences = {
    contextIsolation: true,
    titleBarStyle: 'default',
    sandbox: true,
    devTools: true,
    nodeIntegration: false,
    enableRemoteModule: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    zoomable: true,
    zoomFactor: 1.0,
    partition: uniquePartition,
    backgroundThrottling: false,
    enableWebGL: true,
    enableAccelerated2dCanvas: true,
    enableAcceleratedLayers: true,
    enableAcceleratedVideo: true,
    enableAcceleratedVideoDecode: true,
    enableAcceleratedVideoEncode: true,
    enableAcceleratedCompositing: true,
    spellcheck: false,
    plugins: false,
    experimentalFeatures: false,
    cache: true,
    javascript: true,
    images: true,
    textAreasAreResizable: false,
    webgl: true,
    defaultEncoding: 'UTF-8',
    defaultFontSize: 16,
    defaultMonospaceFontSize: 13,
    minimumFontSize: 0,
    defaultFontFamily: {
      standard: 'Arial',
      serif: 'Times New Roman',
      sansSerif: 'Arial',
      monospace: 'Courier New'
    }
  };

  const webPreferences = {
    ...defaultWebPreferences,
    ...options.webPreferences,
  };

  const view = new BrowserView({ webPreferences });
  
  // Настройка сессии
  const ses = view.webContents.session;
  
  // Очищаем все данные сессии при создании
  ses.clearCache();
  ses.clearStorageData({
    storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
  });

  // Добавляем обработчик начала загрузки
  view.webContents.on('did-start-loading', () => {
    // Очищаем DOM только если это about:blank
    const currentUrl = view.webContents.getURL();
    if (currentUrl === 'about:blank') {
      view.webContents.executeJavaScript(`
        while (document.body.firstChild) {
          document.body.removeChild(document.body.firstChild);
        }
        while (document.head.firstChild) {
          document.head.removeChild(document.head.firstChild);
        }
      `).catch(console.error);
    }
  });

  // Добавляем обработчик готовности DOM
  view.webContents.on('dom-ready', () => {
    // Устанавливаем белый фон для пустых страниц
    view.webContents.executeJavaScript(`
      if (document.body.children.length === 0) {
        document.body.style.backgroundColor = 'white';
      }
    `).catch(console.error);
  });

  // Настройка разрешений
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'geolocation', 'notifications'];
    callback(allowedPermissions.includes(permission));
  });

  // Настройка обработки URL
  view.webContents.on('will-navigate', (event, url) => {
    // Проверяем только на валидность URL
    if (!/^https?:\/\//.test(url) && !/^[\w-]+(\.[\w-]+)+/.test(url)) {
      event.preventDefault();
      // Отправляем событие в основной процесс для обработки
      win.webContents.send('handleSearchQuery', url);
    }
  });

  view.webContents.on('did-finish-load', () => {
    view.webContents.setZoomFactor(1);
    view.webContents.setVisualZoomLevelLimits(1, 3);
  });

  // Обработка ошибок загрузки
  view.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorDescription);
  });

  // Обработка ошибок рендеринга
  view.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
  });

  // Открываем DevTools при создании вкладки
  // view.webContents.openDevTools();

  view.webContents.setZoomFactor(1);
  view.webContents.setVisualZoomLevelLimits(1, 3);

  view.webContents.on('before-input-event', (event, input) => {
    // Проверяем, что view и webContents существуют
    if (!view || !view.webContents || view.webContents.isDestroyed()) {
      return;
    }

    console.log('KeyDown event with control:', input.code); // Отладочное сообщение

    if (input.type === 'mouseWheel' && (input.control || input.meta)) {
      try {
        let z = view.webContents.getZoomFactor();
        if (input.deltaY < 0) {
          view.webContents.setZoomFactor(Math.min(z + 0.1, 3));
        } else if (input.deltaY > 0) {
          view.webContents.setZoomFactor(Math.max(z - 0.1, 1));
        }
        event.preventDefault();
      } catch (error) {
        console.error('Error handling zoom:', error);
      }
    }

    if (input.type === 'keyDown' && input.control) {
      try {
        let currentZoom = view.webContents.getZoomFactor();

        if (input.key === '=' || input.key === '+') {
          view.webContents.setZoomFactor(Math.min(currentZoom + 0.1, 3));
          event.preventDefault();
        } else if (input.key === '-') {
          view.webContents.setZoomFactor(Math.max(currentZoom - 0.1, 1));
          event.preventDefault();
        } else if (input.key === '0') {
          view.webContents.setZoomFactor(1);
          event.preventDefault();
        } else if (input.code === 'KeyI' && input.shift) {
          view.webContents.toggleDevTools();
          event.preventDefault();
        }
      } catch (error) {
        console.error('Error handling keyboard shortcuts:', error);
      }
    }
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Увеличить',
      click: () =>
        view.webContents.setZoomFactor(
          Math.min(view.webContents.getZoomFactor() + 0.1, 3),
        ),
    },
    {
      label: 'Уменьшить',
      click: () =>
        view.webContents.setZoomFactor(
          Math.max(view.webContents.getZoomFactor() - 0.1, 1),
        ),
    },
    { label: 'Сбросить', click: () => view.webContents.setZoomFactor(1) },
  ]);

  view.webContents.on('context-menu', (event, params) => {
    contextMenu.popup({
      window: win,
      x: params.x,
      y: params.y,
    });
  });

  return view;
}
