// The only bridge between the pages and the main process.
const { contextBridge, ipcRenderer } = require('electron');

const listen = (channel) => (cb) => {
  const fn = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, fn);
  return () => ipcRenderer.removeListener(channel, fn);
};

contextBridge.exposeInMainWorld('charmly', {
  getState: () => ipcRenderer.invoke('get-state'),
  onState: listen('state'),
  onCommand: listen('command'),
  onOpenTab: listen('open-tab'),

  setInteractive: (on) => ipcRenderer.send('set-interactive', !!on),
  saveRopes: (ropes) => ipcRenderer.send('save-ropes', ropes),
  charmMenu: (uid) => ipcRenderer.send('charm-menu', uid),
  swing: () => ipcRenderer.send('swing'),

  updateSettings: (patch) => ipcRenderer.send('update-settings', patch),
  hang: (charmId, mode) => ipcRenderer.send('hang', charmId, mode),
  unhang: (uid) => ipcRenderer.send('unhang', uid),
  toggleFavorite: (charmId) => ipcRenderer.send('toggle-favorite', charmId),
  saveCustom: (payload) => ipcRenderer.invoke('save-custom', payload),
  deleteCustom: (id) => ipcRenderer.send('delete-custom', id),
  setLaunchAtLogin: (on) => ipcRenderer.send('set-launch-at-login', !!on),
  openCustomize: (tab) => ipcRenderer.send('open-customize', tab),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  checkUpdates: () => ipcRenderer.send('check-updates'),
  installUpdate: () => ipcRenderer.send('install-update'),
  showLogs: () => ipcRenderer.send('show-logs'),
  reset: () => ipcRenderer.send('reset'),
});
