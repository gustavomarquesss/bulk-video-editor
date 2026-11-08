import { describe, expect, it } from 'vitest';
import { candidatePoolSize } from './pool';

describe('candidatePoolSize', () => {
  it('sem diversidade não sorteia candidatas extras', () => {
    expect(candidatePoolSize(20, 0)).toBe(20);
  });

  it('cresce com a diversidade', () => {
    expect(candidatePoolSize(20, 0.5)).toBeGreaterThan(candidatePoolSize(20, 0));
    expect(candidatePoolSize(20, 1)).toBeGreaterThan(candidatePoolSize(20, 0.5));
  });

  it('nunca devolve menos do que o pedido', () => {
    for (const diversity of [0, 0.2, 0.7, 1])
      expect(candidatePoolSize(15, diversity)).toBeGreaterThanOrEqual(15);
  });
});
