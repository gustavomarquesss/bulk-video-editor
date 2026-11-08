import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './mapWithConcurrency';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('mapWithConcurrency', () => {
  it('preserva a ordem dos resultados', async () => {
    const result = await mapWithConcurrency([30, 5, 15], 3, async (ms, i) => {
      await delay(ms);
      return i;
    });
    expect(result).toEqual([0, 1, 2]);
  });

  it('nunca excede o limite de execuções simultâneas', async () => {
    let running = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 10 }), 3, async () => {
      peak = Math.max(peak, ++running);
      await delay(5);
      running--;
    });
    expect(peak).toBe(3);
  });

  it('para de iniciar tarefas depois de uma falha', async () => {
    let started = 0;
    await expect(
      mapWithConcurrency(Array.from({ length: 20 }), 2, async (_, i) => {
        started++;
        await delay(2);
        if (i === 1) throw new Error('falhou');
      }),
    ).rejects.toThrow('falhou');
    expect(started).toBeLessThan(20);
  });

  it('respeita o cancelamento', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      mapWithConcurrency([1, 2], 1, () => Promise.resolve(1), controller.signal),
    ).rejects.toThrow();
  });
});
