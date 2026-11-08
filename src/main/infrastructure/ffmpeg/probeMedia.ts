import { z } from 'zod';
import type { FfmpegClient } from './FfmpegClient';

export interface MediaInfo {
  /** Dimensões já consideram a rotação (o ffmpeg auto-rotaciona ao decodificar). */
  readonly width: number;
  readonly height: number;
  readonly durationSeconds: number;
  readonly hasAudio: boolean;
}

const probeSchema = z.object({
  format: z.object({ duration: z.coerce.number().positive() }),
  streams: z.array(
    z.object({
      codec_type: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      tags: z.object({ rotate: z.coerce.number().optional() }).optional(),
      side_data_list: z.array(z.object({ rotation: z.number().optional() })).optional(),
    }),
  ),
});

export async function probeMedia(ffmpeg: FfmpegClient, file: string): Promise<MediaInfo> {
  const { format, streams } = probeSchema.parse(await ffmpeg.probe(file));
  const video = streams.find((stream) => stream.codec_type === 'video');
  if (video?.width === undefined || video.height === undefined) {
    throw new Error('O arquivo não contém um stream de vídeo válido.');
  }
  const rotation = Math.abs(
    video.side_data_list?.find((data) => data.rotation !== undefined)?.rotation ??
      video.tags?.rotate ??
      0,
  );
  const swapped = rotation === 90 || rotation === 270;
  return {
    width: swapped ? video.height : video.width,
    height: swapped ? video.width : video.height,
    durationSeconds: format.duration,
    hasAudio: streams.some((stream) => stream.codec_type === 'audio'),
  };
}
