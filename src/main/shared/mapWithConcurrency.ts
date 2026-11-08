/**
 * Executa `task` para cada item com no máximo `limit` execuções simultâneas, preservando a ordem do resultado.
 * Se uma tarefa falhar (ou o `signal` for abortado), nenhuma nova tarefa é iniciada.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let failed = false;

  const worker = async () => {
    while (next < items.length && !failed) {
      signal?.throwIfAborted();
      const index = next++;
      try {
        results[index] = await task(items[index], index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
