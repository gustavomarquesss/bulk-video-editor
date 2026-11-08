import type { FfmpegClient } from './FfmpegClient';

export type VideoEncoder = 'nvenc' | 'x264';

/** Usa a GPU NVIDIA quando o NVENC realmente funciona; caso contrário cai para a CPU (x264). */
export async function detectVideoEncoder(ffmpeg: FfmpegClient): Promise<VideoEncoder> {
  try {
    await ffmpeg.run([
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=256x256:d=0.1',
      '-frames:v',
      '1',
      '-c:v',
      'h264_nvenc',
      '-f',
      'null',
      '-',
    ]);
    return 'nvenc';
  } catch {
    return 'x264';
  }
}

export function videoEncoderArgs(encoder: VideoEncoder, crf: number): string[] {
  return encoder === 'nvenc'
    ? [
        '-c:v',
        'h264_nvenc',
        '-preset',
        'p5',
        '-rc',
        'vbr',
        '-cq',
        String(crf),
        '-b:v',
        '0',
        '-profile:v',
        'high',
      ]
    : [
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        String(crf),
        '-profile:v',
        'high',
        '-x264-params',
        'no-info=1',
      ];
}
