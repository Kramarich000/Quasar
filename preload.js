const { contextBridge, ipcRenderer } = require('electron');

const allowedChannels = {
  minimize: { type: 'send' },
  maximize: { type: 'send' },
  close: { type: 'send' },
  goBack: { type: 'send' },
  goForward: { type: 'send' },
  reload: { type: 'send' },
  toggleMaximize: { type: 'invoke' },
  detachTab: { type: 'invoke' },
  'history-add': { type: 'send' },
  'get-history': { type: 'invoke' },
  createIncognitoWindow: { type: 'send' },
  on: { type: 'on' },
  isIncognito: { type: 'invoke' },
  'open-external-url': { type: 'send' },
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

contextBridge.exposeInMainWorld('api', safeApi);
