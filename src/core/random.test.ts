import { describe, expect, it } from 'vitest';
import { clamp, createRandom, deriveSeed, pickOne, shuffled, shuffledCycle } from './random';

describe('createRandom', () => {
  it('gera a mesma sequência para a mesma semente', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
  });

  it('gera sequências diferentes para sementes diferentes', () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)());
  });

  it('mantém os valores em [0, 1)', () => {
    const random = createRandom(7);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('deriveSeed', () => {
  it('descorrelaciona sementes vizinhas', () => {
    const seeds = new Set([1, 2, 3, 4, 5].map((salt) => deriveSeed(42, salt)));
    expect(seeds.size).toBe(5);
  });
});

describe('pickOne', () => {
  it('falha com lista vazia', () => {
    expect(() => pickOne(createRandom(1), [])).toThrow();
  });
});

describe('shuffled / shuffledCycle', () => {
  const items = [1, 2, 3, 4, 5, 6, 7];

  it('não altera a entrada e preserva os elementos', () => {
    const result = shuffled(createRandom(3), items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect([...result].sort()).toEqual(items);
  });

  it('em cada volta completa usa todos os elementos exatamente uma vez', () => {
    const result = shuffledCycle(createRandom(9), items, 14);
    expect([...result.slice(0, 7)].sort()).toEqual(items);
    expect([...result.slice(7)].sort()).toEqual(items);
  });

  it('respeita o tamanho pedido', () => {
    expect(shuffledCycle(createRandom(9), items, 10)).toHaveLength(10);
  });
});

describe('clamp', () => {
  it('limita ao intervalo', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });
});
