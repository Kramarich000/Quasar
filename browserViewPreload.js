const { contextBridge, ipcRenderer } = require('electron');

const allowedChannels = {
  getHistory: { type: 'invoke' },
  clearHistory: { type: 'send' },
  removeHistoryEntry: { type: 'send' },
  openExternalUrl: { type: 'send' },
};

const safeApi = {};

for (const [channel, config] of Object.entries(allowedChannels)) {
  const eventName = `window:${channel}`;
  if (config.type === 'send') {
    safeApi[channel] = (arg) => ipcRenderer.send(eventName, arg);
  } else if (config.type === 'invoke') {
    safeApi[channel] = (arg) => ipcRenderer.invoke(eventName, arg);
  }
}

contextBridge.exposeInMainWorld('api', safeApi); 