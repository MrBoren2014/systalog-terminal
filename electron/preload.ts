import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('systalog', {
  terminal: {
    create: (opts: { id: string; cwd?: string; command?: string; env?: Record<string, string> }) =>
      ipcRenderer.invoke('terminal:create', opts),
    write: (opts: { id: string; data: string }) =>
      ipcRenderer.invoke('terminal:write', opts),
    resize: (opts: { id: string; cols: number; rows: number }) =>
      ipcRenderer.invoke('terminal:resize', opts),
    kill: (opts: { id: string }) =>
      ipcRenderer.invoke('terminal:kill', opts),
    onData: (cb: (payload: { id: string; data: string }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, p: { id: string; data: string }) => cb(p);
      ipcRenderer.on('terminal:data', handler);
      return () => ipcRenderer.removeListener('terminal:data', handler);
    },
    onExit: (cb: (payload: { id: string; exitCode: number }) => void) => {
      const handler = (_e: Electron.IpcRendererEvent, p: { id: string; exitCode: number }) => cb(p);
      ipcRenderer.on('terminal:exit', handler);
      return () => ipcRenderer.removeListener('terminal:exit', handler);
    },
  },
  screenshot: {
    capture: () => ipcRenderer.invoke('screenshot:capture'),
    save: (dataUrl: string) => ipcRenderer.invoke('screenshot:save', dataUrl),
  },
  clipboard: {
    readImage: () => ipcRenderer.invoke('clipboard:readImage'),
    writeText: (text: string) => ipcRenderer.invoke('clipboard:writeText', text),
    writeImage: (dataUrl: string) => ipcRenderer.invoke('clipboard:writeImage', dataUrl),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
    openPath: (targetPath: string) => ipcRenderer.invoke('shell:openPath', targetPath),
    exec: (command: string) => ipcRenderer.invoke('shell:exec', command),
  },
  filesystem: {
    readTextFile: (filePath: string) => ipcRenderer.invoke('filesystem:readTextFile', filePath),
    writeTextFile: (filePath: string, content: string) => ipcRenderer.invoke('filesystem:writeTextFile', { filePath, content }),
  },
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo'),
    getAuthState: () => ipcRenderer.invoke('app:getAuthState'),
    listSkills: () => ipcRenderer.invoke('app:listSkills'),
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', { key, value }),
  },
});
