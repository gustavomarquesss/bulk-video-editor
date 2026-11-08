import { describe, expect, it } from 'vitest';
import { FRAME_BYTES, FRAME_SIZE, sequenceDifference } from './imageMetrics';

/** Frame RGB com gradiente horizontal (opcionalmente espelhado ou invertido). */
function gradientFrame({ mirror = false, invert = false } = {}): Uint8Array {
  const frame = new Uint8Array(FRAME_BYTES);
  for (let y = 0; y < FRAME_SIZE; y++) {
    for (let x = 0; x < FRAME_SIZE; x++) {
      const column = mirror ? FRAME_SIZE - 1 - x : x;
      let value = Math.round((column / (FRAME_SIZE - 1)) * 255);
      if (invert) value = 255 - value;
      frame.fill(value, (y * FRAME_SIZE + x) * 3, (y * FRAME_SIZE + x) * 3 + 3);
    }
  }
  return frame;
}

describe('sequenceDifference', () => {
  it('é zero para frames idênticos', () => {
    const frame = gradientFrame();
    const diff = sequenceDifference(frame, frame, 1);
    expect(diff.ssimLoss).toBeCloseTo(0, 5);
    expect(diff.hashDistance).toBe(0);
    expect(diff.histogramDistance).toBe(0);
  });

  it('detecta imagem espelhada pelo hash e pelo SSIM', () => {
    const diff = sequenceDifference(gradientFrame(), gradientFrame({ mirror: true }), 1);
    expect(diff.hashDistance).toBeGreaterThan(0.5);
    expect(diff.ssimLoss).toBeGreaterThan(0.3);
  });

  it('não vê diferença de histograma em imagem só espelhada, mas vê em imagem invertida de brilho', () => {
    const mirrored = sequenceDifference(gradientFrame(), gradientFrame({ mirror: true }), 1);
    expect(mirrored.histogramDistance).toBe(0);
  });

  it('calcula a média sobre vários frames', () => {
    const a = Uint8Array.from([...gradientFrame(), ...gradientFrame()]);
    const b = Uint8Array.from([...gradientFrame(), ...gradientFrame({ mirror: true })]);
    const one = sequenceDifference(gradientFrame(), gradientFrame({ mirror: true }), 1);
    expect(sequenceDifference(a, b, 2).hashDistance).toBeCloseTo(one.hashDistance / 2);
  });
});
