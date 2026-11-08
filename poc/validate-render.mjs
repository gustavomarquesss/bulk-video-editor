#!/usr/bin/env node
// Confere, nos arquivos renderizados, se o score real bate com o estimado na calibração
// e se o áudio mudou. Uso: node src/poc/validate-render.mjs <original.mp4> <pasta_output>

import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { audioSpectralDelta, measureRendered, prepare } from './diffmeter.mjs';

const [original, dir] = process.argv.slice(2);
if (!original || !dir) { console.error('Uso: node src/poc/validate-render.mjs <original.mp4> <pasta_output>'); process.exit(1); }

const manifest = JSON.parse(readFileSync(join(resolve(dir), 'manifest.json'), 'utf8'));
const prep = prepare(original);

const rows = manifest.map((m) => {
  const file = join(resolve(dir), m.file);
  const real = measureRendered(prep, file, m);
  return {
    arquivo: m.file,
    'score estimado': m.score.toFixed(1),
    'score real': real.score.toFixed(1),
    Δ: (real.score - m.score).toFixed(1),
    voz: `${m.pitch < 1 ? 'grossa' : 'fina'} (${(12 * Math.log2(m.pitch)).toFixed(2)} st)`,
    'EQ graves/agudos dB': `${m.bassDb.toFixed(1)}/${m.trebleDb.toFixed(1)}`,
    'Δ espectro dB': audioSpectralDelta(original, file).toFixed(2),
    velocidade: m.speed.toFixed(3),
    espelhado: m.flip ? 'sim' : 'não',
  };
});
console.table(rows.slice(0, 12));

const deltas = rows.map((r) => Math.abs(Number(r.Δ)));
const mean = deltas.reduce((s, x) => s + x, 0) / deltas.length;
console.log(`\n${rows.length} arquivos | |Δ| médio entre estimado e real: ${mean.toFixed(2)} | máx: ${Math.max(...deltas).toFixed(2)}`);
console.log(`Score real: média ${(rows.reduce((s, r) => s + Number(r['score real']), 0) / rows.length).toFixed(1)}, mín ${Math.min(...rows.map((r) => Number(r['score real']))).toFixed(1)}, máx ${Math.max(...rows.map((r) => Number(r['score real']))).toFixed(1)}`);
const aud = rows.map((r) => Number(r['Δ espectro dB']));
console.log(`Δ espectro de áudio (dB): média ${(aud.reduce((s, x) => s + x, 0) / aud.length).toFixed(2)}, mín ${Math.min(...aud).toFixed(2)}, máx ${Math.max(...aud).toFixed(2)}`);
