import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld(
  'electron',
  {
    loadFile: (filePath) => ipcRenderer.invoke('loadFile', filePath)
  }
);