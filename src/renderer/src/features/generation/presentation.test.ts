import { describe, expect, it } from 'vitest';
import { describeDifference, describeDiversity, overallProgress } from './presentation';

describe('describeDifference', () => {
  it('muda de descrição conforme a faixa', () => {
    const labels = [10, 30, 55, 75, 95].map(describeDifference);
    expect(new Set(labels).size).toBe(5);
  });
});

describe('describeDiversity', () => {
  it('muda de descrição conforme a faixa', () => {
    expect(new Set([0, 0.3, 0.7, 1].map(describeDiversity)).size).toBe(4);
  });
});

describe('overallProgress', () => {
  it('é zero sem progresso', () => {
    expect(overallProgress(null)).toBe(0);
  });

  it('calibração ocupa a primeira parte e o render o resto, de forma contínua', () => {
    expect(overallProgress({ stage: 'calibrating', done: 10, total: 10 })).toBeCloseTo(0.4);
    expect(overallProgress({ stage: 'rendering', done: 0, total: 10 })).toBeCloseTo(0.4);
    expect(overallProgress({ stage: 'rendering', done: 10, total: 10 })).toBeCloseTo(1);
  });

  it('cresce de forma monotônica', () => {
    const values = [
      overallProgress({ stage: 'calibrating', done: 3, total: 10 }),
      overallProgress({ stage: 'calibrating', done: 9, total: 10 }),
      overallProgress({ stage: 'rendering', done: 4, total: 10 }),
    ];
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });
});
