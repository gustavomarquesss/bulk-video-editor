import { mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { calibrateStrength, type CalibrationResult } from '@core/diff/calibrate';
import { measureSeparation, selectMostSeparated } from '@core/diff/separation';
import { pad } from '@core/format';
import { drawCandidates } from '@core/variation/draw';
import { candidatePoolSize } from '@core/variation/pool';
import type {
  GenerationProgress,
  GenerationRequest,
  GenerationResult,
  VariantSummary,
} from '@shared/generation';
import type { FfmpegClient } from '../infrastructure/ffmpeg/FfmpegClient';
import {
  SAMPLE_COUNT,
  FfmpegDifferenceMeter,
} from '../infrastructure/ffmpeg/FfmpegDifferenceMeter';
import { VideoRenderer } from '../infrastructure/ffmpeg/VideoRenderer';
import type { VideoEncoder } from '../infrastructure/ffmpeg/detectEncoder';
import { probeMedia, type MediaInfo } from '../infrastructure/ffmpeg/probeMedia';
import { mapWithConcurrency } from '../shared/mapWithConcurrency';

export interface GenerationJob extends GenerationRequest {
  readonly outputDir: string;
  readonly seed: number;
}

export interface GenerationServiceDeps {
  readonly ffmpeg: FfmpegClient;
  readonly encoder: VideoEncoder;
  /** Calibrações simultâneas (usam CPU). */
  readonly calibrationConcurrency?: number;
  /** Encodes simultâneos (o NVENC de placas de consumo aceita poucas sessões). */
  readonly renderConcurrency?: number;
}

export type ProgressListener = (progress: GenerationProgress) => void;

/** Orquestra uma geração: planeja, calibra a intensidade de cada variação, renderiza e documenta. */
export class GenerationService {
  constructor(private readonly deps: GenerationServiceDeps) {}

  async run(
    job: GenerationJob,
    onProgress: ProgressListener,
    signal?: AbortSignal,
  ): Promise<GenerationResult> {
    const startedAt = performance.now();
    const media = await probeMedia(this.deps.ffmpeg, job.sourcePath);
    await mkdir(job.outputDir, { recursive: true });

    const calibrated = await this.calibrateAndSelect(job, media, onProgress, signal);
    const fileNames = calibrated.map((_, i) => variantFileName(job.sourcePath, i + 1));
    await this.renderAll(job, media, calibrated, fileNames, onProgress, signal);

    const variants = calibrated.map((result, i) => summarize(result, i + 1, fileNames[i]));
    await writeFile(
      join(job.outputDir, 'manifest.json'),
      JSON.stringify({ request: job, variants }, null, 2),
    );

    return {
      outputDir: job.outputDir,
      encoder: this.deps.encoder,
      variants,
      separation: measureSeparation(
        calibrated.map((r) => r.measurement.frames),
        SAMPLE_COUNT,
      ),
      elapsedSeconds: (performance.now() - startedAt) / 1000,
    };
  }

  /**
   * Sorteia mais candidatas do que o pedido (quanto maior a diversidade), calibra todas para o
   * alvo e fica com as que, *medidas*, mais se afastam umas das outras.
   */
  private async calibrateAndSelect(
    job: GenerationJob,
    media: MediaInfo,
    onProgress: ProgressListener,
    signal?: AbortSignal,
  ): Promise<CalibrationResult[]> {
    const draws = drawCandidates(candidatePoolSize(job.count, job.diversity), {
      seed: job.seed,
      allowMirror: job.allowMirror,
      now: new Date(),
    });
    const meter = await FfmpegDifferenceMeter.prepare(this.deps.ffmpeg, job.sourcePath, media);
    let done = 0;
    const pool = await mapWithConcurrency(
      draws,
      this.deps.calibrationConcurrency ?? 3,
      async (draw) => {
        const result = await calibrateStrength({
          draw,
          target: job.targetDifference,
          measure: meter.measure,
        });
        onProgress({ stage: 'calibrating', done: ++done, total: draws.length });
        return result;
      },
      signal,
    );
    return selectMostSeparated(pool, job.count, SAMPLE_COUNT);
  }

  private async renderAll(
    job: GenerationJob,
    media: MediaInfo,
    calibrated: readonly CalibrationResult[],
    fileNames: readonly string[],
    onProgress: ProgressListener,
    signal?: AbortSignal,
  ): Promise<void> {
    const renderer = new VideoRenderer(this.deps.ffmpeg, this.deps.encoder);
    let done = 0;
    await mapWithConcurrency(
      calibrated,
      this.deps.renderConcurrency ?? 3,
      async ({ params }, i) => {
        await renderer.render(
          { source: job.sourcePath, media, params, output: join(job.outputDir, fileNames[i]) },
          signal,
        );
        onProgress({ stage: 'rendering', done: ++done, total: calibrated.length });
      },
      signal,
    );
  }
}

/** Nome seguro e ordenável: `meu_video_v007.mp4`. */
export function variantFileName(sourcePath: string, index: number): string {
  const stem = basename(sourcePath, extname(sourcePath)).replace(/[^\w-]+/g, '_');
  return `${stem}_v${pad(index, 3)}.mp4`;
}

function summarize(
  { params, measurement, reachable }: CalibrationResult,
  index: number,
  fileName: string,
): VariantSummary {
  const { device } = params.capture;
  return {
    index,
    fileName,
    score: measurement.score,
    reachable,
    look: params.look,
    mirror: params.mirror,
    voice: params.audio.pitch < 1 ? 'thicker' : 'thinner',
    speed: params.timing.speed,
    zoom: params.framing.zoom,
    device: `${device.make} ${device.model}`,
    recordedAt: params.capture.recordedAt.toISOString(),
  };
}
