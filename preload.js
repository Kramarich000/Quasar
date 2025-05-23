const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  if (document.body.children.length === 0) {
    while (document.head.firstChild)
      document.head.removeChild(document.head.firstChild);
    while (document.body.firstChild)
      document.body.removeChild(document.body.firstChild);

    document.body.style.backgroundColor = 'white';
  }
});

const allowedChannels = {
  minimize: { type: 'send' },
  maximize: { type: 'send' },
  close: { type: 'send' },
  toggleMaximize: { type: 'invoke' },
  detachTab: { type: 'invoke' },
  historyAdd: { type: 'send' },
  getHistory: { type: 'invoke' },
  createIncognitoWindow: { type: 'send' },
  isIncognito: { type: 'invoke' },
  openExternalUrl: { type: 'send' },
  setHeaderHeight: { type: 'send' },

  bvGoBack: { type: 'send' },
  bvGoForward: { type: 'send' },
  bvReload: { type: 'send' },
  bvLoadUrl: { type: 'invoke' },
  bvDestroy: { type: 'send' },
  bvCreateTab: { type: 'invoke' },
  bvSwitchTab: { type: 'invoke' },
  bvCloseTab: { type: 'send' },

  freezeTab: { type: 'send' },
  unfreezeTab: { type: 'send' },
  spoofNavigator: { type: 'send' },
};

const allowedListenChannels = [
  'initTabUrl',
  'securityStatus',
  'bvDidStartLoading',
  'bvDidStopLoading',
  'bvDomReady',
  'tabSwitched',
  'tabTitleUpdated',
  'tabFaviconUpdated',
  'tabUrlUpdated',
  'window:isMaximized',
];

const safeApi = {};

for (const [channel, config] of Object.entries(allowedChannels)) {
  const eventName = `window:${channel}`;
  if (config.type === 'send') {
    safeApi[channel] = (arg) => ipcRenderer.send(eventName, arg);
  } else if (config.type === 'invoke') {
    safeApi[channel] = (arg) => ipcRenderer.invoke(eventName, arg);
  }
}

safeApi.on = (channel, callback) => {
  if (allowedListenChannels.includes(channel)) {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  } else {
    throw new Error(`Channel ${channel} is not allowed for on()`);
  }
};

safeApi.off = (channel, callback) => {
  if (allowedListenChannels.includes(channel)) {
    ipcRenderer.removeListener(channel, callback);
  } else {
    throw new Error(`Channel ${channel} is not allowed for off()`);
  }
};

contextBridge.exposeInMainWorld('api', safeApi);
