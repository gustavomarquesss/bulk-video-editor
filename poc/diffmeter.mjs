// DiffMeter: mede "quão diferente" uma variação é do vídeo original (score 0–100)
// e calibra a intensidade (s) para atingir um alvo, por busca binária.
//
// Score = 100 · (0,60·visual + 0,15·tempo + 0,25·áudio)
//   visual: medido em 8 frames amostrados (SSIM, dHash, histograma) — espelhamento NÃO conta,
//           pois fingerprints costumam ser robustos a flip; ele entra como bônus à parte.
//   tempo : declarado (|1 − velocidade|).
//   áudio : declarado (semitons de pitch + ganho de EQ).

import { spawnSync } from 'node:child_process';
import { probeVideo } from './media.mjs';
import { FRAME_BYTES, SIZE, clamp01, longTermSpectrumDb, sequenceDistance, spectralShapeDeltaDb } from './metrics.mjs';
import { applyStrength, spatialChain } from './variation.mjs';

export const SAMPLE_FRAMES = 8;
export const SCORE_WEIGHTS = { visual: 0.6, timing: 0.15, audio: 0.25 };
// Valores que saturam cada componente (calibrados empiricamente com vídeo real).
export const NORM = { ssim: 0.6, hash: 0.3, hist: 0.3 };

const SMALL_FILTER = `format=yuv420p,scale=${SIZE}:${SIZE}:flags=area,format=rgb24`;

function ffmpeg(args, input) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-nostdin', ...args], { input, maxBuffer: 512 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg falhou: ${r.stderr}`);
  return r.stdout;
}

const sampleTimes = (dur) => Array.from({ length: SAMPLE_FRAMES }, (_, k) => (dur * (k + 0.5)) / SAMPLE_FRAMES);

// ---------- preparação (uma vez por vídeo original) ----------

/** Extrai os frames amostrados do original em resolução nativa (RGB cru, em memória) e a versão pequena. */
export function prepare(file) {
  const media = probeVideo(file);
  const frameSize = media.w * media.h * 3;
  const native = Buffer.concat(
    sampleTimes(media.dur).map((t) =>
      ffmpeg(['-ss', t.toFixed(3), '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']),
    ),
  );
  if (native.length !== frameSize * SAMPLE_FRAMES) throw new Error('frames extraídos com tamanho inesperado');
  const small = smallFrames(native, media, SMALL_FILTER);
  return { file, media, native, small };
}

/** Aplica `vf` aos frames nativos e devolve os frames reduzidos (SIZE×SIZE RGB). */
function smallFrames(native, media, vf) {
  return ffmpeg(
    ['-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', `${media.w}x${media.h}`, '-framerate', '1', '-i', 'pipe:0', '-vf', vf, '-f', 'rawvideo', '-'],
    native,
  );
}

// ---------- pontuação ----------

const timingComponent = (p) => clamp01(Math.abs(1 - p.speed) / 0.08);
const audioComponent = (p) => {
  const semitones = Math.abs(12 * Math.log2(p.pitch));
  return 0.5 * clamp01(semitones / 1.0) + 0.5 * clamp01((Math.abs(p.bassDb) + Math.abs(p.trebleDb)) / 8);
};
const visualComponent = ({ ssimD, hash, hist }) =>
  0.5 * clamp01(ssimD / NORM.ssim) + 0.3 * clamp01(hash / NORM.hash) + 0.2 * clamp01(hist / NORM.hist);

function buildScore(p, raw, frames) {
  const visual = visualComponent(raw), timing = timingComponent(p), audio = audioComponent(p);
  const score = 100 * (SCORE_WEIGHTS.visual * visual + SCORE_WEIGHTS.timing * timing + SCORE_WEIGHTS.audio * audio);
  return { score, visual, timing, audio, raw, frames };
}

/** Estima o score de uma variação aplicando só os filtros de imagem aos frames amostrados (sem encode). */
export function measure(prep, p) {
  const { media } = prep;
  const vf = `${spatialChain(p, media.w, media.h, { flip: false })},${SMALL_FILTER}`;
  const frames = smallFrames(prep.native, media, vf);
  return buildScore(p, sequenceDistance(prep.small, frames, SAMPLE_FRAMES), frames);
}

/** Mede um arquivo já renderizado (valida que o proxy `measure` reflete o resultado real). */
export function measureRendered(prep, file, p) {
  const { dur } = probeVideo(file);
  const unflip = p.flip ? 'hflip,' : '';
  const frames = Buffer.concat(
    sampleTimes(dur).map((t) =>
      ffmpeg(['-ss', t.toFixed(3), '-i', file, '-frames:v', '1', '-vf', `${unflip}${SMALL_FILTER}`, '-f', 'rawvideo', '-']),
    ),
  );
  if (frames.length !== FRAME_BYTES * SAMPLE_FRAMES) throw new Error('frames do arquivo renderizado com tamanho inesperado');
  return buildScore(p, sequenceDistance(prep.small, frames, SAMPLE_FRAMES), frames);
}

/** Diferença espectral média (dB) entre o áudio de dois arquivos — sanity check do ajuste de voz. */
export function audioSpectralDelta(fileA, fileB) {
  const spectrum = (f) => {
    const buf = ffmpeg(['-i', f, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-']);
    const aligned = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength - (buf.byteLength % 4));
    return longTermSpectrumDb(new Float32Array(aligned));
  };
  return spectralShapeDeltaDb(spectrum(fileA), spectrum(fileB));
}

// ---------- calibração ----------

/**
 * Encontra a intensidade s ∈ [0,1] cujo score fica a ±`tolerance` do `target`.
 * Como `draw` é fixo, o score é monotônico em s e a busca binária converge.
 */
export function calibrate(prep, draw, target, { weights, tolerance = 1.5, maxIterations = 9 } = {}) {
  const at = (s) => {
    const p = applyStrength(draw, s, weights);
    return { s, p, ...measure(prep, p) };
  };
  const ceiling = at(1);
  if (ceiling.score < target - tolerance) return { ...ceiling, reachable: false, iterations: 1 };

  let lo = 0, hi = 1, best = ceiling, iterations = 1;
  while (iterations < maxIterations) {
    const candidate = at((lo + hi) / 2);
    iterations++;
    if (Math.abs(candidate.score - target) < Math.abs(best.score - target)) best = candidate;
    if (Math.abs(candidate.score - target) <= tolerance) break;
    if (candidate.score < target) lo = candidate.s; else hi = candidate.s;
  }
  return { ...best, reachable: true, iterations };
}
