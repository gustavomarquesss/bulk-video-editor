import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC, type DesktopApi } from '@shared/desktopApi';
import type { GenerationProgress } from '@shared/generation';

/** Única superfície que a interface enxerga do processo principal. */
const api: DesktopApi = {
  pickVideo: () => ipcRenderer.invoke(IPC.pickVideo) as Promise<string | null>,
  startGeneration: (request) => ipcRenderer.invoke(IPC.startGeneration, request),
  cancelGeneration: () => ipcRenderer.invoke(IPC.cancelGeneration),
  openFolder: (path) => ipcRenderer.invoke(IPC.openFolder, path),
  pathForFile: (file) => webUtils.getPathForFile(file),
  onGenerationProgress: (listener) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: GenerationProgress) =>
      listener(progress);
    ipcRenderer.on(IPC.generationProgress, handler);
    return () => ipcRenderer.removeListener(IPC.generationProgress, handler);
  },
};

contextBridge.exposeInMainWorld('desktop', api);
