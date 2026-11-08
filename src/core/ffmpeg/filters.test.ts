import { describe, expect, it } from 'vitest';
import { plan } from '../variation/fixtures';
import { resolveParams } from '../variation/strength';
import { buildAudioFilter, buildSpatialFilter, buildVideoFilter } from './filters';

const FRAME = { width: 480, height: 854 };
const draw = plan(1)[0];
const neutral = resolveParams({ ...draw, mirror: false }, 0);
const strong = resolveParams({ ...draw, mirror: true }, 1);

describe('buildSpatialFilter', () => {
  it('com intensidade 0 só reenquadra e converte formato (sem filtros opcionais)', () => {
    const filter = buildSpatialFilter(neutral, FRAME);
    expect(filter).toContain('crop=480:854:');
    for (const optional of ['hflip', 'colortemperature', 'hue=', 'unsharp', 'vignette', 'noise']) {
      expect(filter).not.toContain(optional);
    }
    expect(filter.endsWith('format=yuv420p')).toBe(true);
  });

  it('espelha apenas quando a variação pede e a medição não pede ignorar', () => {
    expect(buildSpatialFilter(strong, FRAME)).toMatch(/^hflip,/);
    expect(buildSpatialFilter(strong, FRAME, { mirror: false })).not.toContain('hflip');
  });

  it('gera dimensões de recorte pares e dentro do quadro', () => {
    const filter = buildSpatialFilter(strong, FRAME);
    const [, w, h, x, y] = /crop=(\d+):(\d+):(\d+):(\d+)/.exec(filter)!.map(Number);
    expect(w % 2).toBe(0);
    expect(h % 2).toBe(0);
    expect(x + w).toBeLessThanOrEqual(FRAME.width);
    expect(y + h).toBeLessThanOrEqual(FRAME.height);
  });
});

describe('buildVideoFilter', () => {
  it('aplica o corte de início/fim antes dos efeitos e a velocidade por último', () => {
    const filter = buildVideoFilter(strong, FRAME, 11);
    expect(filter.startsWith('trim=start=')).toBe(true);
    expect(filter).toMatch(/setpts=PTS\/[\d.]+$/);
  });

  it('não corta nada com intensidade 0', () => {
    expect(buildVideoFilter(neutral, FRAME, 11)).not.toContain('trim=');
  });
});

describe('buildAudioFilter', () => {
  it('usa rubberband com pitch e tempo da variação', () => {
    const filter = buildAudioFilter(strong, 11);
    expect(filter).toContain('rubberband=pitch=');
    expect(filter).toContain(`tempo=${strong.timing.speed.toFixed(4)}`);
    expect(filter).toMatch(/volume=[\d.]+$/);
  });

  it('omite o EQ quando não há ganho', () => {
    const filter = buildAudioFilter(neutral, 11);
    expect(filter).not.toContain('bass=');
    expect(filter).not.toContain('treble=');
  });
});
