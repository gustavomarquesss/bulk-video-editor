import { selectDiverse } from '../selection';
import { sequenceDifference } from './imageMetrics';
import { visualComponent } from './score';

export interface Separation {
  /** Diferença visual média entre todos os pares de variações (0–1). */
  readonly mean: number;
  /** Diferença visual do par mais parecido (0–1): é o ponto fraco do conjunto. */
  readonly min: number;
}

/**
 * Diferença visual (0–1) entre duas variações, com o mesmo componente usado contra o original
 * (estrutura, hash e cor), para que mudanças de cor também contem como diferença.
 */
export function visualDistance(a: Uint8Array, b: Uint8Array, frameCount: number): number {
  return visualComponent(sequenceDifference(a, b, frameCount));
}

export function measureSeparation(
  sequences: readonly Uint8Array[],
  frameCount: number,
): Separation {
  const differences: number[] = [];
  sequences.forEach((a, i) => {
    for (let j = i + 1; j < sequences.length; j++) {
      differences.push(visualDistance(a, sequences[j], frameCount));
    }
  });
  if (differences.length === 0) return { mean: 0, min: 0 };
  return {
    mean: differences.reduce((sum, value) => sum + value, 0) / differences.length,
    min: Math.min(...differences),
  };
}

interface HasFrames {
  readonly measurement: { readonly frames: Uint8Array };
}

/** Escolhe, entre as candidatas já medidas, as `count` mais afastadas entre si em aparência. */
export function selectMostSeparated<T extends HasFrames>(
  candidates: readonly T[],
  count: number,
  frameCount: number,
): T[] {
  return selectDiverse(candidates, count, (a, b) =>
    visualDistance(a.measurement.frames, b.measurement.frames, frameCount),
  );
}
