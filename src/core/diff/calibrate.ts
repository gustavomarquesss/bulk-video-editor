import { resolveParams } from '../variation/strength';
import {
  DEFAULT_WEIGHTS,
  type CategoryWeights,
  type VariationDraw,
  type VariationParams,
} from '../variation/types';
import type { RawDifference } from './imageMetrics';
import type { ScoreBreakdown } from './score';

/** Resultado de medir uma variação: score, componentes, métricas brutas e os frames reduzidos. */
export interface Measurement extends ScoreBreakdown {
  readonly raw: RawDifference;
  readonly frames: Uint8Array;
}

/** Porta de entrada para quem sabe medir uma variação (na prática, o ffmpeg). */
export type MeasureVariation = (params: VariationParams) => Promise<Measurement>;

export interface CalibrationRequest {
  readonly draw: VariationDraw;
  /** Score desejado (0–100). */
  readonly target: number;
  readonly measure: MeasureVariation;
  readonly weights?: CategoryWeights;
  /** Erro aceito, em pontos de score. */
  readonly tolerance?: number;
  readonly maxIterations?: number;
}

export interface CalibrationResult {
  readonly params: VariationParams;
  readonly measurement: Measurement;
  readonly strength: number;
  /** `false` quando nem a intensidade máxima alcança o alvo. */
  readonly reachable: boolean;
  readonly iterations: number;
}

/**
 * Busca binária da intensidade s ∈ [0,1] cujo score fica a ±`tolerance` do alvo.
 * Como o sorteio é fixo, o score cresce com s e a busca converge.
 */
export async function calibrateStrength(request: CalibrationRequest): Promise<CalibrationResult> {
  const {
    draw,
    target,
    measure,
    weights = DEFAULT_WEIGHTS,
    tolerance = 1.5,
    maxIterations = 9,
  } = request;

  const evaluate = async (strength: number) => {
    const params = resolveParams(draw, strength, weights);
    return { strength, params, measurement: await measure(params) };
  };

  const ceiling = await evaluate(1);
  if (ceiling.measurement.score < target - tolerance) {
    return { ...ceiling, reachable: false, iterations: 1 };
  }

  let low = 0;
  let high = 1;
  let best = ceiling;
  let iterations = 1;
  const error = (candidate: typeof best) => Math.abs(candidate.measurement.score - target);

  while (iterations < maxIterations) {
    const candidate = await evaluate((low + high) / 2);
    iterations++;
    if (error(candidate) < error(best)) best = candidate;
    if (error(candidate) <= tolerance) break;
    if (candidate.measurement.score < target) low = candidate.strength;
    else high = candidate.strength;
  }
  return { ...best, reachable: true, iterations };
}
