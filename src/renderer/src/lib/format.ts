export const formatPercent = (value: number): string => `${Math.round(value)}%`;

export const formatRatioAsPercent = (ratio: number): string => formatPercent(ratio * 100);

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}min ${Math.round(seconds % 60)}s`;
}

/** Última parte de um caminho do Windows ou do Unix. */
export const fileNameOf = (path: string): string => path.split(/[\\/]/).pop() ?? path;

/** Variação de velocidade em relação ao original: 1,03 → "+3%". */
export function formatSpeed(speed: number): string {
  const change = Math.round((speed - 1) * 100);
  return change === 0 ? '0%' : `${change > 0 ? '+' : ''}${change}%`;
}
