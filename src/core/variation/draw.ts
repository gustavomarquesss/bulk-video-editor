import {
  clamp,
  createRandom,
  pickOne,
  randomBetween,
  randomSign,
  shuffledCycle,
  type Random,
} from '../random';
import { DEVICE_PROFILES } from './devices';
import { LOOKS, LOOK_IDS } from './looks';
import type { Capture, ColorDirections, LookId, VariationDraw } from './types';

type Anchor = readonly [x: number, y: number];

/** Grade 3×3 de âncoras de recorte: cantos, bordas e centro. */
export const FRAMING_ANCHORS: readonly Anchor[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [0, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

interface Slot {
  readonly look: LookId;
  readonly anchor: Anchor;
}

export interface DrawOptions {
  readonly seed: number;
  readonly allowMirror: boolean;
  /** Data de referência para "gravado há X dias" (injetada para manter o domínio puro). */
  readonly now: Date;
  /**
   * `true` (padrão): looks e âncoras são distribuídos em rodízio embaralhado, então variações
   * vizinhas nunca repetem o mesmo estilo. `false` sorteia tudo livremente (usado só em comparações).
   */
  readonly structured?: boolean;
}

/** Sorteia `size` variações candidatas. A intensidade ainda não foi aplicada. */
export function drawCandidates(size: number, options: DrawOptions): VariationDraw[] {
  const random = createRandom(options.seed);
  const structured = options.structured ?? true;
  const looks = structured
    ? shuffledCycle(random, LOOK_IDS, size)
    : Array.from({ length: size }, () => pickOne(random, LOOK_IDS));
  const anchors = structured
    ? shuffledCycle(random, FRAMING_ANCHORS, size)
    : Array.from({ length: size }, () => pickOne(random, FRAMING_ANCHORS));

  return Array.from({ length: size }, (_, i) =>
    drawOne(i + 1, random, { look: looks[i], anchor: anchors[i] }, options),
  );
}

function drawOne(index: number, random: Random, slot: Slot, options: DrawOptions): VariationDraw {
  const unit = (min = 0.25) => randomBetween(random, min, 1);
  return {
    index,
    mirror: options.allowMirror && random() < 0.5,
    framing: {
      zoom: unit(0.5),
      anchorX: clamp(slot.anchor[0] + randomBetween(random, -0.25, 0.25), -1, 1),
      anchorY: clamp(slot.anchor[1] + randomBetween(random, -0.25, 0.25), -1, 1),
    },
    look: slot.look,
    color: jitterLook(random, LOOKS[slot.look]),
    timing: { speed: randomSign(random) * unit(0.3), trimHead: random(), trimTail: random() },
    audio: {
      tone: randomSign(random),
      pitch: unit(0.4),
      bass: unit(0.3),
      treble: unit(0.3),
      volume: randomBetween(random, -1, 1),
    },
    capture: drawCapture(random, options.now),
    encode: {
      crf: Math.round(randomBetween(random, 19, 23)),
      audioBitrateKbps: pickOne(random, [128, 160, 192]),
    },
  };
}

/** Mantém a identidade do look, variando a dose e o matiz. */
function jitterLook(random: Random, look: ColorDirections): ColorDirections {
  const dose = randomBetween(random, 0.75, 1);
  return {
    brightness: look.brightness * dose,
    contrast: look.contrast * dose,
    saturation: look.saturation * dose,
    gamma: look.gamma * dose,
    hue: randomBetween(random, -0.6, 0.6),
    warmth: look.warmth * dose,
    vignette: look.vignette * dose,
    sharpen: look.sharpen * dose,
    grain: look.grain * dose,
  };
}

function drawCapture(random: Random, now: Date): Capture {
  const device = pickOne(random, DEVICE_PROFILES);
  const daysAgo = randomBetween(random, 1, 30);
  const recordedAt = new Date(now.getTime() - daysAgo * 86_400_000);
  recordedAt.setUTCHours(
    Math.floor(randomBetween(random, 10, 25)) % 24,
    Math.floor(random() * 60),
    Math.floor(random() * 60),
    0,
  );
  return {
    device,
    softwareVersion: pickOne(random, device.softwareVersions),
    recordedAt,
    timezoneOffsetMinutes: -180, // BRT
  };
}
