import { join } from 'node:path';
import { app, dialog } from 'electron';
import { FfmpegClient, resolveFfmpegBinaries } from './infrastructure/ffmpeg/FfmpegClient';
import { detectVideoEncoder } from './infrastructure/ffmpeg/detectEncoder';
import { NodeProcessRunner } from './infrastructure/process/ProcessRunner';
import { registerIpcHandlers } from './ipc/registerIpcHandlers';
import { GenerationService } from './services/GenerationService';
import { createMainWindow } from './window';

/** Composition root: é aqui (e só aqui) que as dependências concretas são montadas. */
async function bootstrap(): Promise<void> {
  const ffmpeg = new FfmpegClient(new NodeProcessRunner(), resolveFfmpegBinaries());
  try {
    await ffmpeg.run(['-version']);
  } catch {
    dialog.showErrorBox(
      'ffmpeg não encontrado',
      'Instale o ffmpeg (build "full") e adicione ao PATH, ou defina a variável FFMPEG_DIR com a pasta dos executáveis.',
    );
    app.quit();
    return;
  }

  const encoder = await detectVideoEncoder(ffmpeg);
  const service = new GenerationService({ ffmpeg, encoder });
  const window = createMainWindow();
  registerIpcHandlers({
    window,
    service,
    outputsRoot: join(app.getPath('videos'), 'Bulk Video Editor'),
  });
}

app
  .whenReady()
  .then(bootstrap)
  .catch((error: unknown) => {
    dialog.showErrorBox('Falha ao iniciar', String(error));
    app.quit();
  });

app.on('window-all-closed', () => app.quit());
