import { describe, expect, it } from 'vitest';
import { plan } from '../variation/fixtures';
import { calibrateStrength, type MeasureVariation } from './calibrate';

const draw = plan(1)[0];

/** Medidor falso: o score é uma função simples da intensidade. */
const linearMeter =
  (maxScore: number): MeasureVariation =>
  (params) =>
    Promise.resolve({
      score: maxScore * params.strength,
      visual: 0,
      timing: 0,
      audio: 0,
      raw: { ssimLoss: 0, hashDistance: 0, histogramDistance: 0 },
      frames: new Uint8Array(),
    });

describe('calibrateStrength', () => {
  it.each([10, 40, 75])('converge para o alvo %i dentro da tolerância', async (target) => {
    const result = await calibrateStrength({
      draw,
      target,
      measure: linearMeter(100),
      tolerance: 1,
    });
    expect(result.reachable).toBe(true);
    expect(Math.abs(result.measurement.score - target)).toBeLessThanOrEqual(1);
    expect(result.params.strength).toBeCloseTo(target / 100, 1);
  });

  it('avisa quando o alvo é inalcançável e devolve a intensidade máxima', async () => {
    const result = await calibrateStrength({ draw, target: 80, measure: linearMeter(50) });
    expect(result.reachable).toBe(false);
    expect(result.strength).toBe(1);
  });

  it('respeita o limite de iterações', async () => {
    const result = await calibrateStrength({
      draw,
      target: 33,
      measure: linearMeter(100),
      tolerance: 0,
      maxIterations: 4,
    });
    expect(result.iterations).toBeLessThanOrEqual(4);
  });
});
