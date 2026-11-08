import { closeSync, fstatSync, openSync, readSync, writeSync } from 'node:fs';

/**
 * Remove uma chave de metadados 'mdta' (moov/…/meta → keys + ilst) de um MP4, *no próprio arquivo*,
 * sem mudar o seu tamanho: o espaço liberado vira um átomo 'free'. Assim os offsets do 'mdat'
 * continuam válidos e não é preciso remuxar.
 */

const HEADER_SIZE = 8;

interface Box {
  readonly type: string;
  /** Posição do início da caixa dentro do buffer analisado. */
  readonly start: number;
  readonly size: number;
}

const u32 = (value: number): Buffer => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value);
  return buffer;
};

const makeBox = (type: string, payload: Buffer): Buffer =>
  Buffer.concat([u32(HEADER_SIZE + payload.length), Buffer.from(type, 'latin1'), payload]);

function listBoxes(buffer: Buffer, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  for (let at = start; at + HEADER_SIZE <= end;) {
    const size = buffer.readUInt32BE(at);
    if (size < HEADER_SIZE) break;
    boxes.push({ type: buffer.toString('latin1', at + 4, at + 8), start: at, size });
    at += size;
  }
  return boxes;
}

interface KeyEntry {
  readonly raw: Buffer;
  readonly name: string;
}

function readKeys(moov: Buffer, keys: Box): KeyEntry[] {
  const count = moov.readUInt32BE(keys.start + 12);
  const entries: KeyEntry[] = [];
  for (let at = keys.start + 16, i = 0; i < count; i++) {
    const size = moov.readUInt32BE(at);
    entries.push({
      raw: moov.subarray(at, at + size),
      name: moov.toString('utf8', at + 8, at + size),
    });
    at += size;
  }
  return entries;
}

export interface Patch {
  /** Deslocamento, dentro do 'moov', onde `bytes` deve ser gravado. */
  readonly offset: number;
  readonly bytes: Buffer;
}

/** Função pura: calcula o patch que remove `keyName` do 'meta' do `moov`, ou null se não existir. */
export function buildRemovalPatch(moov: Buffer, keyName: string): Patch | null {
  const top = listBoxes(moov, HEADER_SIZE, moov.length);
  const udta = top.find((box) => box.type === 'udta');
  // o ffmpeg coloca o meta em moov/udta; outros muxers (Apple) o colocam direto em moov
  const meta =
    top.find((box) => box.type === 'meta') ??
    (udta &&
      listBoxes(moov, udta.start + HEADER_SIZE, udta.start + udta.size).find(
        (box) => box.type === 'meta',
      ));
  if (!meta) return null;

  const childrenStart = meta.start + HEADER_SIZE + 4; // cabeçalho + version/flags
  const children = listBoxes(moov, childrenStart, meta.start + meta.size);
  const keys = children.find((box) => box.type === 'keys');
  const ilst = children.find((box) => box.type === 'ilst');
  if (!keys || !ilst) return null;

  const entries = readKeys(moov, keys);
  const removed = entries.findIndex((entry) => entry.name === keyName);
  if (removed < 0) return null;

  const newKeys = makeBox(
    'keys',
    Buffer.concat([
      u32(0),
      u32(entries.length - 1),
      ...entries.filter((_, i) => i !== removed).map((e) => e.raw),
    ]),
  );

  // No ilst, o "tipo" de cada item é o índice (1-based) da chave: remove o item e renumera os seguintes.
  const items = listBoxes(moov, ilst.start + HEADER_SIZE, ilst.start + ilst.size)
    .filter((item) => moov.readUInt32BE(item.start + 4) !== removed + 1)
    .map((item) => {
      const copy = Buffer.from(moov.subarray(item.start, item.start + item.size));
      const index = copy.readUInt32BE(4);
      if (index > removed + 1) copy.writeUInt32BE(index - 1, 4);
      return copy;
    });
  const newIlst = makeBox('ilst', Buffer.concat(items));

  const rebuilt = children.map((child) => {
    if (child === keys) return newKeys;
    if (child === ilst) return newIlst;
    return moov.subarray(child.start, child.start + child.size);
  });
  const body = Buffer.concat(rebuilt);
  const available = meta.start + meta.size - childrenStart;
  const padding = available - body.length;
  if (padding !== 0 && padding < HEADER_SIZE)
    throw new Error('Espaço insuficiente para o átomo free.');

  const versionAndFlags = moov.subarray(meta.start + HEADER_SIZE, childrenStart);
  const free = padding > 0 ? makeBox('free', Buffer.alloc(padding - HEADER_SIZE)) : Buffer.alloc(0);
  return {
    offset: meta.start + HEADER_SIZE,
    bytes: Buffer.concat([versionAndFlags, body, free]),
  };
}

/** Procura o 'moov' no topo do arquivo lendo só os cabeçalhos das caixas. */
function locateMoov(fd: number, fileSize: number): { start: number; size: number } | null {
  const header = Buffer.alloc(16);
  for (let at = 0; at + HEADER_SIZE <= fileSize;) {
    readSync(fd, header, 0, 16, at);
    let size = header.readUInt32BE(0);
    if (size === 1) size = Number(header.readBigUInt64BE(8)); // tamanho de 64 bits
    if (size < HEADER_SIZE) return null;
    if (header.toString('latin1', 4, 8) === 'moov') return { start: at, size };
    at += size;
  }
  return null;
}

/** Remove a chave do arquivo. Devolve `true` se algo foi alterado. */
export function removeMdtaKey(file: string, keyName: string): boolean {
  const fd = openSync(file, 'r+');
  try {
    const moovLocation = locateMoov(fd, fstatSync(fd).size);
    if (!moovLocation) return false;
    const moov = Buffer.alloc(moovLocation.size);
    readSync(fd, moov, 0, moov.length, moovLocation.start);

    const patch = buildRemovalPatch(moov, keyName);
    if (!patch) return false;
    writeSync(fd, patch.bytes, 0, patch.bytes.length, moovLocation.start + patch.offset);
    return true;
  } finally {
    closeSync(fd);
  }
}
