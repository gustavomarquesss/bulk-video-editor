import type { GenerationProgress, GenerationRequest, GenerationResult } from './generation';

/** Canais IPC entre o processo principal e a interface. */
export const IPC = {
  pickVideo: 'video:pick',
  startGeneration: 'generation:start',
  cancelGeneration: 'generation:cancel',
  generationProgress: 'generation:progress',
  openFolder: 'shell:open-folder',
} as const;

/** API exposta pelo preload em `window.desktop`. */
export interface DesktopApi {
  /** Abre o seletor de arquivos; devolve o caminho escolhido ou null se cancelado. */
  pickVideo: () => Promise<string | null>;
  startGeneration: (request: GenerationRequest) => Promise<GenerationResult>;
  cancelGeneration: () => Promise<void>;
  /** Registra um ouvinte de progresso; devolve a função que o remove. */
  onGenerationProgress: (listener: (progress: GenerationProgress) => void) => () => void;
  openFolder: (path: string) => Promise<void>;
  /** Caminho de um arquivo solto na janela (arrastar e soltar). */
  pathForFile: (file: File) => string;
}
