import type { GenerationProgress } from '@shared/generation';

/** Descreve em palavras o que um score de diferença significa, para o usuário calibrar o slider. */
export function describeDifference(target: number): string {
  if (target < 25) return 'Sutil: quase igual ao original';
  if (target < 45) return 'Leve: ajustes discretos de enquadramento e cor';
  if (target < 65) return 'Moderada: enquadramento e cor claramente diferentes';
  if (target < 85) return 'Forte: parece outra edição do mesmo vídeo';
  return 'Muito forte: pode destoar do original';
}

export function describeDiversity(diversity: number): string {
  if (diversity < 0.15) return 'Sem seleção: variações podem se parecer entre si';
  if (diversity < 0.5) return 'Evita as variações mais parecidas';
  if (diversity < 0.85) return 'Escolhe as mais distintas entre si';
  return 'Máxima: analisa muitas candidatas (mais lento)';
}

/** A calibração ocupa os primeiros 40% do tempo percebido; o render, o restante. */
const CALIBRATION_SHARE = 0.4;

export function overallProgress(progress: GenerationProgress | null): number {
  if (!progress || progress.total === 0) return 0;
  const fraction = progress.done / progress.total;
  return progress.stage === 'calibrating'
    ? fraction * CALIBRATION_SHARE
    : CALIBRATION_SHARE + fraction * (1 - CALIBRATION_SHARE);
}

export const STAGE_LABEL: Readonly<Record<GenerationProgress['stage'], string>> = {
  calibrating: 'Medindo e calibrando as variações',
  rendering: 'Renderizando os vídeos',
};

export const LOOK_LABEL: Readonly<Record<string, string>> = {
  neutral: 'Neutro',
  warm: 'Quente',
  cool: 'Frio',
  film: 'Filme',
  vivid: 'Vívido',
  matte: 'Fosco',
  moody: 'Sombrio',
};
