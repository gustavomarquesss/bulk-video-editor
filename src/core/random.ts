/** Função que devolve um número em [0, 1). Sempre determinística para uma dada semente. */
export type Random = () => number;

/** Gerador mulberry32: mesma semente, mesma sequência. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mistura `seed` e `salt` num novo inteiro de 32 bits (sementes vizinhas não ficam correlacionadas). */
export function deriveSeed(seed: number, salt: number): number {
  let h = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export const randomBetween = (random: Random, min: number, max: number): number =>
  min + (max - min) * random();

export const randomSign = (random: Random): 1 | -1 => (random() < 0.5 ? -1 : 1);

export function pickOne<T>(random: Random, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('pickOne: lista vazia');
  return item;
}

/** Fisher–Yates sem mutar a entrada. */
export function shuffled<T>(random: Random, items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Repete `items` (embaralhando a cada volta) até ter `length` elementos. */
export function shuffledCycle<T>(random: Random, items: readonly T[], length: number): T[] {
  const result: T[] = [];
  while (result.length < length) result.push(...shuffled(random, items));
  return result.slice(0, length);
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const clamp01 = (value: number): number => clamp(value, 0, 1);
