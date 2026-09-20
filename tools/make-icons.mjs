/* Generator ikon PWA — uruchom: node tools/make-icons.mjs
   Rysuje krzywą zapominania z punktami powtórek na gradiencie.
   Bez zależności; PNG składany ręcznie (zlib z Node). */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = new URL('../icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bit, RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const clamp01 = v => Math.min(1, Math.max(0, v));

function draw(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const pad = maskable ? size * 0.16 : 0;           // strefa bezpieczna dla masek
  const r = size * (maskable ? 0.5 : 0.235);        // promień zaokrąglenia
  const A = [124, 92, 255], B = [34, 211, 238];
  const curveW = size * 0.055;

  const put = (x, y, rgb, a) => {
    const i = (y * size + x) * 4;
    const prev = buf[i + 3] / 255;
    const al = clamp01(a);
    buf[i] = Math.round(buf[i] * prev * (1 - al) + rgb[0] * al);
    buf[i + 1] = Math.round(buf[i + 1] * prev * (1 - al) + rgb[1] * al);
    buf[i + 2] = Math.round(buf[i + 2] * prev * (1 - al) + rgb[2] * al);
    buf[i + 3] = Math.round(255 * clamp01(prev + al * (1 - prev)));
  };

  // tło: zaokrąglony kwadrat z gradientem po przekątnej
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.max(pad + r - x, 0, x - (size - pad - r));
      const dy = Math.max(pad + r - y, 0, y - (size - pad - r));
      const dist = Math.hypot(dx, dy);
      const alpha = clamp01(r - dist + 0.5);
      if (alpha <= 0) continue;
      put(x, y, mix(A, B, clamp01((x + y) / (2 * size))), alpha);
    }
  }

  // krzywa zapominania R(t) = exp(-t/k)
  const x0 = size * 0.22, x1 = size * 0.80, y0 = size * 0.30, y1 = size * 0.74;
  const k = 0.34;
  const curve = t => y0 + (y1 - y0) * (1 - Math.exp(-t / k));
  for (let t = 0; t <= 1; t += 0.0016) {
    const cx = x0 + (x1 - x0) * t, cy = curve(t);
    for (let y = Math.floor(cy - curveW); y <= cy + curveW; y++) {
      for (let x = Math.floor(cx - curveW); x <= cx + curveW; x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        put(x, y, [255, 255, 255], clamp01(curveW / 2 - Math.hypot(x - cx, y - cy) + 0.5));
      }
    }
  }

  // punkty powtórek — coraz rzadziej
  for (const t of [0.0, 0.22, 0.55, 1.0]) {
    const cx = x0 + (x1 - x0) * t, cy = curve(t), rad = size * 0.075;
    for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y++) {
      for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.hypot(x - cx, y - cy);
        put(x, y, [255, 255, 255], clamp01(rad - d + 0.5));
        put(x, y, [16, 18, 28], clamp01(rad * 0.45 - d + 0.5));
      }
    }
  }
  return png(size, size, buf);
}

for (const [name, size, opts] of [
  ['icon-180.png', 180, {}],
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }]
]) {
  writeFileSync(new URL(name, OUT), draw(size, opts));
  console.log('zapisano', name);
}
