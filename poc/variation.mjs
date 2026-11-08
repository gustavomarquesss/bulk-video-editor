// Planejamento de variações.
//
// Duas etapas, para que a intensidade possa ser calibrada sem "re-sortear":
//   drawVariation()  -> sorteia sinais e proporções (fixos por variação, independem da intensidade)
//   applyStrength()  -> escala tudo por s ∈ [0,1] (e por pesos de categoria) e gera parâmetros concretos
// Com o sorteio fixo, o score de diferença cresce de forma monotônica com s, o que permite busca binária.

export function rng(seed) { // mulberry32
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r, a, b) => a + (b - a) * r();
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const even = (n) => Math.max(2, Math.round(n / 2) * 2);
export const pad = (n, l = 2) => String(n).padStart(l, '0');
const f3 = (n) => Number(n).toFixed(3);

export const DEVICES = [
  { make: 'Apple', model: 'iPhone 13', sw: ['16.7.8', '17.5.1', '17.6.1'], os: 'apple' },
  { make: 'Apple', model: 'iPhone 14 Pro', sw: ['17.4.1', '17.6.1', '18.0.1'], os: 'apple' },
  { make: 'Apple', model: 'iPhone 15', sw: ['17.5.1', '18.0', '18.1'], os: 'apple' },
  { make: 'Apple', model: 'iPhone 15 Pro Max', sw: ['17.6.1', '18.1', '18.2'], os: 'apple' },
  { make: 'Apple', model: 'iPhone 16', sw: ['18.1', '18.2', '18.3'], os: 'apple' },
  { make: 'samsung', model: 'SM-S918B', sw: ['14'], os: 'android' }, // S23 Ultra
  { make: 'samsung', model: 'SM-S921B', sw: ['14', '15'], os: 'android' }, // S24
  { make: 'Google', model: 'Pixel 8', sw: ['14', '15'], os: 'android' },
  { make: 'Xiaomi', model: '2312DRA50G', sw: ['14'], os: 'android' },
];

export function drawVariation(idx, seed, { flip = true } = {}) {
  const r = rng(seed * 1000 + idx * 7919 + 13);
  const sgn = () => (r() < 0.5 ? -1 : 1);
  const u = (lo = 0.25) => lo + (1 - lo) * r();
  const flipRoll = r() < 0.5;
  const dev = pick(r, DEVICES);
  const when = new Date(Date.now() - between(r, 1, 30) * 86400000);
  when.setUTCHours(Math.floor(between(r, 10, 25)) % 24, Math.floor(r() * 60), Math.floor(r() * 60), 0);
  return {
    idx,
    flip: flip && flipRoll,
    zoom: u(0.4), dx: between(r, -1, 1), dy: between(r, -1, 1),
    bright: sgn() * u(), contrast: sgn() * u(), sat: sgn() * u(), gamma: sgn() * u(), hue: sgn() * u(),
    sharpen: r() < 0.5 ? u() : 0,
    grain: r() < 0.4 ? u() : 0,
    speed: sgn() * u(0.3),
    tone: sgn(), // +1 = voz mais grossa (pitch↓, graves↑, agudos↓), -1 = mais fina
    pitchU: u(0.4), bassU: u(0.3), trebleU: u(0.3),
    volume: between(r, -1, 1) * 0.04,
    crf: Math.round(between(r, 19, 23)),
    abitrate: pick(r, [128, 160, 192]),
    device: dev,
    software: pick(r, dev.sw),
    when,
    tzOffsetMin: -180, // BRT
  };
}

// Valores máximos (s=1, peso=1). Ajustáveis por categoria via `weights`.
export function applyStrength(d, s, weights = {}) {
  const W = { frame: 1, color: 1, speed: 1, audio: 1, ...weights };
  const sf = s * W.frame, sc = s * W.color, ss = s * W.speed, sa = s * W.audio;
  return {
    ...d,
    strength: s,
    zoom: 1 + 0.2 * d.zoom * sf, // até 17% de crop
    brightness: d.bright * 0.08 * sc,
    contrast: 1 + d.contrast * 0.15 * sc,
    saturation: 1 + d.sat * 0.3 * sc,
    gamma: 1 + d.gamma * 0.15 * sc,
    hue: d.hue * 12 * sc,
    sharpenAmt: d.sharpen * 0.8 * sc,
    grainAmt: Math.round(d.grain * 8 * sc),
    speed: 1 + d.speed * 0.08 * ss, // até ±8%
    pitch: 1 - d.tone * d.pitchU * 0.06 * sa, // até ~1 semitom
    bassDb: d.tone * d.bassU * 4 * sa,
    trebleDb: -d.tone * d.trebleU * 4 * sa,
    volumeMul: 1 + d.volume,
  };
}

// Filtros de imagem (sem o setpts de velocidade). `flip:false` é usado na medição.
export function spatialChain(p, w, h, { flip = true } = {}) {
  const cw = even(w / p.zoom), ch = even(h / p.zoom);
  const mx = w - cw, my = h - ch;
  const cx = Math.round(mx / 2 + (p.dx * mx) / 2);
  const cy = Math.round(my / 2 + (p.dy * my) / 2);
  const v = [];
  if (flip && p.flip) v.push('hflip');
  v.push(`crop=${cw}:${ch}:${cx}:${cy}`, `scale=${w}:${h}:flags=lanczos`);
  v.push(`eq=brightness=${f3(p.brightness)}:contrast=${f3(p.contrast)}:saturation=${f3(p.saturation)}:gamma=${f3(p.gamma)}`);
  if (Math.abs(p.hue) > 0.05) v.push(`hue=h=${p.hue.toFixed(1)}`);
  if (p.sharpenAmt > 0.02) v.push(`unsharp=5:5:${p.sharpenAmt.toFixed(2)}:5:5:0.0`);
  if (p.grainAmt >= 1) v.push(`noise=alls=${p.grainAmt}:allf=t`);
  v.push('format=yuv420p');
  return v.join(',');
}

export const videoChain = (p, w, h) => `${spatialChain(p, w, h)},setpts=PTS/${f3(p.speed)}`;

// Áudio: rubberband muda pitch+timbre (formantes acompanham) sem alterar a duração;
// tempo acompanha a velocidade do vídeo. EQ reforça a sensação de "mais grossa/fina".
export function audioChain(p) {
  const a = [`rubberband=pitch=${p.pitch.toFixed(4)}:tempo=${p.speed.toFixed(4)}`];
  if (Math.abs(p.bassDb) > 0.05) a.push(`bass=g=${p.bassDb.toFixed(2)}:f=120:w=0.6`);
  if (Math.abs(p.trebleDb) > 0.05) a.push(`treble=g=${p.trebleDb.toFixed(2)}:f=6000:w=0.6`);
  a.push(`volume=${f3(p.volumeMul)}`);
  return a.join(',');
}

// ---------- metadados de celular ----------
const isoNoMs = (d) => d.toISOString().replace(/\.\d+Z$/, 'Z');
function appleDate(d, offsetMin) { // 2026-11-03T18:22:41-0300
  const local = new Date(d.getTime() + offsetMin * 60000);
  const sign = offsetMin <= 0 ? '-' : '+';
  const ab = Math.abs(offsetMin);
  return local.toISOString().replace(/\.\d+Z$/, '') + sign + pad(Math.floor(ab / 60)) + pad(ab % 60);
}

export function buildMetadata(p) {
  const d = p.device;
  const m = [];
  const add = (k, v) => m.push('-metadata', `${k}=${v}`);
  add('creation_time', isoNoMs(p.when));
  if (d.os === 'apple') {
    add('com.apple.quicktime.make', d.make);
    add('com.apple.quicktime.model', d.model);
    add('com.apple.quicktime.software', p.software);
    add('com.apple.quicktime.creationdate', appleDate(p.when, p.tzOffsetMin));
    m.push('-metadata:s:v:0', 'handler_name=Core Media Video', '-metadata:s:a:0', 'handler_name=Core Media Audio');
  } else {
    add('com.android.version', p.software);
    add('com.android.manufacturer', d.make);
    add('com.android.model', d.model);
    m.push('-metadata:s:v:0', 'handler_name=VideoHandle', '-metadata:s:a:0', 'handler_name=SoundHandle');
  }
  return m;
}
