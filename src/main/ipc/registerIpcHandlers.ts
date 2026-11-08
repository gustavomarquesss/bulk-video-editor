import { basename, extname, join, resolve, sep } from 'node:path';
import { dialog, ipcMain, shell, type BrowserWindow } from 'electron';
import { IPC } from '@shared/desktopApi';
import { generationRequestSchema, type GenerationResult } from '@shared/generation';
import type { GenerationService } from '../services/GenerationService';

export interface IpcDependencies {
  readonly window: BrowserWindow;
  readonly service: GenerationService;
  /** Pasta onde todas as gerações são gravadas; `openFolder` só abre caminhos dentro dela. */
  readonly outputsRoot: string;
}

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'm4v', 'mkv', 'webm'];

/** Nome da pasta de saída: `meu-video-20261108-174500`. */
function outputFolderName(sourcePath: string, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const stem = basename(sourcePath, extname(sourcePath)).replace(/[^\w-]+/g, '-');
  return `${stem}-${stamp.slice(0, 8)}-${stamp.slice(8)}`;
}

export function registerIpcHandlers({ window, service, outputsRoot }: IpcDependencies): void {
  let running: AbortController | null = null;

  ipcMain.handle(IPC.pickVideo, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Escolha o vídeo original',
      properties: ['openFile'],
      filters: [{ name: 'Vídeos', extensions: VIDEO_EXTENSIONS }],
    });
    return canceled ? null : (filePaths[0] ?? null);
  });

  ipcMain.handle(
    IPC.startGeneration,
    async (event, payload: unknown): Promise<GenerationResult> => {
      if (running) throw new Error('Já existe uma geração em andamento.');
      const request = generationRequestSchema.parse(payload);

      running = new AbortController();
      try {
        return await service.run(
          {
            ...request,
            outputDir: join(outputsRoot, outputFolderName(request.sourcePath)),
            seed: Math.floor(Math.random() * 2 ** 31),
          },
          (progress) => event.sender.send(IPC.generationProgress, progress),
          running.signal,
        );
      } finally {
        running = null;
      }
    },
  );

  ipcMain.handle(IPC.cancelGeneration, () => running?.abort());

  ipcMain.handle(IPC.openFolder, async (_event, folder: unknown) => {
    const target = resolve(String(folder));
    if (!target.startsWith(resolve(outputsRoot) + sep))
      throw new Error('Caminho fora da pasta de saída.');
    await shell.openPath(target);
  });
}
