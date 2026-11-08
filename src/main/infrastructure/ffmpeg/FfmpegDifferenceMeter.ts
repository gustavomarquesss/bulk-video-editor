import { computeScore } from '@core/diff/score';
import type { Measurement } from '@core/diff/calibrate';
import { FRAME_SIZE, sequenceDifference } from '@core/diff/imageMetrics';
import { buildSpatialFilter } from '@core/ffmpeg/filters';
import type { VariationParams } from '@core/variation/types';
import type { FfmpegClient } from './FfmpegClient';
import type { MediaInfo } from './probeMedia';

export const SAMPLE_COUNT = 8;

const REDUCE_FILTER = `format=yuv420p,scale=${FRAME_SIZE}:${FRAME_SIZE}:flags=area,format=rgb24`;

/**
 * Mede o quanto uma variação difere do original aplicando só os filtros de imagem a alguns frames
 * amostrados (sem codificar o vídeo), o que torna a calibração rápida.
 */
export class FfmpegDifferenceMeter {
  private constructor(
    private readonly ffmpeg: FfmpegClient,
    private readonly media: MediaInfo,
    /** Frames amostrados do original, em resolução nativa (RGB cru). */
    private readonly nativeFrames: Buffer,
    /** Os mesmos frames reduzidos, usados como referência. */
    private readonly reference: Buffer,
  ) {}

  static async prepare(
    ffmpeg: FfmpegClient,
    source: string,
    media: MediaInfo,
  ): Promise<FfmpegDifferenceMeter> {
    const timestamps = Array.from(
      { length: SAMPLE_COUNT },
      (_, k) => (media.durationSeconds * (k + 0.5)) / SAMPLE_COUNT,
    );
    const frames = await Promise.all(
      timestamps.map((time) =>
        ffmpeg.run([
          '-ss',
          time.toFixed(3),
          '-i',
          source,
          '-frames:v',
          '1',
          '-f',
          'rawvideo',
          '-pix_fmt',
          'rgb24',
          '-',
        ]),
      ),
    );
    const nativeFrames = Buffer.concat(frames);
    const reference = await reduceFrames(ffmpeg, media, nativeFrames, REDUCE_FILTER);
    return new FfmpegDifferenceMeter(ffmpeg, media, nativeFrames, reference);
  }

  /** Arrow function para poder ser passada diretamente como `MeasureVariation`. */
  readonly measure = async (params: VariationParams): Promise<Measurement> => {
    const filter = `${buildSpatialFilter(params, this.media, { mirror: false })},${REDUCE_FILTER}`;
    const frames = await reduceFrames(this.ffmpeg, this.media, this.nativeFrames, filter);
    const raw = sequenceDifference(this.reference, frames, SAMPLE_COUNT);
    return { ...computeScore(params, raw), raw, frames };
  };
}

/** Aplica `filter` aos frames nativos e devolve os frames reduzidos para FRAME_SIZE². */
function reduceFrames(
  ffmpeg: FfmpegClient,
  media: MediaInfo,
  nativeFrames: Buffer,
  filter: string,
): Promise<Buffer> {
  return ffmpeg.run(
    [
      '-f',
      'rawvideo',
      '-pixel_format',
      'rgb24',
      '-video_size',
      `${media.width}x${media.height}`,
      '-framerate',
      '1',
      '-i',
      'pipe:0',
      '-vf',
      filter,
      '-f',
      'rawvideo',
      '-',
    ],
    { input: nativeFrames },
  );
}
