// Métricas puras (sem I/O) usadas pelo DiffMeter.
// Frames: Buffers RGB24 de SIZE×SIZE pixels, concatenados. Áudio: Float32Array mono.

export const SIZE = 96;
const PIXELS = SIZE * SIZE;
export const FRAME_BYTES = PIXELS * 3;

export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const frameAt = (buf, k) => buf.subarray(k * FRAME_BYTES, (k + 1) * FRAME_BYTES);

function toGray(rgb) {
  const g = new Float32Array(PIXELS);
  for (let i = 0; i < PIXELS; i++) g[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2];
  return g;
}

// ---------- imagem ----------

/** SSIM médio em blocos 8×8 não sobrepostos (1 = idêntico). */
export function ssim(a, b) {
  const BLOCK = 8, N = BLOCK * BLOCK;
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
  let total = 0, blocks = 0;
  for (let by = 0; by < SIZE; by += BLOCK) {
    for (let bx = 0; bx < SIZE; bx += BLOCK) {
      let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (let y = by; y < by + BLOCK; y++) {
        for (let x = bx; x < bx + BLOCK; x++) {
          const va = a[y * SIZE + x], vb = b[y * SIZE + x];
          sa += va; sb += vb; saa += va * va; sbb += vb * vb; sab += va * vb;
        }
      }
      const ma = sa / N, mb = sb / N;
      const varA = saa / N - ma * ma, varB = sbb / N - mb * mb, cov = sab / N - ma * mb;
      total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (varA + varB + C2));
      blocks++;
    }
  }
  return total / blocks;
}

/** dHash de 64 bits: compara pixels vizinhos de uma grade 9×8 (média por área). */
export function dHash(gray) {
  const cols = 9, rows = 8;
  const grid = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const x0 = Math.floor((x * SIZE) / cols), x1 = Math.floor(((x + 1) * SIZE) / cols);
      const y0 = Math.floor((y * SIZE) / rows), y1 = Math.floor(((y + 1) * SIZE) / rows);
      let sum = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { sum += gray[yy * SIZE + xx]; n++; }
      grid[y * cols + x] = sum / n;
    }
  }
  const bits = new Uint8Array(64);
  for (let y = 0; y < rows; y++) for (let x = 0; x < 8; x++) bits[y * 8 + x] = grid[y * cols + x] > grid[y * cols + x + 1] ? 1 : 0;
  return bits;
}

const hamming = (a, b) => a.reduce((acc, bit, i) => acc + (bit !== b[i] ? 1 : 0), 0);

/** Distância L1 entre histogramas RGB de 16 bins, normalizada em 0..1. */
function histogramDistance(rgbA, rgbB) {
  const BINS = 16;
  let total = 0;
  for (let c = 0; c < 3; c++) {
    const ha = new Float32Array(BINS), hb = new Float32Array(BINS);
    for (let i = 0; i < PIXELS; i++) { ha[rgbA[i * 3 + c] >> 4]++; hb[rgbB[i * 3 + c] >> 4]++; }
    let l1 = 0;
    for (let k = 0; k < BINS; k++) l1 += Math.abs(ha[k] - hb[k]) / PIXELS;
    total += l1 / 2;
  }
  return total / 3;
}

/**
 * Distância média entre duas sequências de `count` frames.
 * Retorna componentes em escala bruta: ssimD (1-SSIM), hash (fração de bits diferentes), hist (0..1).
 */
export function sequenceDistance(bufA, bufB, count) {
  let ssimSum = 0, hashSum = 0, histSum = 0;
  for (let k = 0; k < count; k++) {
    const a = frameAt(bufA, k), b = frameAt(bufB, k);
    const ga = toGray(a), gb = toGray(b);
    ssimSum += ssim(ga, gb);
    hashSum += hamming(dHash(ga), dHash(gb)) / 64;
    histSum += histogramDistance(a, b);
  }
  return { ssimD: 1 - ssimSum / count, hash: hashSum / count, hist: histSum / count };
}

// ---------- áudio ----------

function fft(re, im) { // radix-2 in-place
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
}

/** Espectro médio de longo prazo em dB, bandas de 1/6 de oitava entre 100 Hz e 7 kHz. */
export function longTermSpectrumDb(samples, sampleRate = 16000, frame = 2048) {
  const power = new Float64Array(frame / 2);
  const hann = Float64Array.from({ length: frame }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frame - 1)));
  let frames = 0;
  for (let off = 0; off + frame <= samples.length; off += frame) {
    const re = new Float64Array(frame), im = new Float64Array(frame);
    for (let i = 0; i < frame; i++) re[i] = samples[off + i] * hann[i];
    fft(re, im);
    for (let k = 0; k < frame / 2; k++) power[k] += re[k] * re[k] + im[k] * im[k];
    frames++;
  }
  const binHz = sampleRate / frame;
  const bands = [];
  for (let f = 100; f * 2 ** (1 / 6) <= 7000; f *= 2 ** (1 / 6)) {
    const lo = Math.ceil(f / binHz), hi = Math.max(lo + 1, Math.floor((f * 2 ** (1 / 6)) / binHz));
    let sum = 0;
    for (let k = lo; k < hi; k++) sum += power[k];
    bands.push(10 * Math.log10(sum / Math.max(1, frames * (hi - lo)) + 1e-12));
  }
  return Float64Array.from(bands);
}

/** Diferença média (dB) do *formato* do espectro, ignorando ganho global (volume). */
export function spectralShapeDeltaDb(a, b) {
  const mean = (v) => v.reduce((s, x) => s + x, 0) / v.length;
  const offset = mean(a) - mean(b);
  return a.reduce((s, x, i) => s + Math.abs(x - b[i] - offset), 0) / a.length;
}
