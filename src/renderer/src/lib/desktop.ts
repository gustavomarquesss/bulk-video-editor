import type { DesktopApi } from '@shared/desktopApi';
import { createPreviewDesktopApi } from './previewDesktopApi';

/** `true` quando a interface roda fora do Electron (por exemplo, no navegador durante o desenvolvimento). */
export const isPreviewMode = (): boolean => window.desktop === undefined;

/** API do processo principal; em navegador comum devolve uma simulação para visualizar a tela. */
export function getDesktopApi(): DesktopApi {
  return window.desktop ?? createPreviewDesktopApi();
}
