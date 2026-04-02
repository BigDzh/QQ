const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openMonitorWindow: () => ipcRenderer.invoke('open-monitor-window'),
  closeMonitorWindow: () => ipcRenderer.invoke('close-monitor-window'),
  toggleMonitorAlwaysOnTop: (value) => ipcRenderer.invoke('toggle-monitor-always-on-top', value),
  isMonitorAlwaysOnTop: () => ipcRenderer.invoke('is-monitor-always-on-top'),
  onMonitorStatusChange: (callback) => {
    ipcRenderer.on('monitor-status-change', (event, status) => callback(status));
  },
  setMonitorPosition: (x, y) => ipcRenderer.invoke('set-monitor-position', x, y),
  minimizeMonitorWindow: () => ipcRenderer.invoke('minimize-monitor-window'),
  closeMonitorWindowIPC: () => ipcRenderer.invoke('close-monitor-window-ipc'),
});