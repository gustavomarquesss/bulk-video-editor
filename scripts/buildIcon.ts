/**
 * Gera `assets/icon.ico` (transparente, vários tamanhos) a partir de `assets/logo.jpg`.
 * Usado pelo atalho do Windows e pela janela do app.
 *
 * Uso: npm run build:icon
 */
import { resolve } from 'node:path';
import {
  FfmpegClient,
  resolveFfmpegBinaries,
} from '../src/main/infrastructure/ffmpeg/FfmpegClient';
import { NodeProcessRunner } from '../src/main/infrastructure/process/ProcessRunner';
import { removeWhite } from './icon/removeWhite';

const SOURCE = resolve('assets/logo.jpg');
const OUTPUT = resolve('assets/icon.ico');
const SIZES = [256, 128, 64, 48, 32, 16];

async function main(): Promise<void> {
  const ffmpeg = new FfmpegClient(new NodeProcessRunner(), resolveFfmpegBinaries());

  const { width, height } = await readSize(ffmpeg);
  if (width !== height) throw new Error(`O logo precisa ser quadrado (veio ${width}×${height}).`);

  const decoded = await ffmpeg.run(['-i', SOURCE, '-vf', 'format=rgba', '-f', 'rawvideo', '-']);
  const transparent = removeWhite(decoded);

  // Redimensiona com alfa pré-multiplicado, para a borda não ganhar um contorno claro.
  const branches = SIZES.map((size, i) => `[v${i}]scale=${size}:${size}:flags=lanczos[s${i}]`);
  const split = `[0:v]format=gbrap,premultiply=inplace=1,split=${SIZES.length}${SIZES.map((_, i) => `[v${i}]`).join('')}`;
  const unpremultiply = SIZES.map((_, i) => `[s${i}]unpremultiply=inplace=1,format=rgba[o${i}]`);
  const maps = SIZES.flatMap((_, i) => ['-map', `[o${i}]`]);

  await ffmpeg.run(
    [
      '-f',
      'rawvideo',
      '-pixel_format',
      'rgba',
      '-video_size',
      `${width}x${height}`,
      '-i',
      'pipe:0',
      '-filter_complex',
      [split, ...branches, ...unpremultiply].join(';'),
      ...maps,
      '-c:v',
      'png',
      OUTPUT,
    ],
    { input: transparent },
  );
  console.log(`Ícone gerado: ${OUTPUT} (${SIZES.join(', ')} px)`);
}

async function readSize(ffmpeg: FfmpegClient): Promise<{ width: number; height: number }> {
  const info = (await ffmpeg.probe(SOURCE)) as { streams: { width?: number; height?: number }[] };
  const stream = info.streams[0];
  if (stream?.width === undefined || stream.height === undefined)
    throw new Error('Imagem inválida.');
  return { width: stream.width, height: stream.height };
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
