/** Com diversidade 1, sorteamos (1 + POOL_GROWTH)× mais candidatas do que o pedido. */
const POOL_GROWTH = 3;

/**
 * Quantas variações candidatas sortear para entregar `count`: quanto mais diversidade, maior o
 * conjunto do qual escolhemos as mais afastadas entre si.
 */
export function candidatePoolSize(count: number, diversity: number): number {
  return count * (1 + Math.round(diversity * POOL_GROWTH));
}
