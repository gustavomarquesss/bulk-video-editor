import { createStore } from 'zustand/vanilla';
import type { DesktopApi } from '@shared/desktopApi';
import type { GenerationProgress, GenerationRequest, GenerationResult } from '@shared/generation';

export type GenerationPhase = 'idle' | 'running' | 'done' | 'failed';

export type GenerationSettings = Omit<GenerationRequest, 'sourcePath'>;

export const DEFAULT_SETTINGS: GenerationSettings = {
  count: 20,
  targetDifference: 55,
  diversity: 0.7,
  allowMirror: true,
};

export interface GenerationState {
  readonly sourcePath: string | null;
  readonly settings: GenerationSettings;
  readonly phase: GenerationPhase;
  readonly progress: GenerationProgress | null;
  readonly result: GenerationResult | null;
  readonly error: string | null;

  setSource: (path: string) => void;
  pickSource: () => Promise<void>;
  updateSettings: (changes: Partial<GenerationSettings>) => void;
  start: () => Promise<void>;
  cancel: () => Promise<void>;
  openOutputFolder: () => Promise<void>;
}

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** A API do desktop é injetada: no app vem do preload, nos testes é um dublê. */
export function createGenerationStore(api: DesktopApi) {
  return createStore<GenerationState>()((set, get) => ({
    sourcePath: null,
    settings: DEFAULT_SETTINGS,
    phase: 'idle',
    progress: null,
    result: null,
    error: null,

    setSource: (path) =>
      set({ sourcePath: path, phase: 'idle', result: null, error: null, progress: null }),

    async pickSource() {
      const path = await api.pickVideo();
      if (path) get().setSource(path);
    },

    updateSettings: (changes) => set((state) => ({ settings: { ...state.settings, ...changes } })),

    async start() {
      const { sourcePath, settings, phase } = get();
      if (!sourcePath || phase === 'running') return;

      set({ phase: 'running', progress: null, result: null, error: null });
      const stopListening = api.onGenerationProgress((progress) => set({ progress }));
      try {
        const result = await api.startGeneration({ ...settings, sourcePath });
        set({ phase: 'done', result });
      } catch (error) {
        set({ phase: 'failed', error: messageOf(error) });
      } finally {
        stopListening();
      }
    },

    cancel: () => api.cancelGeneration(),

    async openOutputFolder() {
      const outputDir = get().result?.outputDir;
      if (outputDir) await api.openFolder(outputDir);
    },
  }));
}

export type GenerationStore = ReturnType<typeof createGenerationStore>;
