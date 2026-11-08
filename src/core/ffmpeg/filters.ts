import type { VariationParams } from '../variation/types';

export interface FrameSize {
  readonly width: number;
  readonly height: number;
}

const fixed = (value: number, digits = 3): string => value.toFixed(digits);
const toEven = (value: number): number => Math.max(2, Math.round(value / 2) * 2);

/** Abaixo destes limiares o efeito é imperceptível e o filtro é omitido. */
const EPSILON = {
  kelvin: 50,
  hue: 0.05,
  sharpen: 0.02,
  vignette: 0.02,
  eq: 0.05,
  trim: 0.01,
} as const;

/**
 * Filtros de imagem de uma variação (sem efeitos de tempo).
 * Com `mirror: false` é a cadeia usada na medição, já que o espelhamento não conta no score.
 */
export function buildSpatialFilter(
  params: VariationParams,
  frame: FrameSize,
  { mirror = true }: { mirror?: boolean } = {},
): string {
  const { framing, color } = params;
  const cropWidth = toEven(frame.width / framing.zoom);
  const cropHeight = toEven(frame.height / framing.zoom);
  const cropX = Math.round(((1 + framing.anchorX) / 2) * (frame.width - cropWidth));
  const cropY = Math.round(((1 + framing.anchorY) / 2) * (frame.height - cropHeight));

  const filters: string[] = [];
  if (mirror && params.mirror) filters.push('hflip');
  filters.push(
    `crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`,
    `scale=${frame.width}:${frame.height}:flags=lanczos`,
  );
  if (Math.abs(color.temperatureKelvin - 6500) > EPSILON.kelvin) {
    filters.push(`colortemperature=temperature=${Math.round(color.temperatureKelvin)}`);
  }
  filters.push(
    `eq=brightness=${fixed(color.brightness)}:contrast=${fixed(color.contrast)}:saturation=${fixed(color.saturation)}:gamma=${fixed(color.gamma)}`,
  );
  if (Math.abs(color.hueDegrees) > EPSILON.hue) filters.push(`hue=h=${fixed(color.hueDegrees, 1)}`);
  if (color.sharpen > EPSILON.sharpen)
    filters.push(`unsharp=5:5:${fixed(color.sharpen, 2)}:5:5:0.0`);
  if (color.vignette > EPSILON.vignette) {
    // No ffmpeg, ângulo 0 = sem vinheta e quanto maior, mais escuro nos cantos (π/2 = cantos pretos).
    // Vinheta 1 equivale ao padrão do filtro (π/5), que já é bem visível.
    filters.push(`vignette=angle=${fixed((color.vignette * Math.PI) / 5)}`);
  }
  if (color.grain >= 1) filters.push(`noise=alls=${color.grain}:allf=t`);
  filters.push('format=yuv420p');
  return filters.join(',');
}

/** Filtro de vídeo completo: corte de início/fim, imagem e velocidade. */
export function buildVideoFilter(
  params: VariationParams,
  frame: FrameSize,
  sourceDurationSeconds: number,
): string {
  const filters: string[] = [];
  const trim = buildTrim(params, sourceDurationSeconds);
  if (trim) filters.push(`trim=${trim},setpts=PTS-STARTPTS`);
  filters.push(buildSpatialFilter(params, frame), `setpts=PTS/${fixed(params.timing.speed)}`);
  return filters.join(',');
}

/**
 * Filtro de áudio completo. O `rubberband` muda pitch e timbre (as formantes acompanham, o que dá a
 * sensação de voz mais grossa/fina) sem alterar a duração; o tempo acompanha a velocidade do vídeo.
 */
export function buildAudioFilter(params: VariationParams, sourceDurationSeconds: number): string {
  const { audio, timing } = params;
  const filters: string[] = [];
  const trim = buildTrim(params, sourceDurationSeconds);
  if (trim) filters.push(`atrim=${trim},asetpts=PTS-STARTPTS`);
  filters.push(`rubberband=pitch=${fixed(audio.pitch, 4)}:tempo=${fixed(timing.speed, 4)}`);
  if (Math.abs(audio.bassDb) > EPSILON.eq)
    filters.push(`bass=g=${fixed(audio.bassDb, 2)}:f=120:w=0.6`);
  if (Math.abs(audio.trebleDb) > EPSILON.eq)
    filters.push(`treble=g=${fixed(audio.trebleDb, 2)}:f=6000:w=0.6`);
  filters.push(`volume=${fixed(audio.volume)}`);
  return filters.join(',');
}

function buildTrim(params: VariationParams, sourceDurationSeconds: number): string | null {
  const { trimHeadSeconds, trimTailSeconds } = params.timing;
  if (trimHeadSeconds < EPSILON.trim && trimTailSeconds < EPSILON.trim) return null;
  return `start=${fixed(trimHeadSeconds)}:end=${fixed(sourceDurationSeconds - trimTailSeconds)}`;
}
