#!/usr/bin/env node
// Valida o slider de diferença: para cada alvo, calibra várias variações e mostra
// o score atingido, os componentes, o tempo de calibração e a diversidade entre variações.
// Uso: node src/poc/calibrate-test.mjs <video.mp4> [variacoes_por_alvo=10]

import { performance } from 'node:perf_hooks';
import { NORM, SAMPLE_FRAMES, calibrate, measure, prepare } from './diffmeter.mjs';
import { sequenceDistance } from './metrics.mjs';
import { applyStrength, drawVariation } from './variation.mjs';

const [input, perTarget = '10'] = process.argv.slice(2);
if (!input) { console.error('Uso: node src/poc/calibrate-test.mjs <video.mp4> [n]'); process.exit(1); }
const N = Number(perTarget), SEED = 7;

const stats = (xs) => ({ mean: xs.reduce((s, x) => s + x, 0) / xs.length, min: Math.min(...xs), max: Math.max(...xs) });
const fmt = (x, d = 1) => x.toFixed(d);

console.log(`Preparando ${input} ...`);
const prep = prepare(input);
console.log(`  ${prep.media.w}x${prep.media.h}, ${prep.media.dur.toFixed(1)}s, ${SAMPLE_FRAMES} frames amostrados\n`);

// 1) Referência: score máximo de cada componente com intensidade total
const draws = Array.from({ length: N }, (_, i) => drawVariation(i + 1, SEED));
const atMax = draws.map((d) => measure(prep, applyStrength(d, 1)));
console.log('Intensidade 100% (média das variações):');
console.log(`  score=${fmt(stats(atMax.map((r) => r.score)).mean)}  visual=${fmt(stats(atMax.map((r) => r.visual)).mean, 2)}  ssimD=${fmt(stats(atMax.map((r) => r.raw.ssimD)).mean, 2)} (norm ${NORM.ssim})  hash=${fmt(stats(atMax.map((r) => r.raw.hash)).mean, 2)} (norm ${NORM.hash})  hist=${fmt(stats(atMax.map((r) => r.raw.hist)).mean, 2)} (norm ${NORM.hist})\n`);

// 2) Calibração por alvo
const rows = [];
let lastCalibrated = [];
for (const target of [10, 20, 30, 40, 50, 60, 70, 80]) {
  const t0 = performance.now();
  const results = draws.map((d) => calibrate(prep, d, target));
  const ms = (performance.now() - t0) / N;
  const sc = stats(results.map((r) => r.score));
  rows.push({
    alvo: target,
    'score médio': fmt(sc.mean), mín: fmt(sc.min), máx: fmt(sc.max),
    'desvio máx': fmt(Math.max(...results.map((r) => Math.abs(r.score - target)))),
    'intensidade s': fmt(stats(results.map((r) => r.s)).mean, 2),
    visual: fmt(stats(results.map((r) => r.visual)).mean, 2),
    iter: fmt(stats(results.map((r) => r.iterations)).mean),
    'ms/variação': fmt(ms, 0),
    alcançável: `${results.filter((r) => r.reachable).length}/${N}`,
  });
  if (target === 40) lastCalibrated = results;
}
console.table(rows);

// 3) Diversidade: as variações calibradas em 40 diferem entre si?
const frames = lastCalibrated.map((r) => r.frames);
const pairD = [];
for (let i = 0; i < frames.length; i++) {
  for (let j = i + 1; j < frames.length; j++) pairD.push(sequenceDistance(frames[i], frames[j], SAMPLE_FRAMES).ssimD);
}
const vsOriginal = lastCalibrated.map((r) => r.raw.ssimD);
console.log(`\nAlvo 40 — 1−SSIM vs original: média ${fmt(stats(vsOriginal).mean, 3)} | entre variações: média ${fmt(stats(pairD).mean, 3)} (mín ${fmt(stats(pairD).min, 3)})`);
