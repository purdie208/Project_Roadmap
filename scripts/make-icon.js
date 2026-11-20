// Generates assets/icon.png (256x256) without any image libraries.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const S = 256;
const SS = 4; // supersampling per axis

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function inRoundRect(px, py, x0, y0, x1, y1, r) {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const cx = Math.max(x0 + r, Math.min(px, x1 - r));
  const cy = Math.max(y0 + r, Math.min(py, y1 - r));
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const A = hex('#6366f1');
const B = hex('#a855f7');
const WHITE = [255, 255, 255];
const AMBER = hex('#fbbf24');

const bars = [
  { x0: 54, y0: 72, x1: 150, y1: 102, c: WHITE },
  { x0: 92, y0: 113, x1: 204, y1: 143, c: AMBER },
  { x0: 72, y0: 154, x1: 182, y1: 184, c: WHITE },
];

function sample(px, py) {
  if (!inRoundRect(px, py, 8, 8, S - 8, S - 8, 58)) return null;
  for (const b of bars) if (inRoundRect(px, py, b.x0, b.y0, b.x1, b.y1, 15)) return b.c;
  const t = (px + py) / (2 * S);
  return A.map((v, i) => v + (B[i] - v) * t);
}

const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  for (let x = 0; x < S; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const c = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a += 1; }
      }
    }
    const o = y * (S * 4 + 1) + 1 + x * 4;
    if (a) {
      raw[o] = Math.round(r / a);
      raw[o + 1] = Math.round(g / a);
      raw[o + 2] = Math.round(b / a);
      raw[o + 3] = Math.round((a / (SS * SS)) * 255);
    }
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'assets', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log('Wrote', out);
