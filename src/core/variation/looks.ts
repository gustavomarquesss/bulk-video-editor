import type { ColorDirections, LookId } from './types';

const NONE: ColorDirections = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  gamma: 0,
  hue: 0,
  warmth: 0,
  vignette: 0,
  sharpen: 0,
  grain: 0,
};

/**
 * "Looks": estilos de cor com identidade própria. Cada variação recebe um look diferente,
 * o que garante que duas variações vizinhas não sejam apenas o mesmo filtro com outra dose.
 */
export const LOOKS: Readonly<Record<LookId, ColorDirections>> = {
  neutral: NONE,
  warm: { ...NONE, brightness: 0.2, contrast: 0.3, saturation: 0.4, warmth: 1, vignette: 0.2 },
  cool: { ...NONE, contrast: 0.3, saturation: -0.2, warmth: -1, vignette: 0.2 },
  film: {
    ...NONE,
    contrast: 0.7,
    saturation: -0.5,
    gamma: 0.3,
    warmth: 0.3,
    vignette: 0.6,
    grain: 1,
  },
  vivid: { ...NONE, brightness: 0.1, contrast: 0.5, saturation: 1, warmth: 0.2, sharpen: 0.6 },
  matte: { ...NONE, brightness: 0.4, contrast: -0.7, saturation: -0.3, gamma: -0.3, grain: 0.3 },
  moody: {
    ...NONE,
    brightness: -0.6,
    contrast: 0.6,
    saturation: -0.4,
    warmth: -0.4,
    vignette: 0.9,
    grain: 0.4,
  },
};

export const LOOK_IDS = Object.keys(LOOKS) as LookId[];
