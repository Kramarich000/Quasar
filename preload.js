const { contextBridge, ipcRenderer } = require('electron');

const allowedChannels = {
  minimize: {
    type: 'send',
    validate: (arg) => arg === undefined || arg === null, // без аргументов
  },
  maximize: {
    type: 'send',
    validate: (arg) => arg === undefined || arg === null,
  },
  close: {
    type: 'send',
    validate: (arg) => arg === undefined || arg === null,
  },
  goBack: {
    type: 'send',
    validate: (arg) => arg === undefined || arg === null,
  },
  goForward: {
    type: 'send',
    validate: (arg) => arg === undefined || arg === null,
  },
  reload: {
    type: 'send',
    validate: (arg) => arg === undefined || arg === null,
  },
  toggleMaximize: {
    type: 'invoke',
    validate: (arg) => arg === undefined || arg === null,
  },
  detachTab: {
    type: 'invoke',
    validate: (arg) =>
      typeof arg === 'number' && Number.isInteger(arg) && arg >= 0,
  },
  'history-add': {
    type: 'send',
    validate: (arg) =>
      typeof arg === 'object' &&
      arg !== null &&
      typeof arg.url === 'string' &&
      typeof arg.title === 'string',
  },
  'get-history': {
    type: 'invoke',
    validate: (arg) => arg === undefined || arg === null,
  },
  createIncognitoWindow: {
    type: 'send',
    validate: (arg) =>
      typeof arg === 'object' && arg !== null && typeof arg.url === 'string', //
  },
  on: {
    type: 'on',
    validate: (arg) => typeof arg === 'string',
  },
  isIncognito: {
    type: 'invoke',
    validate: (arg) => arg === undefined || arg === null,
  },
  'open-external-url': {
    type: 'send',
    validate: (arg) => typeof arg === 'string' && arg.startsWith('http'),
  },
};

const safeApi = {};

for (const [channel, config] of Object.entries(allowedChannels)) {
  if (config.type === 'send') {
    safeApi[channel] = (arg) => ipcRenderer.send(`window-${channel}`, arg);
  } else if (config.type === 'invoke') {
    safeApi[channel] = (arg) => ipcRenderer.invoke(`window-${channel}`, arg);
  }
}
safeApi.on = (channel, callback) => {
  const allowedListenChannels = ['init-tab-url', 'security-status'];
  if (allowedListenChannels.includes(channel)) {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  }
};

safeApi.isIncognito = process.argv.includes('--incognito');

safeApi.navigatorSpoof = {
  override: () => {
    try {
      delete navigator.__proto__.userAgent;
      delete navigator.__proto__.vendor;
      delete navigator.__proto__.platform;

      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        configurable: false,
        writable: false,
      });

      Object.defineProperty(navigator, 'vendor', {
        value: 'Google Inc.',
        configurable: false,
        writable: false,
      });

      Object.defineProperty(window, 'chrome', {
        value: {
          runtime: {},
          app: {
            isInstalled: true,
          },
          csi: () => ({ onloadT: Date.now() }),
        },
        configurable: false,
        writable: false,
        enumerable: false,
      });

      Object.defineProperty(navigator, 'platform', {
        value: 'Win64',
        configurable: false,
        writable: false,
      });

      Object.defineProperty(navigator, 'appVersion', {
        value:
          '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        configurable: false,
        writable: false,
      });
    } catch (e) {
      console.error('Ошибка при подмене navigator:', e);
    }
  },
};

safeApi.freezeTab = (webContentsId) => ipcRenderer.send('freeze-tab', webContentsId);
safeApi.unfreezeTab = (webContentsId) => ipcRenderer.send('unfreeze-tab', webContentsId);


contextBridge.exposeInMainWorld('api', safeApi);
