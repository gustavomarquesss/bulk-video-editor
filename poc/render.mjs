// Renderiza uma variação com ffmpeg (CPU x264 ou GPU NVENC) e grava os metadados.
import { spawn } from 'node:child_process';
import { removeMdtaKey } from './mp4patch.mjs';
import { audioChain, buildMetadata, videoChain } from './variation.mjs';

export function renderVariation({ input, media, p, outFile, encoder = 'x264' }) {
  const venc = encoder === 'nvenc'
    ? ['-c:v', 'h264_nvenc', '-preset', 'p5', '-rc', 'vbr', '-cq', String(p.crf), '-b:v', '0', '-profile:v', 'high']
    : ['-c:v', 'libx264', '-preset', 'medium', '-crf', String(p.crf), '-profile:v', 'high', '-x264-params', 'no-info=1'];
  const argv = [
    '-v', 'error', '-y', '-i', input,
    '-map_metadata', '-1', '-map_chapters', '-1',
    '-vf', videoChain(p, media.w, media.h),
    ...(media.hasAudio ? ['-af', audioChain(p), '-c:a', 'aac', '-b:a', `${p.abitrate}k`, '-ar', '48000'] : ['-an']),
    ...venc,
    '-fflags', '+bitexact', '-flags:v', '+bitexact', '-flags:a', '+bitexact', // sem tag "encoder=Lavf"
    '-movflags', '+faststart+use_metadata_tags',
    ...buildMetadata(p),
    outFile,
  ];
  return new Promise((res, rej) => {
    const c = spawn('ffmpeg', argv, { stdio: ['ignore', 'inherit', 'pipe'] });
    let err = '';
    c.stderr.on('data', (d) => (err += d));
    c.on('close', (code) => {
      if (code !== 0) return rej(new Error(`${outFile}: ${err}`));
      // use_metadata_tags duplica creation_time como chave mdta; celular de verdade só tem no mvhd
      try { removeMdtaKey(outFile, 'creation_time'); } catch (e) { return rej(e); }
      res(outFile);
    });
  });
}
