import { clamp01 } from '../random';
import {
  DEFAULT_WEIGHTS,
  type CategoryWeights,
  type VariationDraw,
  type VariationParams,
} from './types';

/** Efeito máximo de cada parâmetro quando intensidade = 1 e peso = 1. */
export const MAX_EFFECT = {
  zoom: 0.3,
  brightness: 0.1,
  contrast: 0.2,
  saturation: 0.4,
  gamma: 0.18,
  hueDegrees: 14,
  temperatureKelvin: 2000,
  sharpen: 0.9,
  grain: 9,
  speed: 0.08,
  trimSeconds: 0.5,
  pitch: 0.06, // ≈ 1 semitom
  eqDb: 4,
  volume: 0.04,
} as const;

export const NEUTRAL_TEMPERATURE_KELVIN = 6500;

/** Converte o sorteio em valores concretos, escalando cada categoria por `strength × peso`. */
export function resolveParams(
  draw: VariationDraw,
  strength: number,
  weights: CategoryWeights = DEFAULT_WEIGHTS,
): VariationParams {
  const framing = strength * weights.framing;
  const color = strength * weights.color;
  const timing = strength * weights.timing;
  const audio = strength * weights.audio;
  const { color: c, timing: t, audio: a } = draw;

  return {
    index: draw.index,
    strength,
    mirror: draw.mirror,
    look: draw.look,
    framing: {
      zoom: 1 + MAX_EFFECT.zoom * draw.framing.zoom * framing,
      anchorX: draw.framing.anchorX,
      anchorY: draw.framing.anchorY,
    },
    color: {
      brightness: c.brightness * MAX_EFFECT.brightness * color,
      contrast: 1 + c.contrast * MAX_EFFECT.contrast * color,
      saturation: 1 + c.saturation * MAX_EFFECT.saturation * color,
      gamma: 1 + c.gamma * MAX_EFFECT.gamma * color,
      hueDegrees: c.hue * MAX_EFFECT.hueDegrees * color,
      temperatureKelvin:
        NEUTRAL_TEMPERATURE_KELVIN - c.warmth * MAX_EFFECT.temperatureKelvin * color,
      vignette: clamp01(c.vignette * color),
      sharpen: c.sharpen * MAX_EFFECT.sharpen * color,
      grain: Math.round(c.grain * MAX_EFFECT.grain * color),
    },
    timing: {
      speed: 1 + t.speed * MAX_EFFECT.speed * timing,
      trimHeadSeconds: t.trimHead * MAX_EFFECT.trimSeconds * timing,
      trimTailSeconds: t.trimTail * MAX_EFFECT.trimSeconds * timing,
    },
    audio: {
      pitch: 1 - a.tone * a.pitch * MAX_EFFECT.pitch * audio,
      bassDb: a.tone * a.bass * MAX_EFFECT.eqDb * audio,
      trebleDb: -a.tone * a.treble * MAX_EFFECT.eqDb * audio,
      volume: 1 + a.volume * MAX_EFFECT.volume,
    },
    capture: draw.capture,
    encode: draw.encode,
  };
}
