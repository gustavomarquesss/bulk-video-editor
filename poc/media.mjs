// Utilitários de mídia (ffprobe).
import { spawnSync } from 'node:child_process';

export function probeVideo(file) {
  const p = spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], { encoding: 'utf8' });
  if (p.status !== 0) throw new Error('ffprobe falhou: ' + p.stderr);
  const info = JSON.parse(p.stdout);
  const v = info.streams.find((s) => s.codec_type === 'video');
  if (!v) throw new Error('sem stream de vídeo');
  // vídeos de celular costumam vir com rotação em metadado; o ffmpeg auto-rotaciona ao decodificar
  const rot = Math.abs(Number(v.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0));
  const swap = rot === 90 || rot === 270;
  return {
    w: swap ? v.height : v.width,
    h: swap ? v.width : v.height,
    dur: Number(info.format.duration),
    hasAudio: info.streams.some((s) => s.codec_type === 'audio'),
    tags: info.format.tags ?? {},
  };
}
