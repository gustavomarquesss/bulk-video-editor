import { describe, expect, it, vi } from 'vitest';
import type { DesktopApi } from '@shared/desktopApi';
import type { GenerationProgress, GenerationResult } from '@shared/generation';
import { DEFAULT_SETTINGS, createGenerationStore } from './generationStore';

const RESULT: GenerationResult = {
  outputDir: 'C:\\out',
  encoder: 'nvenc',
  variants: [],
  separation: { mean: 0.6, min: 0.2 },
  elapsedSeconds: 12,
};

function fakeApi(overrides: Partial<DesktopApi> = {}): DesktopApi {
  return {
    pickVideo: vi.fn(() => Promise.resolve<string | null>('C:\\video.mp4')),
    startGeneration: vi.fn(() => Promise.resolve(RESULT)),
    cancelGeneration: vi.fn(() => Promise.resolve()),
    onGenerationProgress: vi.fn(() => () => undefined),
    openFolder: vi.fn(() => Promise.resolve()),
    pathForFile: (file) => file.name,
    ...overrides,
  };
}

describe('generationStore', () => {
  it('começa ocioso, sem vídeo e com as configurações padrão', () => {
    const state = createGenerationStore(fakeApi()).getState();
    expect(state.phase).toBe('idle');
    expect(state.sourcePath).toBeNull();
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('guarda o vídeo escolhido e ignora o cancelamento do seletor', async () => {
    const store = createGenerationStore(fakeApi());
    await store.getState().pickSource();
    expect(store.getState().sourcePath).toBe('C:\\video.mp4');

    const cancelled = createGenerationStore(fakeApi({ pickVideo: () => Promise.resolve(null) }));
    await cancelled.getState().pickSource();
    expect(cancelled.getState().sourcePath).toBeNull();
  });

  it('atualiza só os ajustes informados', () => {
    const store = createGenerationStore(fakeApi());
    store.getState().updateSettings({ count: 30 });
    expect(store.getState().settings).toEqual({ ...DEFAULT_SETTINGS, count: 30 });
  });

  it('não inicia sem vídeo', async () => {
    const api = fakeApi();
    await createGenerationStore(api).getState().start();
    expect(api.startGeneration).not.toHaveBeenCalled();
  });

  it('envia o pedido completo e termina em "done" com o resultado', async () => {
    const api = fakeApi();
    const store = createGenerationStore(api);
    store.getState().setSource('C:\\video.mp4');
    store.getState().updateSettings({ targetDifference: 70 });

    await store.getState().start();

    expect(api.startGeneration).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      targetDifference: 70,
      sourcePath: 'C:\\video.mp4',
    });
    expect(store.getState().phase).toBe('done');
    expect(store.getState().result).toEqual(RESULT);
  });

  it('repassa o progresso e remove o ouvinte ao terminar', async () => {
    const stop = vi.fn();
    let emit: (p: GenerationProgress) => void = () => undefined;
    const api = fakeApi({
      onGenerationProgress: (listener) => {
        emit = listener;
        return stop;
      },
      startGeneration: () => {
        emit({ stage: 'rendering', done: 2, total: 5 });
        return Promise.resolve(RESULT);
      },
    });
    const store = createGenerationStore(api);
    store.getState().setSource('C:\\video.mp4');
    await store.getState().start();

    expect(store.getState().progress).toEqual({ stage: 'rendering', done: 2, total: 5 });
    expect(stop).toHaveBeenCalledOnce();
  });

  it('vai para "failed" com a mensagem do erro', async () => {
    const store = createGenerationStore(
      fakeApi({ startGeneration: () => Promise.reject(new Error('ffmpeg quebrou')) }),
    );
    store.getState().setSource('C:\\video.mp4');
    await store.getState().start();
    expect(store.getState().phase).toBe('failed');
    expect(store.getState().error).toBe('ffmpeg quebrou');
  });

  it('abre a pasta de saída do resultado', async () => {
    const api = fakeApi();
    const store = createGenerationStore(api);
    store.getState().setSource('C:\\video.mp4');
    await store.getState().start();
    await store.getState().openOutputFolder();
    expect(api.openFolder).toHaveBeenCalledWith('C:\\out');
  });
});
