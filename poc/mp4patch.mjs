// Remove uma chave 'mdta' (moov/meta/keys + ilst) de um MP4 *in-place*, sem mudar o
// tamanho do arquivo: o espaço liberado vira um átomo 'free'. Assim os offsets do
// 'mdat' (stco/co64) continuam válidos e não precisamos remuxar.
import { closeSync, fstatSync, openSync, readSync, writeSync } from 'node:fs';

function readAt(fd, pos, len) {
  const b = Buffer.alloc(len);
  readSync(fd, b, 0, len, pos);
  return b;
}

// lê header de box em `pos` -> { size, type, hdr }
function boxAt(buf, pos) {
  let size = buf.readUInt32BE(pos);
  const type = buf.toString('latin1', pos + 4, pos + 8);
  let hdr = 8;
  if (size === 1) { size = Number(buf.readBigUInt64BE(pos + 8)); hdr = 16; }
  return { size, type, hdr, pos };
}

function children(buf, start, end) {
  const out = [];
  for (let p = start; p + 8 <= end;) {
    const b = boxAt(buf, p);
    if (b.size < 8) break;
    out.push(b);
    p += b.size;
  }
  return out;
}

export function removeMdtaKey(file, keyName) {
  const fd = openSync(file, 'r+');
  try {
    const total = fstatSync(fd).size;
    // localiza 'moov' no topo do arquivo lendo só os headers
    let moovPos = -1, moovSize = 0;
    for (let p = 0; p + 8 <= total;) {
      const b = boxAt(readAt(fd, p, 16), 0);
      if (b.type === 'moov') { moovPos = p; moovSize = b.size; break; }
      if (b.size < 8) break;
      p += b.size;
    }
    if (moovPos < 0) return false;

    const moov = readAt(fd, moovPos, moovSize);
    // o ffmpeg coloca o meta em moov/udta; outros muxers (Apple) em moov direto
    const top = children(moov, 8, moov.length);
    const udta = top.find((b) => b.type === 'udta');
    const meta =
      top.find((b) => b.type === 'meta') ??
      (udta && children(moov, udta.pos + 8, udta.pos + udta.size).find((b) => b.type === 'meta'));
    if (!meta) return false;
    const mStart = meta.pos + 12; // header(8) + version/flags(4)
    const mEnd = meta.pos + meta.size;
    const kids = children(moov, mStart, mEnd);
    const keys = kids.find((b) => b.type === 'keys');
    const ilst = kids.find((b) => b.type === 'ilst');
    if (!keys || !ilst) return false;

    // --- keys ---
    const count = moov.readUInt32BE(keys.pos + 12);
    const entries = [];
    for (let p = keys.pos + 16, i = 0; i < count; i++) {
      const sz = moov.readUInt32BE(p);
      entries.push({ raw: moov.subarray(p, p + sz), name: moov.toString('utf8', p + 8, p + sz) });
      p += sz;
    }
    const k = entries.findIndex((e) => e.name === keyName); // 0-based
    if (k < 0) return false;
    const kept = entries.filter((_, i) => i !== k);
    const newKeys = Buffer.concat([
      Buffer.from([0, 0, 0, 0]), Buffer.from('keys', 'latin1'), Buffer.alloc(4),
      (() => { const c = Buffer.alloc(4); c.writeUInt32BE(kept.length); return c; })(),
      ...kept.map((e) => e.raw),
    ]);
    newKeys.writeUInt32BE(newKeys.length, 0);

    // --- ilst: remove item com índice k+1 e renumera os seguintes ---
    const items = children(moov, ilst.pos + 8, ilst.pos + ilst.size);
    const newItems = [];
    for (const it of items) {
      const idxNum = moov.readUInt32BE(it.pos + 4); // o "type" do item é o índice (1-based) da chave
      if (idxNum === k + 1) continue;
      const copy = Buffer.from(moov.subarray(it.pos, it.pos + it.size));
      if (idxNum > k + 1) copy.writeUInt32BE(idxNum - 1, 4);
      newItems.push(copy);
    }
    const newIlst = Buffer.concat([Buffer.alloc(4), Buffer.from('ilst', 'latin1'), ...newItems]);
    newIlst.writeUInt32BE(newIlst.length, 0);

    // --- remonta 'meta' com o mesmo tamanho (sobra vira 'free') ---
    const before = moov.subarray(meta.pos + 8, mStart); // version/flags
    const parts = [];
    for (const o of kids) {
      if (o === keys) parts.push(newKeys);
      else if (o === ilst) parts.push(newIlst);
      else parts.push(moov.subarray(o.pos, o.pos + o.size));
    }
    const body = Buffer.concat(parts);
    const pad = mEnd - mStart - body.length;
    if (pad !== 0 && pad < 8) throw new Error('espaço insuficiente para átomo free');
    const free = pad ? Buffer.concat([Buffer.alloc(4), Buffer.from('free', 'latin1'), Buffer.alloc(pad - 8)]) : Buffer.alloc(0);
    if (pad) free.writeUInt32BE(pad, 0);
    const newMetaPayload = Buffer.concat([before, body, free]);
    if (newMetaPayload.length !== meta.size - 8) throw new Error('tamanho do meta divergiu');

    writeSync(fd, newMetaPayload, 0, newMetaPayload.length, moovPos + meta.pos + 8);
    return true;
  } finally {
    closeSync(fd);
  }
}
