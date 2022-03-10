import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld(
  'electron',
  {
    loadFile: (filePath: string) => ipcRenderer.invoke('loadFile', filePath),
    signIn: () => ipcRenderer.invoke('signIn'),
    signInSilent: () => ipcRenderer.invoke('signInSilent'),
    signOut: () => ipcRenderer.invoke('signOut'),
  }
);