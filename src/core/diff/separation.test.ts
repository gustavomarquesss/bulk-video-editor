import { describe, expect, it } from 'vitest';
import { FRAME_BYTES } from './imageMetrics';
import { measureSeparation, selectMostSeparated } from './separation';

const solid = (value: [number, number, number]): Uint8Array =>
  Uint8Array.from({ length: FRAME_BYTES }, (_, i) => value[i % 3]);

describe('measureSeparation', () => {
  it('é zero para variações idênticas', () => {
    const result = measureSeparation([solid([10, 20, 30]), solid([10, 20, 30])], 1);
    expect(result.min).toBeCloseTo(0, 5);
    expect(result.mean).toBeCloseTo(0, 5);
  });

  it('conta diferença de cor, mesmo sem mudança de estrutura', () => {
    const result = measureSeparation([solid([200, 40, 40]), solid([40, 40, 200])], 1);
    expect(result.min).toBeGreaterThan(0.1);
  });

  it('o mínimo aponta o par mais parecido', () => {
    const a = solid([200, 40, 40]);
    const b = solid([205, 40, 40]);
    const c = solid([40, 40, 200]);
    const { min, mean } = measureSeparation([a, b, c], 1);
    expect(min).toBeLessThan(mean);
  });

  it('devolve zeros com menos de duas variações', () => {
    expect(measureSeparation([solid([1, 2, 3])], 1)).toEqual({ mean: 0, min: 0 });
  });
});

describe('selectMostSeparated', () => {
  const candidate = (value: [number, number, number]) => ({
    measurement: { frames: solid(value) },
  });

  it('descarta a quase-duplicata e mantém as mais diferentes', () => {
    const red = candidate([220, 30, 30]);
    const almostRed = candidate([222, 30, 30]);
    const blue = candidate([30, 30, 220]);
    const green = candidate([30, 220, 30]);
    const picked = selectMostSeparated([red, almostRed, blue, green], 3, 1);
    expect(picked).toContain(blue);
    expect(picked).toContain(green);
    expect(picked.filter((c) => c === red || c === almostRed)).toHaveLength(1);
  });
});
