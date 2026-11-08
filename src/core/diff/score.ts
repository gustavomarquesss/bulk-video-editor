import { clamp01 } from '../random';
import type { VariationParams } from '../variation/types';
import type { RawDifference } from './imageMetrics';

/**
 * Score de diferença (0–100) = 100 · (0,60·visual + 0,15·tempo + 0,25·áudio).
 *
 *  - visual: medido em frames amostrados (SSIM, dHash, histograma). O espelhamento não conta,
 *            pois fingerprints costumam ser robustos a flip.
 *  - tempo:  declarado pelos parâmetros (velocidade e cortes de início/fim).
 *  - áudio:  declarado pelos parâmetros (semitons de pitch e ganho de EQ).
 */
export const SCORE_WEIGHTS = { visual: 0.6, timing: 0.15, audio: 0.25 } as const;

/** Valor de cada métrica bruta que satura o componente visual (calibrado com vídeo real). */
export const SATURATION = { ssimLoss: 0.6, hashDistance: 0.3, histogramDistance: 0.3 } as const;

export interface ScoreBreakdown {
  /** 0–100. */
  readonly score: number;
  readonly visual: number;
  readonly timing: number;
  readonly audio: number;
}

/** Combina as métricas brutas num número 0–1 (cada uma satura em `SATURATION`). */
export const visualComponent = (raw: RawDifference): number =>
  0.5 * clamp01(raw.ssimLoss / SATURATION.ssimLoss) +
  0.3 * clamp01(raw.hashDistance / SATURATION.hashDistance) +
  0.2 * clamp01(raw.histogramDistance / SATURATION.histogramDistance);

const timingComponent = ({ timing }: VariationParams): number =>
  0.6 * clamp01(Math.abs(1 - timing.speed) / 0.08) +
  0.4 * clamp01((timing.trimHeadSeconds + timing.trimTailSeconds) / 1);

const audioComponent = ({ audio }: VariationParams): number => {
  const semitones = Math.abs(12 * Math.log2(audio.pitch));
  return (
    0.5 * clamp01(semitones / 1) +
    0.5 * clamp01((Math.abs(audio.bassDb) + Math.abs(audio.trebleDb)) / 8)
  );
};

export function computeScore(params: VariationParams, raw: RawDifference): ScoreBreakdown {
  const visual = visualComponent(raw);
  const timing = timingComponent(params);
  const audio = audioComponent(params);
  const score =
    100 *
    (SCORE_WEIGHTS.visual * visual + SCORE_WEIGHTS.timing * timing + SCORE_WEIGHTS.audio * audio);
  return { score, visual, timing, audio };
}
