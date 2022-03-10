import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld(
  'electron',
  {
    loadFile: (filePath: string) => ipcRenderer.invoke('loadFile', filePath)
  }
);