import { join } from 'node:path';
import { BrowserWindow, shell } from 'electron';

/** Ícone da janela e da barra de tarefas (gerado por `npm run build:icon`). */
const APP_ICON_PATH = join(__dirname, '../../assets/logo.ico');

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: 'Bulk Video Editor',
    icon: APP_ICON_PATH,
    backgroundColor: '#0f1115',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => window.show());

  // A interface é local: qualquer link externo abre no navegador e nenhuma navegação interna é permitida.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event) => event.preventDefault());

  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (devServerUrl) void window.loadURL(devServerUrl);
  else void window.loadFile(join(__dirname, '../renderer/index.html'));

  return window;
}
