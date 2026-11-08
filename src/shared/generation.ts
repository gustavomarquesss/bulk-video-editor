import { z } from 'zod';
import { MAX_VARIATIONS } from './limits';

/** Pedido de geração vindo da interface. Validado na fronteira do processo principal. */
export const generationRequestSchema = z.object({
  sourcePath: z.string().min(1),
  count: z.number().int().min(1).max(MAX_VARIATIONS),
  /** Score de diferença desejado em relação ao original (0–100). */
  targetDifference: z.number().min(0).max(100),
  /** Quanto as variações devem se afastar umas das outras (0–1). */
  diversity: z.number().min(0).max(1),
  allowMirror: z.boolean(),
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;

export type GenerationStage = 'calibrating' | 'rendering';

export interface GenerationProgress {
  readonly stage: GenerationStage;
  readonly done: number;
  readonly total: number;
}

export interface VariantSummary {
  readonly index: number;
  readonly fileName: string;
  /** Diferença medida em relação ao original (0–100). */
  readonly score: number;
  /** `false` se nem a intensidade máxima alcançou o alvo. */
  readonly reachable: boolean;
  readonly look: string;
  readonly mirror: boolean;
  readonly voice: 'thicker' | 'thinner';
  readonly speed: number;
  readonly zoom: number;
  readonly device: string;
  readonly recordedAt: string;
}

export interface GenerationResult {
  readonly outputDir: string;
  readonly encoder: 'nvenc' | 'x264';
  readonly variants: readonly VariantSummary[];
  /** Diferença visual medida entre as variações (0–1): média e par mais parecido. */
  readonly separation: { readonly mean: number; readonly min: number };
  readonly elapsedSeconds: number;
}
