import type { DesktopApi } from '@shared/desktopApi';
import type {
  GenerationProgress,
  GenerationRequest,
  GenerationResult,
  VariantSummary,
} from '@shared/generation';

const LOOKS = ['warm', 'cool', 'film', 'vivid', 'matte', 'moody', 'neutral'];
const DEVICES = [
  'Apple iPhone 15',
  'samsung SM-S921B',
  'Google Pixel 8',
  'Apple iPhone 13',
  'Xiaomi 2312DRA50G',
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fakeVariants(request: GenerationRequest): VariantSummary[] {
  return Array.from({ length: request.count }, (_, i) => ({
    index: i + 1,
    fileName: `exemplo_v${String(i + 1).padStart(3, '0')}.mp4`,
    score: request.targetDifference + ((i * 7) % 5) - 2,
    reachable: true,
    look: LOOKS[i % LOOKS.length],
    mirror: i % 2 === 0,
    voice: i % 3 === 0 ? 'thicker' : 'thinner',
    speed: 1 + (((i * 3) % 9) - 4) / 100,
    zoom: 1 + ((i * 5) % 12) / 100,
    device: DEVICES[i % DEVICES.length],
    recordedAt: new Date(Date.now() - i * 86_400_000).toISOString(),
  }));
}

/** Simulação do processo principal, usada só quando a interface roda fora do Electron. */
export function createPreviewDesktopApi(): DesktopApi {
  const listeners = new Set<(progress: GenerationProgress) => void>();
  const emit = (progress: GenerationProgress) =>
    listeners.forEach((listener) => listener(progress));
  let cancelled = false;

  return {
    pickVideo: () => Promise.resolve('C:\\Videos\\exemplo.mp4'),
    pathForFile: (file) => file.name,
    openFolder: () => Promise.resolve(),
    cancelGeneration: () => {
      cancelled = true;
      return Promise.resolve();
    },
    onGenerationProgress: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async startGeneration(request): Promise<GenerationResult> {
      cancelled = false;
      for (const stage of ['calibrating', 'rendering'] as const) {
        for (let done = 1; done <= request.count; done++) {
          if (cancelled) throw new Error('Geração cancelada.');
          await wait(60);
          emit({ stage, done, total: request.count });
        }
      }
      return {
        outputDir: 'C:\\Videos\\Bulk Video Editor\\exemplo-20261108-180000',
        encoder: 'nvenc',
        variants: fakeVariants(request),
        separation: { mean: 0.62, min: 0.21 },
        elapsedSeconds: 31.4,
      };
    },
  };
}
