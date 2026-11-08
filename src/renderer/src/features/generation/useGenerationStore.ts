import { useStore } from 'zustand';
import { getDesktopApi } from '@renderer/lib/desktop';
import { createGenerationStore, type GenerationState } from './generationStore';

/** Instância única da tela; os testes criam a sua própria com `createGenerationStore`. */
const store = createGenerationStore(getDesktopApi());

export const useGenerationStore = <T>(selector: (state: GenerationState) => T): T =>
  useStore(store, selector);
