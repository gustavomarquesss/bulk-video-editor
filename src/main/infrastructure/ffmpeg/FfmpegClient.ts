import { join } from 'node:path';
import type { ProcessRunner, RunOptions } from '../process/ProcessRunner';

export interface FfmpegBinaries {
  readonly ffmpeg: string;
  readonly ffprobe: string;
}

/**
 * Localiza o ffmpeg: `FFMPEG_DIR` (pasta com os executáveis) ou, na falta dela, o PATH do sistema.
 * Precisa ser uma build "full" (com rubberband e NVENC).
 */
export function resolveFfmpegBinaries(env: NodeJS.ProcessEnv = process.env): FfmpegBinaries {
  const dir = env.FFMPEG_DIR;
  if (!dir) return { ffmpeg: 'ffmpeg', ffprobe: 'ffprobe' };
  const extension = process.platform === 'win32' ? '.exe' : '';
  return { ffmpeg: join(dir, `ffmpeg${extension}`), ffprobe: join(dir, `ffprobe${extension}`) };
}

/** Fachada fina sobre os executáveis, com as opções comuns já aplicadas. */
export class FfmpegClient {
  constructor(
    private readonly runner: ProcessRunner,
    private readonly binaries: FfmpegBinaries,
  ) {}

  run(args: readonly string[], options?: RunOptions): Promise<Buffer> {
    return this.runner.run(
      this.binaries.ffmpeg,
      ['-v', 'error', '-nostdin', '-y', ...args],
      options,
    );
  }

  async probe(file: string): Promise<unknown> {
    const output = await this.runner.run(this.binaries.ffprobe, [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_streams',
      '-show_format',
      file,
    ]);
    return JSON.parse(output.toString('utf8')) as unknown;
  }
}
