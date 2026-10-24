// 5 biến thể nhân vật kênh quốc tế + bảng chấm điểm theo nhận định người xem.
// Chạy: node ve-bien-the-int.js <thư mục ra>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const W = '#f4f1ea', BG = '#0b0b0c', MUTED = '#8d8a84';
const ORANGE = '#ff8a1f', CORE = '#ffd166', EMBER_DIM = '#7a4a22', SMOKE = '#3a3a3a', RED = '#e63946';
const G = 560;
const st = (c = W, w = 5) => `stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const line = (x1, y1, x2, y2, c = W, w = 5) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${st(c, w)}/>`;
const text = (x, y, t, o = {}) =>
  `<text x="${x}" y="${y}" fill="${o.c || W}" font-family="Inter" font-size="${o.size || 20}" font-weight="${o.w || 400}" text-anchor="${o.a || 'middle'}"${o.it ? ' font-style="italic"' : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${t}</text>`;
const glow = (x, y, r, o = 0.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gO)" opacity="${o}"/>`;
const ground = cx => line(cx - 200, G, cx + 200, G, '#2a2a2a', 3);
const DEFS = `<defs><radialGradient id="gO"><stop offset="0" stop-color="${ORANGE}" stop-opacity=".9"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient></defs>`;

function eyes(x, y, mood, c = W, k = 1) {
  if (mood === 'tired') return line(x - 16 * k, y + 4 * k, x - 4 * k, y + 6 * k, c, 4 * k) + line(x + 6 * k, y + 6 * k, x + 18 * k, y + 4 * k, c, 4 * k);
  return `<circle cx="${x - 11 * k}" cy="${y + 2 * k}" r="${5 * k}" fill="${c}"/><circle cx="${x + 11 * k}" cy="${y + 2 * k}" r="${5 * k}" fill="${c}"/>` +
    line(x - 20 * k, y - 12 * k, x - 5 * k, y - 7 * k, c, 4 * k) + line(x + 20 * k, y - 12 * k, x + 5 * k, y - 7 * k, c, 4 * k);
}
function flame(x, base, sc, lit = true) {
  const d = q => `M${x},${base - 100 * sc * q} C${x + 46 * sc * q},${base - 46 * sc * q} ${x + 34 * sc * q},${base} ${x},${base} C${x - 34 * sc * q},${base} ${x - 46 * sc * q},${base - 46 * sc * q} ${x},${base - 100 * sc * q}Z`;
  return lit ? `<path d="${d(1)}" fill="${ORANGE}"/><path d="${d(0.55)}" fill="${CORE}"/>` : `<path d="${d(1)}" fill="${EMBER_DIM}"/>`;
}
function smoke(x, y, k = 1) {
  let s = '';
  [[-40, -70, 40], [0, -100, 50], [40, -72, 40], [-10, -50, 38], [26, -40, 30]].forEach(([dx, dy, r]) =>
    s += `<circle cx="${x + dx * k}" cy="${y + dy * k}" r="${r * k}" fill="${SMOKE}"/>`);
  return s + `<path d="M${x - 22 * k},${y - 96 * k} l${14 * k},${6 * k} M${x + 22 * k},${y - 96 * k} l${-14 * k},${6 * k}" fill="none" ${st('#9a9a9a', 5 * k)}/>`;
}
const whisper = (x, y, t) => text(x, y, t, { c: '#9a9a9a', it: true, size: 22 });

// Người que cơ bản
function stick(x, pose) {
  let hip = [x, G - 70], neck = [x, G - 155], head = [x, G - 195], arms, legs;
  if (pose === 'slump') {
    neck = [x + 12, G - 148]; head = [x + 28, G - 180];
    arms = [[neck, [x - 18, G - 78]], [neck, [x + 34, G - 76]]];
  } else arms = [[[x, G - 140], [x - 55, G - 215]], [[x, G - 140], [x + 55, G - 215]]];
  legs = [[hip, [x - 24, G]], [hip, [x + 24, G]]];
  let s = line(...hip, ...neck);
  arms.concat(legs).forEach(([a, b]) => s += line(...a, ...b));
  s += `<circle cx="${head[0]}" cy="${head[1]}" r="36" fill="${BG}" ${st()}/>` + eyes(head[0], head[1], pose === 'slump' ? 'tired' : 'fierce');
  return { s, neck, hip, head };
}

// ---------------- Các biến thể ----------------
const V = [];

// V0 – Ember gốc (để so sánh)
function capsule(cx, mood) {
  const top = G - 200;
  let s = line(cx - 18, G - 20, cx - 22, G) + line(cx + 18, G - 20, cx + 22, G);
  s += mood === 'tired' ? line(cx - 44, G - 110, cx - 64, G - 50) + line(cx + 44, G - 110, cx + 64, G - 50)
    : line(cx - 44, G - 120, cx - 90, G - 200) + line(cx + 44, G - 120, cx + 90, G - 200);
  s += `<rect x="${cx - 46}" y="${top}" width="92" height="182" rx="46" fill="${BG}" ${st()}/>` + eyes(cx, top + 52, mood);
  return { s, top };
}
V.push({
  id: 'v0', code: 'INT1', name: 'Ember (gốc)', tag: 'Thân viên nang, lửa trên đầu',
  mech: 'Ngọn lửa trên đầu là thanh tiến trình.',
  low(cx) { const b = capsule(cx, 'tired'); return ground(cx) + smoke(cx - 120, 330) + b.s + flame(cx + 4, b.top - 2, 0.28, false); },
  high(cx) { const b = capsule(cx, 'fierce'); return glow(cx, b.top - 60, 230, 0.5) + ground(cx) + b.s + flame(cx, b.top + 4, 1.25); },
});

// V1 – Spark: người que, lửa trong ngực
V.push({
  id: 'v1-spark', code: 'V1', name: 'Spark', tag: 'Người que, ngọn lửa trong ngực',
  mech: 'Ngọn lửa "inner fire" nằm trong ngực. Ai nhìn cũng thấy đó là mình.',
  low(cx) {
    const f = stick(cx, 'slump');
    return ground(cx) + smoke(cx - 130, 360, 0.9) + whisper(cx - 130, 230, 'why even try?') + f.s +
      `<circle cx="${cx + 8}" cy="${G - 118}" r="6" fill="${EMBER_DIM}"/>`;
  },
  high(cx) {
    const f = stick(cx, 'up');
    return glow(cx, G - 120, 150, 0.55) + ground(cx) + f.s + flame(cx, G - 92, 0.62);
  },
});

// V2 – Wick: cây nến
function candle(cx, h, mood, lit) {
  const top = G - h;
  let s = line(cx - 20, G - 10, cx - 26, G) + line(cx + 20, G - 10, cx + 26, G);
  s += mood === 'tired' ? line(cx - 40, top + 70, cx - 66, top + 130) + line(cx + 40, top + 70, cx + 66, top + 130)
    : line(cx - 40, top + 70, cx - 92, top - 10) + line(cx + 40, top + 70, cx + 92, top - 10);
  s += `<path d="M${cx - 42},${G - 8} L${cx - 42},${top + 10} Q${cx - 42},${top} ${cx - 30},${top} L${cx + 30},${top} Q${cx + 42},${top} ${cx + 42},${top + 10} L${cx + 42},${G - 8}Z" fill="${BG}" ${st()}/>`;
  s += `<path d="M${cx - 42},${top + 18} q8,0 8,22 q0,14 6,14 q6,0 6,-20 q0,-16 10,-16" fill="none" ${st(W, 4)}/>`;
  s += eyes(cx, top + 60, mood);
  s += line(cx, top, cx, top - 12, '#cfcbc2', 3);
  return { s, top };
}
V.push({
  id: 'v2-wick', code: 'V2', name: 'Wick', tag: 'Thân là cây nến',
  mech: 'Sáp chảy theo thời gian. Phí thời gian thì nến ngắn đi mà không toả sáng.',
  low(cx) {
    const c = candle(cx, 120, 'tired');
    return ground(cx) + `<ellipse cx="${cx}" cy="${G - 2}" rx="90" ry="12" fill="${BG}" ${st(W, 4)}/>` + c.s +
      flame(cx, c.top - 12, 0.25, false) + smoke(cx - 140, 330, 0.85) + whisper(cx - 140, 210, 'plenty of time…');
  },
  high(cx) { const c = candle(cx, 200, 'fierce'); return glow(cx, c.top - 60, 220, 0.5) + ground(cx) + c.s + flame(cx, c.top - 10, 1.05); },
});

// V3 – Match: que diêm
function match(cx, mood, lit, tilt = 0) {
  const top = G - 230;
  let s = `<g transform="rotate(${tilt} ${cx} ${G})">`;
  s += line(cx - 8, G - 50, cx - 26, G) + line(cx + 8, G - 50, cx + 26, G);
  s += mood === 'tired' ? line(cx, top + 110, cx - 44, top + 170) + line(cx, top + 110, cx + 44, top + 170)
    : line(cx, top + 110, cx - 80, top + 40) + line(cx, top + 110, cx + 80, top + 40);
  s += `<rect x="${cx - 13}" y="${top + 40}" width="26" height="${G - 50 - top - 40}" rx="4" fill="${BG}" ${st()}/>`;
  s += `<ellipse cx="${cx}" cy="${top + 22}" rx="30" ry="38" fill="${lit ? '#2a1a12' : RED}"/>`;
  s += eyes(cx, top + 22, mood, lit ? W : W);
  return s + '</g>';
}
V.push({
  id: 'v3-match', code: 'V3', name: 'Match', tag: 'Que diêm, đầu đỏ bật lửa',
  mech: 'Khoảnh khắc "quẹt diêm" là Day 1. Rủi ro: diêm chỉ cháy được một lần.',
  low(cx) {
    return ground(cx) + smoke(cx - 140, 330, 0.85) + whisper(cx - 140, 210, 'not today…') + match(cx, 'tired', false, 8) +
      `<rect x="${cx + 70}" y="${G - 34}" width="90" height="34" rx="4" fill="#1a1a1a" ${st('#444', 3)}/>` + text(cx + 115, G - 11, 'MATCHES', { size: 13, c: '#666', w: 700 });
  },
  high(cx) {
    const top = G - 230;
    return glow(cx, top, 220, 0.55) + ground(cx) + match(cx, 'fierce', true) + flame(cx, top + 24, 1.1);
  },
});

// V4 – Kindle: chibi, tóc lửa
function chibi(cx, mood, sc) {
  const hy = G - 170;
  let s = line(cx - 16, G - 50, cx - 22, G) + line(cx + 16, G - 50, cx + 22, G);
  s += mood === 'tired' ? line(cx - 34, G - 100, cx - 52, G - 60) + line(cx + 34, G - 100, cx + 52, G - 60)
    : line(cx - 34, G - 100, cx - 80, G - 160) + line(cx + 34, G - 100, cx + 80, G - 160);
  s += `<path d="M${cx - 42},${G - 110} Q${cx},${G - 124} ${cx + 42},${G - 110} L${cx + 36},${G - 46} L${cx - 36},${G - 46}Z" fill="#1c1c1e" ${st()}/>`;
  const F = (dx, h, w) => `M${cx + dx - w},${hy - 52} Q${cx + dx - w * 0.6},${hy - 52 - h * 0.6} ${cx + dx},${hy - 52 - h} Q${cx + dx + w * 0.6},${hy - 52 - h * 0.6} ${cx + dx + w},${hy - 52}Z`;
  const col = sc > 0.5 ? ORANGE : EMBER_DIM;
  s += `<path d="${F(-26, 60 * sc, 20)}" fill="${col}"/><path d="${F(26, 60 * sc, 20)}" fill="${col}"/><path d="${F(0, 100 * sc, 26)}" fill="${col}"/>`;
  if (sc > 0.5) s += `<path d="${F(0, 58 * sc, 14)}" fill="${CORE}"/>`;
  s += `<circle cx="${cx}" cy="${hy}" r="62" fill="${BG}" ${st()}/>`;
  if (mood === 'tired') s += line(cx - 32, hy + 10, cx - 12, hy + 12, W, 5) + line(cx + 12, hy + 12, cx + 32, hy + 10, W, 5);
  else s += `<ellipse cx="${cx - 21}" cy="${hy + 6}" rx="10" ry="14" fill="${W}"/><ellipse cx="${cx + 21}" cy="${hy + 6}" rx="10" ry="14" fill="${W}"/><circle cx="${cx - 18}" cy="${hy + 1}" r="3.5" fill="${BG}"/><circle cx="${cx + 24}" cy="${hy + 1}" r="3.5" fill="${BG}"/>` +
    line(cx - 34, hy - 14, cx - 12, hy - 8, W, 5) + line(cx + 34, hy - 14, cx + 12, hy - 8, W, 5);
  return s;
}
V.push({
  id: 'v4-kindle', code: 'V4', name: 'Kindle', tag: 'Chibi đầu to, tóc là ngọn lửa',
  mech: 'Tóc lửa dựng lên khi có động lực. Dễ thương, hợp khán giả học sinh.',
  low(cx) { return ground(cx) + smoke(cx - 140, 330, 0.85) + whisper(cx - 140, 210, 'five more minutes…') + chibi(cx, 'tired', 0.35); },
  high(cx) { return glow(cx, G - 230, 220, 0.5) + ground(cx) + chibi(cx, 'fierce', 1.15); },
});

// V5 – Ash: bóng đen, vết nứt lửa
function silhouette(cx, lit) {
  const col = lit ? '#141416' : '#1d1d1f', rim = lit ? ORANGE : '#333';
  let s = '';
  const limb = (a, b) => line(...a, ...b, col, 24) + line(...a, ...b, rim, 2);
  if (lit) {
    s += limb([cx - 30, G - 150], [cx - 90, G - 230]) + limb([cx + 30, G - 150], [cx + 90, G - 230]);
  } else {
    s += limb([cx - 30, G - 150], [cx - 46, G - 70]) + limb([cx + 30, G - 150], [cx + 46, G - 70]);
  }
  s += limb([cx - 18, G - 70], [cx - 26, G]) + limb([cx + 18, G - 70], [cx + 26, G]);
  s += `<path d="M${cx - 42},${G - 160} L${cx + 42},${G - 160} L${cx + 30},${G - 64} L${cx - 30},${G - 64}Z" fill="${col}" stroke="${rim}" stroke-width="2"/>`;
  const hy = lit ? G - 205 : G - 196, hx = lit ? cx : cx + 14;
  s += `<circle cx="${hx}" cy="${hy}" r="38" fill="${col}" stroke="${rim}" stroke-width="2"/>`;
  if (lit) {
    s += `<path d="M${cx - 10},${G - 150} l14,26 l-10,18 l16,30 M${cx + 14},${G - 140} l-8,22 l12,16 M${cx - 6},${G - 220} l10,12 l-6,14" fill="none" ${st(ORANGE, 3)}/>`;
    s += `<ellipse cx="${hx - 13}" cy="${hy + 2}" rx="8" ry="4" fill="${CORE}"/><ellipse cx="${hx + 13}" cy="${hy + 2}" rx="8" ry="4" fill="${CORE}"/>`;
  } else s += `<ellipse cx="${hx - 9}" cy="${hy + 6}" rx="6" ry="2" fill="#444"/><ellipse cx="${hx + 15}" cy="${hy + 6}" rx="6" ry="2" fill="#444"/>`;
  return s;
}
V.push({
  id: 'v5-ash', code: 'V5', name: 'Ash', tag: 'Bóng đen, vết nứt phát lửa',
  mech: 'Kỷ luật làm cơ thể nứt ra ánh lửa. Tông "aura", ngầu nhưng gắt.',
  low(cx) { return ground(cx) + smoke(cx - 140, 330, 0.85) + whisper(cx - 140, 210, 'you\'ll never change') + silhouette(cx, false); },
  high(cx) { return glow(cx, G - 150, 230, 0.55) + ground(cx) + silhouette(cx, true); },
});

// ---------------- Thẻ từng biến thể ----------------
function card(v) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">${DEFS}
  <rect width="1280" height="720" fill="${BG}"/>
  ${text(60, 78, v.code, { a: 'start', c: ORANGE, w: 800, size: 26, ls: 3 })}
  ${text(60 + v.code.length * 22 + 22, 78, v.name, { a: 'start', w: 800, size: 36 })}
  ${text(1220, 78, v.tag, { a: 'end', c: MUTED, size: 24 })}
  ${text(340, 150, 'BUÔNG THẢ · DAY 47', { c: MUTED, w: 700, size: 18, ls: 4 })}
  ${text(940, 150, 'KỶ LUẬT · DAY 190', { c: ORANGE, w: 700, size: 18, ls: 4 })}
  <line x1="640" y1="140" x2="640" y2="600" stroke="#222" stroke-width="2"/>
  <g>${v.low(340)}</g><g>${v.high(940)}</g>
  ${text(640, 660, v.mech, { c: '#cfcbc2', size: 24 })}</svg>`;
}

// ---------------- Bảng chấm điểm ----------------
const CRIT = [
  ['Tự nhận là mình', 30, '"Literally me", "exact depiction of my life"'],
  ['Ẩn dụ đọc không cần chữ', 25, '"using colour as the thing the phone steals… clean idea"'],
  ['Tông bình tĩnh, chân thành', 15, '"No phonk, no voiceover, still pure advice", "calm"'],
  ['Không bị chê "AI"', 15, '"is AI…", "Ai video" dưới video'],
  ['Nổi bật ở thumbnail, khác đối thủ', 15, '"the power of the red band"'],
];
const SCORES = {
  'v0': [7, 9, 8, 8, 8],
  'v1-spark': [10, 8, 9, 9, 5],
  'v2-wick': [5, 9, 8, 7, 8],
  'v3-match': [5, 7, 7, 8, 8],
  'v4-kindle': [7, 7, 8, 6, 7],
  'v5-ash': [6, 8, 4, 5, 6],
};
const total = id => SCORES[id].reduce((a, s, i) => a + s * CRIT[i][1] / 100, 0);

function scorecard() {
  const order = [...V].sort((a, b) => total(b.id) - total(a.id));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">${DEFS}<rect width="1920" height="1080" fill="${BG}"/>`;
  s += text(60, 70, 'Kênh quốc tế · chấm điểm theo nhận định người xem', { a: 'start', w: 800, size: 36 });
  s += text(60, 104, 'Tiêu chí rút ra từ bình luận của DISCIPLINE, DOPAMINE, Stop Overthinking (Day One Films). Điểm 1–10, tổng có trọng số.', { a: 'start', c: MUTED, size: 19 });
  const colX = [560, 790, 1020, 1250, 1480], rowY0 = 210, rowH = 140;
  CRIT.forEach(([n, w], i) => {
    s += text(colX[i] + 100, 160, n, { size: 17, w: 700 });
    s += text(colX[i] + 100, 184, `trọng số ${w}%`, { size: 15, c: MUTED });
  });
  s += text(1790, 172, 'TỔNG', { w: 800, size: 18, c: ORANGE, ls: 3 });
  order.forEach((v, r) => {
    const y = rowY0 + r * rowH;
    const best = r === 0;
    s += `<rect x="40" y="${y}" width="1840" height="${rowH - 12}" rx="14" fill="${best ? '#1b130c' : '#111113'}" stroke="${best ? ORANGE : '#1f1f22'}" stroke-width="2"/>`;
    // ảnh thu nhỏ (thử độ nhận diện ở cỡ thumbnail)
    s += `<rect x="60" y="${y + 9}" width="140" height="110" rx="8" fill="${BG}" stroke="#2a2a2a"/>`;
    s += `<svg x="62" y="${y + 11}" width="136" height="106" viewBox="700 190 480 375" preserveAspectRatio="xMidYMid meet">${v.high(940)}</svg>`;
    s += text(225, y + 52, `${v.code} · ${v.name}`, { a: 'start', w: 800, size: 24 });
    s += text(225, y + 82, v.tag, { a: 'start', c: MUTED, size: 16 });
    SCORES[v.id].forEach((sc, i) => {
      const bx = colX[i] + 10, by = y + 52;
      s += `<rect x="${bx}" y="${by}" width="180" height="16" rx="8" fill="#222"/>`;
      s += `<rect x="${bx}" y="${by}" width="${18 * sc}" height="16" rx="8" fill="${sc >= 8 ? ORANGE : sc >= 6 ? '#a8692a' : '#5a3a20'}"/>`;
      s += text(bx + 90, by + 46, sc, { w: 700, size: 20 });
    });
    s += text(1790, y + 76, total(v.id).toFixed(2), { w: 800, size: 40, c: best ? ORANGE : W });
  });
  return s + '</svg>';
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const shot = async (svg, f, w, h) => {
    await page.setContent(`<html><body style="margin:0;background:${BG}">${svg}</body></html>`);
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(OUT, f), clip: { x: 0, y: 0, width: w, height: h } });
    console.log(f);
  };
  for (const v of V.slice(1)) await shot(card(v), `int-${v.id}.png`, 1280, 720);
  await shot(scorecard(), 'int-cham-diem.png', 1920, 1080);
  for (const v of V) console.log(v.id, total(v.id).toFixed(2));
  await browser.close();
})();
