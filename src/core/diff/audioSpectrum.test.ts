import { describe, expect, it } from 'vitest';
import { createRandom } from '../random';
import { longTermSpectrumDb, spectralShapeDeltaDb } from './audioSpectrum';

const SAMPLE_RATE = 16_000;

function sine(frequency: number, seconds = 2, amplitude = 0.5): Float32Array {
  return Float32Array.from(
    { length: SAMPLE_RATE * seconds },
    (_, i) => amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE),
  );
}

const loudestBand = (spectrum: number[]) => spectrum.indexOf(Math.max(...spectrum));

describe('longTermSpectrumDb', () => {
  it('concentra a energia na banda da frequência do tom', () => {
    const low = loudestBand(longTermSpectrumDb(sine(300)));
    const high = loudestBand(longTermSpectrumDb(sine(3000)));
    expect(high).toBeGreaterThan(low);
  });
});

describe('spectralShapeDeltaDb', () => {
  it('é zero para o mesmo áudio', () => {
    const spectrum = longTermSpectrumDb(sine(440));
    expect(spectralShapeDeltaDb(spectrum, spectrum)).toBe(0);
  });

  it('ignora mudança de volume global', () => {
    // ruído branco: todas as bandas têm energia, então o ganho se aplica uniformemente
    const random = createRandom(11);
    const noise = Float32Array.from({ length: SAMPLE_RATE * 2 }, () => random() - 0.5);
    const quiet = longTermSpectrumDb(noise.map((v) => v * 0.2));
    const loud = longTermSpectrumDb(noise);
    expect(spectralShapeDeltaDb(quiet, loud)).toBeCloseTo(0, 1);
  });

  it('detecta mudança de timbre (tom diferente)', () => {
    const a = longTermSpectrumDb(sine(440));
    const b = longTermSpectrumDb(sine(1500));
    expect(spectralShapeDeltaDb(a, b)).toBeGreaterThan(3);
  });
});
