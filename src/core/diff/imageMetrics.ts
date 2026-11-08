/**
 * Métricas de imagem puras. Os frames chegam como RGB24 reduzidos para FRAME_SIZE × FRAME_SIZE,
 * concatenados em um único buffer (um frame após o outro).
 */

export const FRAME_SIZE = 96;
const PIXELS = FRAME_SIZE * FRAME_SIZE;
export const FRAME_BYTES = PIXELS * 3;

/** Diferença bruta entre duas sequências de frames, em escalas naturais de cada métrica. */
export interface RawDifference {
  /** 1 − SSIM médio (0 = idêntico). */
  readonly ssimLoss: number;
  /** Fração de bits diferentes do dHash de 64 bits (0..1; ~0,5 para imagens sem relação). */
  readonly hashDistance: number;
  /** Distância L1 normalizada entre histogramas RGB (0..1). */
  readonly histogramDistance: number;
}

export const frameAt = (frames: Uint8Array, index: number): Uint8Array =>
  frames.subarray(index * FRAME_BYTES, (index + 1) * FRAME_BYTES);

function toGray(rgb: Uint8Array): Float32Array {
  const gray = new Float32Array(PIXELS);
  for (let i = 0; i < PIXELS; i++) {
    gray[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2];
  }
  return gray;
}

/** Lado da imagem usada no SSIM: grossa o bastante para não punir deslocamentos de poucos pixels. */
const SSIM_SIZE = 32;

/** Reduz uma imagem em tons de cinza FRAME_SIZE² para SSIM_SIZE² (média por bloco). */
function downscaleForSsim(gray: Float32Array): Float32Array {
  const factor = FRAME_SIZE / SSIM_SIZE;
  const small = new Float32Array(SSIM_SIZE * SSIM_SIZE);
  for (let y = 0; y < SSIM_SIZE; y++) {
    for (let x = 0; x < SSIM_SIZE; x++) {
      let sum = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++)
          sum += gray[(y * factor + dy) * FRAME_SIZE + x * factor + dx];
      }
      small[y * SSIM_SIZE + x] = sum / (factor * factor);
    }
  }
  return small;
}

/** SSIM médio em blocos 4×4 não sobrepostos de imagens SSIM_SIZE² (1 = idêntico). */
export function ssim(a: Float32Array, b: Float32Array): number {
  const BLOCK = 4;
  const N = BLOCK * BLOCK;
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  let total = 0;
  let blocks = 0;
  for (let by = 0; by < SSIM_SIZE; by += BLOCK) {
    for (let bx = 0; bx < SSIM_SIZE; bx += BLOCK) {
      let sumA = 0,
        sumB = 0,
        sumAA = 0,
        sumBB = 0,
        sumAB = 0;
      for (let y = by; y < by + BLOCK; y++) {
        for (let x = bx; x < bx + BLOCK; x++) {
          const va = a[y * SSIM_SIZE + x];
          const vb = b[y * SSIM_SIZE + x];
          sumA += va;
          sumB += vb;
          sumAA += va * va;
          sumBB += vb * vb;
          sumAB += va * vb;
        }
      }
      const meanA = sumA / N;
      const meanB = sumB / N;
      const varA = sumAA / N - meanA * meanA;
      const varB = sumBB / N - meanB * meanB;
      const cov = sumAB / N - meanA * meanB;
      total +=
        ((2 * meanA * meanB + C1) * (2 * cov + C2)) /
        ((meanA ** 2 + meanB ** 2 + C1) * (varA + varB + C2));
      blocks++;
    }
  }
  return total / blocks;
}

/** dHash de 64 bits: compara vizinhos horizontais de uma grade 9×8 (média por área). */
export function dHash(gray: Float32Array): Uint8Array {
  const COLS = 9;
  const ROWS = 8;
  const grid = new Float32Array(COLS * ROWS);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x0 = Math.floor((col * FRAME_SIZE) / COLS);
      const x1 = Math.floor(((col + 1) * FRAME_SIZE) / COLS);
      const y0 = Math.floor((row * FRAME_SIZE) / ROWS);
      const y1 = Math.floor(((row + 1) * FRAME_SIZE) / ROWS);
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          sum += gray[y * FRAME_SIZE + x];
          n++;
        }
      grid[row * COLS + col] = sum / n;
    }
  }
  const bits = new Uint8Array(64);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < 8; col++) {
      bits[row * 8 + col] = grid[row * COLS + col] > grid[row * COLS + col + 1] ? 1 : 0;
    }
  }
  return bits;
}

const hammingDistance = (a: Uint8Array, b: Uint8Array): number =>
  a.reduce((acc, bit, i) => acc + (bit !== b[i] ? 1 : 0), 0);

/** Distância L1 entre histogramas RGB de 16 bins, normalizada em 0..1. */
function histogramDistance(a: Uint8Array, b: Uint8Array): number {
  const BINS = 16;
  let total = 0;
  for (let channel = 0; channel < 3; channel++) {
    const histA = new Float32Array(BINS);
    const histB = new Float32Array(BINS);
    for (let i = 0; i < PIXELS; i++) {
      histA[a[i * 3 + channel] >> 4]++;
      histB[b[i * 3 + channel] >> 4]++;
    }
    let l1 = 0;
    for (let k = 0; k < BINS; k++) l1 += Math.abs(histA[k] - histB[k]) / PIXELS;
    total += l1 / 2;
  }
  return total / 3;
}

/** Diferença média entre duas sequências de `count` frames. */
export function sequenceDifference(a: Uint8Array, b: Uint8Array, count: number): RawDifference {
  let ssimSum = 0;
  let hashSum = 0;
  let histSum = 0;
  for (let k = 0; k < count; k++) {
    const frameA = frameAt(a, k);
    const frameB = frameAt(b, k);
    const grayA = toGray(frameA);
    const grayB = toGray(frameB);
    ssimSum += ssim(downscaleForSsim(grayA), downscaleForSsim(grayB));
    hashSum += hammingDistance(dHash(grayA), dHash(grayB)) / 64;
    histSum += histogramDistance(frameA, frameB);
  }
  return {
    ssimLoss: 1 - ssimSum / count,
    hashDistance: hashSum / count,
    histogramDistance: histSum / count,
  };
}
