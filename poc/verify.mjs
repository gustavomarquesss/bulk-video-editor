#!/usr/bin/env node
// Verifica as variações geradas: hashes únicos, metadados por arquivo e duração.
// Uso: node src/poc/verify.mjs <pasta_output> [original.mp4]

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve(process.argv[2] ?? 'output');
const original = process.argv[3] ? resolve(process.argv[3]) : null;

const probe = (f) => JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', f], { encoding: 'utf8' }).stdout);
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12);

const files = readdirSync(dir).filter((f) => f.endsWith('.mp4')).sort();
const rows = [];
for (const f of files) {
  const p = join(dir, f);
  const i = probe(p);
  const t = i.format.tags ?? {};
  const model = t['com.apple.quicktime.model'] ?? t['com.android.model'] ?? '—';
  const sw = t['com.apple.quicktime.software'] ?? t['com.android.version'] ?? '—';
  const v = i.streams.find((s) => s.codec_type === 'video');
  rows.push({
    arquivo: f,
    sha256: sha(p),
    duração: (+i.format.duration).toFixed(2) + 's',
    res: `${v.width}x${v.height}`,
    dispositivo: model,
    software: sw,
    criado: t.creation_time ?? '—',
    encoder: t.encoder ?? '(nenhum)',
  });
}
console.table(rows);

const uniq = (k) => new Set(rows.map((r) => r[k])).size;
console.log(`\nArquivos: ${rows.length}`);
console.log(`Hashes únicos:        ${uniq('sha256')}/${rows.length}`);
console.log(`creation_time únicos: ${uniq('criado')}/${rows.length}`);
console.log(`Modelos distintos:    ${uniq('dispositivo')}`);
console.log(`Com tag encoder/Lavf: ${rows.filter((r) => r.encoder !== '(nenhum)').length}`);

if (original) {
  const o = probe(original);
  console.log(`\nOriginal: ${(+o.format.duration).toFixed(2)}s, tags: ${JSON.stringify(o.format.tags ?? {})}`);
}
// dump completo de um arquivo, para conferir as tags cruas
const first = join(dir, files[0]);
console.log(`\nTags cruas de ${files[0]}:`);
console.log(JSON.stringify(probe(first).format.tags, null, 2));
