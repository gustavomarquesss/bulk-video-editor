import { drawCandidates } from './draw';
import type { VariationDraw } from './types';

/** Data fixa para que os testes não dependam do relógio. */
export const FIXED_NOW = new Date('2026-11-08T12:00:00Z');

export function plan(count: number, seed = 1): VariationDraw[] {
  return drawCandidates(count, { seed, allowMirror: true, now: FIXED_NOW });
}
