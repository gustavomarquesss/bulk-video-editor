import { describe, expect, it } from 'vitest';
import { plan } from './fixtures';
import { resolveParams } from './strength';

const [draw] = plan(1);

describe('resolveParams', () => {
  it('com intensidade 0 não altera nada (identidade)', () => {
    const p = resolveParams(draw, 0);
    expect(p.framing.zoom).toBe(1);
    expect(p.color.contrast).toBe(1);
    expect(p.color.saturation).toBe(1);
    expect(p.color.temperatureKelvin).toBe(6500);
    expect(p.timing.speed).toBe(1);
    expect(p.timing.trimHeadSeconds).toBe(0);
    expect(p.audio.pitch).toBe(1);
    expect(p.audio.bassDb).toBeCloseTo(0);
  });

  it('cresce de forma monotônica com a intensidade', () => {
    const effect = (s: number) => {
      const p = resolveParams(draw, s);
      return [
        p.framing.zoom - 1,
        Math.abs(p.color.contrast - 1),
        Math.abs(p.timing.speed - 1),
        Math.abs(1 - p.audio.pitch),
      ];
    };
    const low = effect(0.2);
    const high = effect(0.8);
    low.forEach((value, i) => expect(high[i]).toBeGreaterThanOrEqual(value));
  });

  it('peso 0 desliga a categoria inteira', () => {
    const p = resolveParams(draw, 1, { framing: 0, color: 0, timing: 0, audio: 1 });
    expect(p.framing.zoom).toBe(1);
    expect(p.color.contrast).toBe(1);
    expect(p.timing.speed).toBe(1);
    expect(p.audio.pitch).not.toBe(1);
  });

  it('voz mais grossa (tone +1) baixa o pitch e reforça graves; mais fina faz o oposto', () => {
    const thick = plan(40).find((d) => d.audio.tone === 1)!;
    const thin = plan(40).find((d) => d.audio.tone === -1)!;
    const a = resolveParams(thick, 1);
    const b = resolveParams(thin, 1);
    expect(a.audio.pitch).toBeLessThan(1);
    expect(a.audio.bassDb).toBeGreaterThan(0);
    expect(a.audio.trebleDb).toBeLessThan(0);
    expect(b.audio.pitch).toBeGreaterThan(1);
    expect(b.audio.bassDb).toBeLessThan(0);
  });
});
