import { buildAudioFilter, buildVideoFilter } from '@core/ffmpeg/filters';
import { buildMetadataArgs } from '@core/ffmpeg/metadata';
import type { VariationParams } from '@core/variation/types';
import { removeMdtaKey } from '../mp4/removeMdtaKey';
import type { FfmpegClient } from './FfmpegClient';
import { videoEncoderArgs, type VideoEncoder } from './detectEncoder';
import type { MediaInfo } from './probeMedia';

export interface RenderJob {
  readonly source: string;
  readonly media: MediaInfo;
  readonly params: VariationParams;
  readonly output: string;
}

export class VideoRenderer {
  constructor(
    private readonly ffmpeg: FfmpegClient,
    private readonly encoder: VideoEncoder,
  ) {}

  async render({ source, media, params, output }: RenderJob, signal?: AbortSignal): Promise<void> {
    const audioArgs = media.hasAudio
      ? [
          '-af',
          buildAudioFilter(params, media.durationSeconds),
          '-c:a',
          'aac',
          '-b:a',
          `${params.encode.audioBitrateKbps}k`,
          '-ar',
          '48000',
        ]
      : ['-an'];

    await this.ffmpeg.run(
      [
        '-i',
        source,
        '-map_metadata',
        '-1',
        '-map_chapters',
        '-1',
        '-vf',
        buildVideoFilter(params, media, media.durationSeconds),
        ...audioArgs,
        ...videoEncoderArgs(this.encoder, params.encode.crf),
        // bitexact: não grava a tag "encoder=Lavf..." que denuncia o reprocessamento
        '-fflags',
        '+bitexact',
        '-flags:v',
        '+bitexact',
        '-flags:a',
        '+bitexact',
        '-movflags',
        '+faststart+use_metadata_tags',
        ...buildMetadataArgs(params.capture),
        output,
      ],
      { signal },
    );
    // use_metadata_tags duplica creation_time como chave mdta; celular de verdade só o tem no mvhd.
    removeMdtaKey(output, 'creation_time');
  }
}
