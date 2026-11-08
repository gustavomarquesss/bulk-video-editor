/**
 * Modelo de uma variação em duas etapas:
 *
 *  1. `VariationDraw`   — o que foi *sorteado* (direções, sinais, proporções). Independe da intensidade.
 *  2. `VariationParams` — valores concretos para o ffmpeg, obtidos escalando o sorteio por uma intensidade.
 *
 * Separar as etapas permite calibrar a intensidade (busca binária) sem re-sortear a variação.
 */

export type Sign = 1 | -1;

export type DevicePlatform = 'apple' | 'android';

export interface DeviceProfile {
  readonly make: string;
  readonly model: string;
  readonly platform: DevicePlatform;
  readonly softwareVersions: readonly string[];
}

/** Categorias de transformação, com peso individual (0 desliga, 1 é o padrão). */
export type Category = 'framing' | 'color' | 'timing' | 'audio';
export type CategoryWeights = Readonly<Record<Category, number>>;

export const DEFAULT_WEIGHTS: CategoryWeights = { framing: 1, color: 1, timing: 1, audio: 1 };

export type LookId = 'neutral' | 'warm' | 'cool' | 'film' | 'vivid' | 'matte' | 'moody';

/** Direções de cor em [-1, 1] (vignette, sharpen e grain em [0, 1]). */
export interface ColorDirections {
  readonly brightness: number;
  readonly contrast: number;
  readonly saturation: number;
  readonly gamma: number;
  readonly hue: number;
  /** +1 = mais quente, -1 = mais frio. */
  readonly warmth: number;
  readonly vignette: number;
  readonly sharpen: number;
  readonly grain: number;
}

export interface Capture {
  readonly device: DeviceProfile;
  readonly softwareVersion: string;
  readonly recordedAt: Date;
  readonly timezoneOffsetMinutes: number;
}

export interface EncodeChoices {
  readonly crf: number;
  readonly audioBitrateKbps: number;
}

export interface VariationDraw {
  readonly index: number;
  readonly mirror: boolean;
  /** `zoom` em [0,1]; `anchorX/Y` em [-1,1] escolhem para onde o recorte desliza. */
  readonly framing: { readonly zoom: number; readonly anchorX: number; readonly anchorY: number };
  readonly look: LookId;
  readonly color: ColorDirections;
  /** `speed` em [-1,1]; `trimHead/trimTail` em [0,1]. */
  readonly timing: { readonly speed: number; readonly trimHead: number; readonly trimTail: number };
  /** `tone` +1 = voz mais grossa, -1 = mais fina; os demais em [0,1] (volume em [-1,1]). */
  readonly audio: {
    readonly tone: Sign;
    readonly pitch: number;
    readonly bass: number;
    readonly treble: number;
    readonly volume: number;
  };
  readonly capture: Capture;
  readonly encode: EncodeChoices;
}

export interface VariationParams {
  readonly index: number;
  readonly strength: number;
  readonly mirror: boolean;
  readonly look: LookId;
  readonly framing: { readonly zoom: number; readonly anchorX: number; readonly anchorY: number };
  readonly color: {
    readonly brightness: number;
    readonly contrast: number;
    readonly saturation: number;
    readonly gamma: number;
    readonly hueDegrees: number;
    readonly temperatureKelvin: number;
    /** 0 = sem vinheta, 1 = vinheta forte. */
    readonly vignette: number;
    readonly sharpen: number;
    readonly grain: number;
  };
  readonly timing: {
    readonly speed: number;
    readonly trimHeadSeconds: number;
    readonly trimTailSeconds: number;
  };
  readonly audio: {
    readonly pitch: number;
    readonly bassDb: number;
    readonly trebleDb: number;
    readonly volume: number;
  };
  readonly capture: Capture;
  readonly encode: EncodeChoices;
}
