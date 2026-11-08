import { describe, expect, it } from 'vitest';
import { minPairwiseDistance, selectDiverse } from './selection';

const line = (a: number, b: number) => Math.abs(a - b);

describe('selectDiverse', () => {
  it('escolhe os pontos mais afastados entre si (maximin)', () => {
    const picked = selectDiverse([0, 1, 2, 3, 10], 3, line);
    expect(picked).toContain(0);
    expect(picked).toContain(10);
    expect(minPairwiseDistance(picked, line)).toBeGreaterThanOrEqual(3);
  });

  it('devolve tudo quando pedem mais do que existe', () => {
    expect(selectDiverse([1, 2], 5, line)).toEqual([1, 2]);
  });

  it('não repete itens, mesmo com valores iguais', () => {
    const items = [{ v: 0 }, { v: 0 }, { v: 0 }, { v: 5 }, { v: 9 }];
    const picked = selectDiverse(items, 4, (a, b) => line(a.v, b.v));
    expect(new Set(picked).size).toBe(4);
  });

  it('afasta mais do que escolher os primeiros itens', () => {
    const items = [0, 0.1, 0.2, 0.3, 5, 10];
    const diverse = selectDiverse(items, 3, line);
    expect(minPairwiseDistance(diverse, line)).toBeGreaterThan(
      minPairwiseDistance(items.slice(0, 3), line),
    );
  });
});

describe('minPairwiseDistance', () => {
  it('é Infinity com menos de dois itens', () => {
    expect(minPairwiseDistance([1], line)).toBe(Infinity);
  });
});
