export type Distance<T> = (a: T, b: T) => number;

/**
 * Escolhe `count` itens maximizando a menor distância entre quaisquer dois escolhidos
 * (algoritmo guloso "farthest-point": cada passo adiciona o candidato mais distante do conjunto atual).
 */
export function selectDiverse<T>(
  candidates: readonly T[],
  count: number,
  distance: Distance<T>,
): T[] {
  if (count >= candidates.length) return [...candidates];

  const taken = new Array<boolean>(candidates.length).fill(false);
  // distância de cada candidato ao conjunto já escolhido (a menor delas)
  const nearest = new Array<number>(candidates.length).fill(Infinity);
  const selected: T[] = [];

  let next = 0; // o primeiro candidato abre o conjunto
  while (selected.length < count) {
    taken[next] = true;
    const chosen = candidates[next];
    selected.push(chosen);
    candidates.forEach((candidate, i) => {
      if (!taken[i]) nearest[i] = Math.min(nearest[i], distance(candidate, chosen));
    });
    next = farthestUntaken(nearest, taken);
  }
  return selected;
}

/** Índice do candidato ainda não escolhido com a maior distância ao conjunto (empate: o primeiro). */
function farthestUntaken(nearest: readonly number[], taken: readonly boolean[]): number {
  let best = -1;
  nearest.forEach((value, i) => {
    if (!taken[i] && (best < 0 || value > nearest[best])) best = i;
  });
  return best;
}

/** Menor distância entre quaisquer dois itens (Infinity se houver menos de dois). */
export function minPairwiseDistance<T>(items: readonly T[], distance: Distance<T>): number {
  let min = Infinity;
  items.forEach((a, i) => {
    for (let j = i + 1; j < items.length; j++) min = Math.min(min, distance(a, items[j]));
  });
  return min;
}
