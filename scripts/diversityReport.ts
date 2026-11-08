/**
 * Compara estratégias de sorteio medindo, em vídeo real:
 *  - a diferença visual para o original (deve ficar próxima do alvo);
 *  - o afastamento entre as próprias variações: média e par mais parecido.
 *
 * Uso: npm run report:diversity -- <video.mp4> [variacoes=12]
 */
import { calibrateStrength, type CalibrationResult } from '@core/diff/calibrate';
import { measureSeparation, selectMostSeparated } from '@core/diff/separation';
import { drawCandidates } from '@core/variation/draw';
import { candidatePoolSize } from '@core/variation/pool';
import {
  FfmpegClient,
  resolveFfmpegBinaries,
} from '../src/main/infrastructure/ffmpeg/FfmpegClient';
import {
  FfmpegDifferenceMeter,
  SAMPLE_COUNT,
} from '../src/main/infrastructure/ffmpeg/FfmpegDifferenceMeter';
import { probeMedia } from '../src/main/infrastructure/ffmpeg/probeMedia';
import { NodeProcessRunner } from '../src/main/infrastructure/process/ProcessRunner';
import { mapWithConcurrency } from '../src/main/shared/mapWithConcurrency';

const [source, countArg = '12'] = process.argv.slice(2);
if (!source)
  throw new Error('Informe o vídeo: npm run report:diversity -- "samples/video teste.mp4"');

const COUNT = Number(countArg);
const SEEDS = [1, 2, 3];
const TARGETS = [40, 60];
const NOW = new Date();

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

interface Strategy {
  readonly name: string;
  /** Devolve as variações finais já calibradas. */
  readonly run: (
    seed: number,
    calibrate: (seeds: ReturnType<typeof drawCandidates>) => Promise<CalibrationResult[]>,
  ) => Promise<CalibrationResult[]>;
}

const strategies: Strategy[] = [
  {
    name: 'sorteio livre',
    run: (seed, calibrate) =>
      calibrate(drawCandidates(COUNT, { seed, allowMirror: true, now: NOW, structured: false })),
  },
  {
    name: 'rodízio de looks e âncoras',
    run: (seed, calibrate) =>
      calibrate(drawCandidates(COUNT, { seed, allowMirror: true, now: NOW })),
  },
  {
    name: 'rodízio + seleção medida (diversidade 100%)',
    run: async (seed, calibrate) => {
      const pool = await calibrate(
        drawCandidates(candidatePoolSize(COUNT, 1), { seed, allowMirror: true, now: NOW }),
      );
      return selectMostSeparated(pool, COUNT, SAMPLE_COUNT);
    },
  },
];

async function main(): Promise<void> {
  const ffmpeg = new FfmpegClient(new NodeProcessRunner(), resolveFfmpegBinaries());
  const meter = await FfmpegDifferenceMeter.prepare(
    ffmpeg,
    source,
    await probeMedia(ffmpeg, source),
  );
  const rows = [];

  for (const target of TARGETS) {
    const calibrate = (draws: ReturnType<typeof drawCandidates>) =>
      mapWithConcurrency(draws, 4, (draw) =>
        calibrateStrength({ draw, target, measure: meter.measure }),
      );

    for (const strategy of strategies) {
      const perSeed = [];
      for (const seed of SEEDS) {
        const results = await strategy.run(seed, calibrate);
        perSeed.push({
          score: mean(results.map((r) => r.measurement.score)),
          visual: mean(results.map((r) => r.measurement.visual)),
          ...measureSeparation(
            results.map((r) => r.measurement.frames),
            SAMPLE_COUNT,
          ),
        });
      }
      rows.push({
        alvo: target,
        estratégia: strategy.name,
        'score médio': mean(perSeed.map((s) => s.score)).toFixed(1),
        'vs original (visual)': mean(perSeed.map((s) => s.visual)).toFixed(3),
        'entre variações (média)': mean(perSeed.map((s) => s.mean)).toFixed(3),
        'par mais parecido (médio)': mean(perSeed.map((s) => s.min)).toFixed(3),
        'par mais parecido (pior)': Math.min(...perSeed.map((s) => s.min)).toFixed(3),
      });
    }
  }
  console.table(rows);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
