/** Análise espectral simples do áudio (usada para conferir que o ajuste de voz realmente mudou o som). */

/** FFT radix-2 in-place; `re.length` precisa ser potência de 2. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const stepRe = Math.cos(angle);
    const stepIm = Math.sin(angle);
    for (let start = 0; start < n; start += len) {
      let wRe = 1;
      let wIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = start + k;
        const b = start + k + len / 2;
        const tRe = re[b] * wRe - im[b] * wIm;
        const tIm = re[b] * wIm + im[b] * wRe;
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] = re[a] + tRe;
        im[a] = im[a] + tIm;
        [wRe, wIm] = [wRe * stepRe - wIm * stepIm, wRe * stepIm + wIm * stepRe];
      }
    }
  }
}

const BAND_RATIO = 2 ** (1 / 6); // bandas de 1/6 de oitava
const MIN_HZ = 100;
const MAX_HZ = 7000;

/** Espectro médio de longo prazo em dB, em bandas de 1/6 de oitava entre 100 Hz e 7 kHz. */
export function longTermSpectrumDb(
  samples: Float32Array,
  sampleRate = 16_000,
  frame = 2048,
): number[] {
  const power = new Float64Array(frame / 2);
  const window = Float64Array.from(
    { length: frame },
    (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frame - 1)),
  );
  let frames = 0;
  for (let offset = 0; offset + frame <= samples.length; offset += frame) {
    const re = new Float64Array(frame);
    const im = new Float64Array(frame);
    for (let i = 0; i < frame; i++) re[i] = samples[offset + i] * window[i];
    fft(re, im);
    for (let k = 0; k < frame / 2; k++) power[k] = power[k] + re[k] ** 2 + im[k] ** 2;
    frames++;
  }

  const binHz = sampleRate / frame;
  const bands: number[] = [];
  for (let f = MIN_HZ; f * BAND_RATIO <= MAX_HZ; f *= BAND_RATIO) {
    const lo = Math.ceil(f / binHz);
    const hi = Math.max(lo + 1, Math.floor((f * BAND_RATIO) / binHz));
    let sum = 0;
    for (let k = lo; k < hi; k++) sum += power[k];
    bands.push(10 * Math.log10(sum / Math.max(1, frames * (hi - lo)) + 1e-12));
  }
  return bands;
}

/** Diferença média (dB) do *formato* do espectro, ignorando o ganho global (volume). */
export function spectralShapeDeltaDb(a: readonly number[], b: readonly number[]): number {
  const mean = (values: readonly number[]) => values.reduce((s, v) => s + v, 0) / values.length;
  const offset = mean(a) - mean(b);
  return a.reduce((sum, value, i) => sum + Math.abs(value - b[i] - offset), 0) / a.length;
}
