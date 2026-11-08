#!/usr/bin/env node
// Gera N variações de um vídeo.
//
// Uso: node src/poc/generate.mjs <entrada.mp4> [opções]
//   -n <int>          quantidade de variações (padrão 15)
//   -o <pasta>        pasta de saída (padrão output)
//   --target <0-100>  score de diferença desejado (calibra a intensidade por variação)
//   --strength <0-1>  intensidade fixa (ignorado se --target for usado; padrão 0.4)
//   --seed <int>      semente (reprodutibilidade)
//   --no-flip         não espelhar
//   --nvenc           encode na GPU (h264_nvenc)
//   -j <int>          encodes em paralelo (padrão 2)

import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { calibrate, prepare } from './diffmeter.mjs';
import { probeVideo } from './media.mjs';
import { renderVariation } from './render.mjs';
import { applyStrength, drawVariation, pad } from './variation.mjs';

function parseArgs(argv) {
  const opt = { n: 15, out: 'output', target: null, strength: 0.4, seed: Date.now() % 100000, flip: true, nvenc: false, jobs: 2, input: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-n') opt.n = Number(argv[++i]);
    else if (a === '-o') opt.out = argv[++i];
    else if (a === '--target') opt.target = Number(argv[++i]);
    else if (a === '--strength') opt.strength = Number(argv[++i]);
    else if (a === '--seed') opt.seed = Number(argv[++i]);
    else if (a === '--no-flip') opt.flip = false;
    else if (a === '--nvenc') opt.nvenc = true;
    else if (a === '-j') opt.jobs = Number(argv[++i]);
    else opt.input = a;
  }
  if (!opt.input) throw new Error('Informe o vídeo de entrada. Veja o cabeçalho de generate.mjs.');
  return opt;
}

/** Decide os parâmetros finais de cada variação (calibrando pelo alvo, se houver). */
function planVariations(opt, input) {
  const draws = Array.from({ length: opt.n }, (_, i) => drawVariation(i + 1, opt.seed, { flip: opt.flip }));
  if (opt.target === null) return draws.map((d) => ({ p: applyStrength(d, opt.strength), score: null }));
  const prep = prepare(input);
  return draws.map((d) => {
    const r = calibrate(prep, d, opt.target);
    if (!r.reachable) console.warn(`  v${pad(d.idx, 3)}: alvo ${opt.target} inalcançável (máx ${r.score.toFixed(1)})`);
    return { p: r.p, score: r.score };
  });
}

/** Executa `tasks` com no máximo `limit` em paralelo. */
async function runPool(tasks, limit, onDone) {
  let next = 0, done = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const result = await tasks[next++]();
      onDone(result, ++done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

async function main() {
  const opt = parseArgs(process.argv.slice(2));
  const input = resolve(opt.input);
  const outDir = resolve(opt.out);
  mkdirSync(outDir, { recursive: true });

  const media = probeVideo(input);
  const stem = basename(input, extname(input)).replace(/\s+/g, '_');

  const t0 = Date.now();
  const plan = planVariations(opt, input);
  console.log(`Planejamento: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const t1 = Date.now();
  const results = [];
  const tasks = plan.map(({ p, score }) => async () => {
    const file = `${stem}_v${pad(p.idx, 3)}.mp4`;
    await renderVariation({ input, media, p, outFile: join(outDir, file), encoder: opt.nvenc ? 'nvenc' : 'x264' });
    results.push({ file, score, p });
    return file;
  });
  await runPool(tasks, opt.jobs, (file, done) => process.stdout.write(`\r[${done}/${plan.length}] ${file}   `));
  console.log(`\nRender: ${((Date.now() - t1) / 1000).toFixed(1)}s -> ${outDir}`);

  results.sort((a, b) => a.p.idx - b.p.idx);
  writeFileSync(
    join(outDir, 'manifest.json'),
    JSON.stringify(results.map(({ file, score, p }) => ({ file, score, ...p, device: `${p.device.make} ${p.device.model}`, when: p.when.toISOString() })), null, 2),
  );
}

main().catch((e) => { console.error(e.message); process.exit(1); });
