/**
 * Remove o branco de uma imagem RGBA (todo ele, inclusive o de dentro do desenho).
 *
 * Cada pixel é tratado como a mistura `pixel = a·cor + (1 − a)·branco`:
 *  - `a` (opacidade) é estimado pelo quão longe o pixel está do branco;
 *  - a cor original é "desmisturada" do branco, para que as bordas suavizadas do desenho
 *    fiquem semitransparentes em vez de ganhar um contorno claro sobre fundos escuros.
 */

/** Canal mais escuro típico do desenho: abaixo disso o pixel é considerado totalmente opaco. */
const FOREGROUND_MIN_CHANNEL = 70;

/** Canal mais escuro a partir do qual o pixel conta como branco (o JPEG nunca é branco puro). */
const WHITE_MIN_CHANNEL = 245;

/** Opacidades abaixo disto viram transparência total (elimina ruído de compressão). */
const MIN_ALPHA = 0.03;

const clampByte = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

/** Devolve uma cópia de `rgba` (4 bytes por pixel) com o branco transparente. */
export function removeWhite(rgba: Uint8Array): Uint8Array {
  const out = Uint8Array.from(rgba);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const alpha = Math.min(
      1,
      Math.max(
        0,
        (WHITE_MIN_CHANNEL - Math.min(r, g, b)) / (WHITE_MIN_CHANNEL - FOREGROUND_MIN_CHANNEL),
      ),
    );

    if (alpha < MIN_ALPHA) {
      out[i + 3] = 0;
      continue;
    }
    out[i] = clampByte((r - (1 - alpha) * 255) / alpha);
    out[i + 1] = clampByte((g - (1 - alpha) * 255) / alpha);
    out[i + 2] = clampByte((b - (1 - alpha) * 255) / alpha);
    out[i + 3] = clampByte(alpha * 255);
  }
  return out;
}
