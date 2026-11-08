import { describe, expect, it } from 'vitest';
import { FRAMING_ANCHORS, drawCandidates } from './draw';
import { FIXED_NOW, plan } from './fixtures';
import { LOOK_IDS } from './looks';

describe('drawCandidates', () => {
  it('é determinístico para a mesma semente', () => {
    expect(plan(10, 5)).toEqual(plan(10, 5));
  });

  it('sementes diferentes dão conjuntos diferentes', () => {
    expect(plan(10, 1)).not.toEqual(plan(10, 2));
  });

  it('numera as variações de 1 a N', () => {
    expect(plan(12).map((d) => d.index)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });

  it('usa um look diferente em cada uma das primeiras variações (rodízio)', () => {
    expect(new Set(plan(LOOK_IDS.length).map((d) => d.look)).size).toBe(LOOK_IDS.length);
  });

  it('usa uma âncora de recorte diferente em cada rodada de 9', () => {
    const anchors = plan(FRAMING_ANCHORS.length).map(
      (d) => `${Math.round(d.framing.anchorX)},${Math.round(d.framing.anchorY)}`,
    );
    expect(new Set(anchors).size).toBe(FRAMING_ANCHORS.length);
  });

  it('mantém os valores sorteados dentro das faixas esperadas', () => {
    for (const d of plan(60, 3)) {
      expect(Math.abs(d.framing.anchorX)).toBeLessThanOrEqual(1);
      expect(d.framing.zoom).toBeGreaterThanOrEqual(0.5);
      expect(d.timing.trimHead).toBeLessThanOrEqual(1);
      expect(d.encode.crf).toBeGreaterThanOrEqual(19);
      expect(d.encode.crf).toBeLessThanOrEqual(23);
      expect(d.capture.recordedAt.getTime()).toBeLessThan(FIXED_NOW.getTime());
    }
  });

  it('nunca espelha quando o espelhamento está desligado', () => {
    const draws = drawCandidates(30, { seed: 1, allowMirror: false, now: FIXED_NOW });
    expect(draws.some((d) => d.mirror)).toBe(false);
  });
});
