const { contextBridge, ipcRenderer } = require('electron');

const allowedChannels = {
  minimize: { type: 'send' },
  maximize: { type: 'send' },
  close: { type: 'send' },
  goBack: { type: 'send' },
  goForward: { type: 'send' },
  reload: { type: 'send' },
  toggleMaximize: { type: 'invoke' },
  'history-add': { type: 'send' },
  'get-history': { type: 'invoke' },
};

const safeApi = {};

for (const [channel, config] of Object.entries(allowedChannels)) {
  if (config.type === 'send') {
    safeApi[channel] = (arg) => ipcRenderer.send(`window-${channel}`, arg);
  } else if (config.type === 'invoke') {
    safeApi[channel] = () => ipcRenderer.invoke(`window-${channel}`);
  }
}

contextBridge.exposeInMainWorld('api', safeApi);
