import { ipcRenderer, contextBridge } from "electron";

contextBridge.exposeInMainWorld("electron", {
  loadFile: (filePath: string) => ipcRenderer.invoke("loadFile", filePath),
  signIn: () => ipcRenderer.invoke("signIn"),
  signInSilent: () => ipcRenderer.invoke("signInSilent"),
  signOut: () => ipcRenderer.invoke("signOut"),
  getToken: (resource: string) => ipcRenderer.invoke("getToken", resource),
  getModels: (hostname: string) => ipcRenderer.invoke("getModels", hostname),
  getTwins: (hostname: string, filter?: string) =>
    ipcRenderer.invoke("getTwins", hostname, filter),
  getTwinIncomingRelationships: (hostname: string, twinId: string) =>
    ipcRenderer.invoke("getTwinIncomingRelationships", hostname, twinId),
});
