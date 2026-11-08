import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildRemovalPatch, removeMdtaKey } from './removeMdtaKey';

const u32 = (value: number) => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
};
const box = (type: string, payload: Buffer) =>
  Buffer.concat([u32(8 + payload.length), Buffer.from(type, 'latin1'), payload]);

/** moov/udta/meta com as chaves informadas, imitando o que o ffmpeg grava. */
function buildMoov(names: string[]): Buffer {
  const keys = box(
    'keys',
    Buffer.concat([u32(0), u32(names.length), ...names.map((n) => box('mdta', Buffer.from(n)))]),
  );
  const items = names.map((name, i) => {
    const data = box('data', Buffer.concat([u32(1), u32(0), Buffer.from(`valor-${name}`)]));
    return Buffer.concat([u32(8 + data.length), u32(i + 1), data]);
  });
  const meta = box(
    'meta',
    Buffer.concat([u32(0), box('hdlr', Buffer.alloc(24)), keys, box('ilst', Buffer.concat(items))]),
  );
  return box('moov', Buffer.concat([box('mvhd', Buffer.alloc(100)), box('udta', meta)]));
}

function applyPatch(moov: Buffer, key: string): Buffer | null {
  const patch = buildRemovalPatch(moov, key);
  if (!patch) return null;
  const copy = Buffer.from(moov);
  patch.bytes.copy(copy, patch.offset);
  return copy;
}

describe('buildRemovalPatch', () => {
  it('devolve null quando a chave não existe', () => {
    expect(buildRemovalPatch(buildMoov(['a', 'b']), 'inexistente')).toBeNull();
  });

  it('mantém o tamanho do moov e remove a chave', () => {
    const moov = buildMoov(['creation_time', 'make', 'model']);
    const patched = applyPatch(moov, 'creation_time')!;
    expect(patched.length).toBe(moov.length);
    expect(patched.includes('valor-creation_time')).toBe(false);
    expect(patched.includes('valor-make')).toBe(true);
    expect(buildRemovalPatch(patched, 'creation_time')).toBeNull();
  });

  it('continua válido para novas remoções (índices renumerados, free como padding)', () => {
    const moov = buildMoov(['a', 'b', 'c']);
    const once = applyPatch(moov, 'a')!;
    const twice = applyPatch(once, 'c')!;
    expect(twice).not.toBeNull();
    expect(twice.length).toBe(moov.length);
    expect(twice.includes('valor-b')).toBe(true);
    expect(twice.includes('valor-c')).toBe(false);
  });
});

describe('removeMdtaKey (arquivo)', () => {
  let dir = '';
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('altera só o metadado: tamanho e conteúdo do mdat permanecem', () => {
    dir = mkdtempSync(join(tmpdir(), 'mp4-test-'));
    const file = join(dir, 'video.mp4');
    const mdat = box('mdat', Buffer.from('conteudo-de-video-intacto'));
    const original = Buffer.concat([
      box('ftyp', Buffer.from('isom0000')),
      buildMoov(['creation_time', 'model']),
      mdat,
    ]);
    writeFileSync(file, original);

    expect(removeMdtaKey(file, 'creation_time')).toBe(true);

    const result = readFileSync(file);
    expect(result.length).toBe(original.length);
    expect(result.subarray(result.length - mdat.length).equals(mdat)).toBe(true);
    expect(result.includes('valor-creation_time')).toBe(false);
    expect(removeMdtaKey(file, 'creation_time')).toBe(false);
  });
});
