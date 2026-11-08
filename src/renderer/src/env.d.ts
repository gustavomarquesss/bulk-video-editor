import type { DesktopApi } from '@shared/desktopApi';

declare global {
  interface Window {
    /** Exposto pelo preload; ausente quando a interface roda num navegador comum. */
    desktop?: DesktopApi;
  }
}
