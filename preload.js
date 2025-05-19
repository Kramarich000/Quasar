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
  const allowedListenChannels = ['init-tab-url', 'security-status']; // сюда добавляй свои каналы
  if (allowedListenChannels.includes(channel)) {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  }
};

safeApi.isIncognito = process.argv.includes('--incognito');

contextBridge.exposeInMainWorld('api', safeApi);
