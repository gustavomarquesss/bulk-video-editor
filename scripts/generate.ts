/**
 * Gera variações sem abrir a interface, usando o mesmo serviço do app.
 *
 * Uso: npm run generate -- <video.mp4> [--count 12] [--target 55] [--diversity 0.7] [--out output/teste] [--no-mirror]
 */
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  FfmpegClient,
  resolveFfmpegBinaries,
} from '../src/main/infrastructure/ffmpeg/FfmpegClient';
import { detectVideoEncoder } from '../src/main/infrastructure/ffmpeg/detectEncoder';
import { NodeProcessRunner } from '../src/main/infrastructure/process/ProcessRunner';
import { GenerationService } from '../src/main/services/GenerationService';

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      count: { type: 'string', default: '12' },
      target: { type: 'string', default: '55' },
      diversity: { type: 'string', default: '0.7' },
      out: { type: 'string', default: 'output/cli' },
      'no-mirror': { type: 'boolean', default: false },
    },
  });
  const [source] = positionals;
  if (!source) throw new Error('Informe o vídeo: npm run generate -- "samples/video teste.mp4"');

  const ffmpeg = new FfmpegClient(new NodeProcessRunner(), resolveFfmpegBinaries());
  const service = new GenerationService({ ffmpeg, encoder: await detectVideoEncoder(ffmpeg) });

  const result = await service.run(
    {
      sourcePath: resolve(source),
      count: Number(values.count),
      targetDifference: Number(values.target),
      diversity: Number(values.diversity),
      allowMirror: !values['no-mirror'],
      outputDir: resolve(values.out),
      seed: Math.floor(Math.random() * 2 ** 31),
    },
    ({ stage, done, total }) => process.stdout.write(`\r${stage} ${done}/${total}   `),
  );

  console.log(
    `\n${result.variants.length} variações em ${result.elapsedSeconds.toFixed(1)}s (${result.encoder})`,
  );
  console.log(`Pasta: ${result.outputDir}`);
  console.log(
    `Diferença para o original: ${result.variants.map((v) => Math.round(v.score)).join(', ')}`,
  );
  console.log(
    `Entre as variações: média ${(result.separation.mean * 100).toFixed(0)}%, par mais parecido ${(result.separation.min * 100).toFixed(0)}%`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
