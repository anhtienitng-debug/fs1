// Người que nét đậm, to gấp 3 + cái bóng người que viền đỏ. Ảnh duyệt trước khi sửa video.
// Chạy: node ve-nguoi-que-dam.js <thư mục ra>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const W = '#f4f1ea', BG = '#0b0b0c', RED = '#e63946', DARK = '#140809';
const ORANGE = '#ff8a1f', CORE = '#ffd166', COLD = '#bcd7ff', MUTED = '#8d8a84';
const LW = 6; // độ dày nét gốc (video cũ là 5)

const ln = (a, b, c, w) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const pl = (pts, c, w) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const mix = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];

// khớp theo gốc (0,0) = giữa hai bàn chân
const POSE = {
  slumpPhone: { head: [28, -180], neck: [12, -150], hip: [0, -72], le: [34, -108], lh: [46, -130], re: [10, -110], rh: [40, -126], lk: [-10, -36], lf: [-22, 0], rk: [12, -36], rf: [22, 0], mood: 'tired' },
  whisper: { head: [26, -186], neck: [12, -154], hip: [0, -72], le: [32, -122], lh: [46, -170], re: [-6, -112], rh: [-4, -80], lk: [-6, -36], lf: [-18, 0], rk: [12, -36], rf: [22, 0], mood: 'smirk' },
  armsUp: { head: [0, -195], neck: [0, -158], hip: [0, -72], le: [-34, -178], lh: [-56, -216], re: [34, -178], rh: [56, -216], lk: [-12, -36], lf: [-26, 0], rk: [12, -36], rf: [26, 0], mood: 'fierce' },
  stand: { head: [0, -195], neck: [0, -158], hip: [0, -72], le: [-22, -112], lh: [-28, -78], re: [22, -112], rh: [28, -78], lk: [-12, -36], lf: [-22, 0], rk: [12, -36], rf: [22, 0], mood: 'neutral' },
};

function eyes(x, y, mood, c, w) {
  if (mood === 'tired') return ln([x - 16, y + 4], [x - 4, y + 6], c, w * 0.8) + ln([x + 6, y + 6], [x + 18, y + 4], c, w * 0.8);
  let s = `<circle cx="${x - 11}" cy="${y + 2}" r="5" fill="${c}"/><circle cx="${x + 11}" cy="${y + 2}" r="5" fill="${c}"/>`;
  if (mood === 'fierce' || mood === 'smirk') s += ln([x - 20, y - 12], [x - 5, y - 6], c, w * 0.8) + ln([x + 20, y - 12], [x + 5, y - 6], c, w * 0.8);
  if (mood === 'smirk') s += `<path d="M${x - 10},${y + 16} Q${x + 2},${y + 22} ${x + 14},${y + 12}" fill="none" stroke="${c}" stroke-width="${w * 0.7}" stroke-linecap="round"/>`;
  return s;
}
function skeleton(J, c, w) {
  const sh = mix(J.neck, J.hip, 0.15);
  return ln(J.hip, J.neck, c, w) + pl([sh, J.le, J.lh], c, w) + pl([sh, J.re, J.rh], c, w) + pl([J.hip, J.lk, J.lf], c, w) + pl([J.hip, J.rk, J.rf], c, w);
}
function flame(x, base, sc) {
  const d = q => `M${x},${base - 100 * sc * q} C${x + 46 * sc * q},${base - 46 * sc * q} ${x + 34 * sc * q},${base} ${x},${base} C${x - 34 * sc * q},${base} ${x - 46 * sc * q},${base - 46 * sc * q} ${x},${base - 100 * sc * q}Z`;
  return `<path d="${d(1)}" fill="${ORANGE}"/><path d="${d(0.55)}" fill="${CORE}"/>`;
}
// nhân vật chính: người que trắng; k = tỷ lệ phóng; (x,g) = chỗ đứng
function hero(pose, x, g, k, o = {}) {
  const J = POSE[pose];
  let s = `<g transform="translate(${x},${g}) scale(${k})">`;
  if (o.flame) {
    const ch = mix(J.neck, J.hip, 0.42);
    s += `<circle cx="${ch[0]}" cy="${ch[1] - 10}" r="${60 + 110 * o.flame}" fill="url(#gO)" opacity="${0.3 + 0.3 * o.flame}"/>`;
  }
  s += skeleton(J, W, LW);
  if (o.flame) { const ch = mix(J.neck, J.hip, 0.42); s += flame(ch[0], ch[1] + 22 * Math.max(0.5, o.flame), o.flame * 0.62); }
  s += `<circle cx="${J.head[0]}" cy="${J.head[1]}" r="34" fill="${BG}" stroke="${W}" stroke-width="${LW}"/>` + eyes(J.head[0], J.head[1], J.mood, W, LW);
  return s + '</g>';
}
// cái bóng: cùng người que, viền đỏ, ruột tối
function shadow(pose, x, g, k, op = 1) {
  const J = POSE[pose];
  return `<g opacity="${op}" transform="translate(${x},${g}) scale(${k})">` + skeleton(J, RED, LW + 6) + skeleton(J, DARK, LW) +
    `<circle cx="${J.head[0]}" cy="${J.head[1]}" r="34" fill="${DARK}" stroke="${RED}" stroke-width="${LW}"/>` + eyes(J.head[0], J.head[1], J.mood, RED, LW) + '</g>';
}
const redText = (x, y, s, size = 54, op = 1) =>
  `<text x="${x}" y="${y}" fill="none" stroke="${RED}" stroke-width="2.2" stroke-opacity="${op}" font-family="Inter" font-size="${size}" font-weight="900" font-style="italic" text-anchor="middle">${s}</text>`;

const DEFS = `<defs><radialGradient id="gO"><stop offset="0" stop-color="${ORANGE}" stop-opacity=".9"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient>
<radialGradient id="gC"><stop offset="0" stop-color="${COLD}" stop-opacity=".6"/><stop offset="1" stop-color="${COLD}" stop-opacity="0"/></radialGradient></defs>`;
const frame = (body, label) => `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1280 720">${DEFS}<rect width="1280" height="720" fill="${BG}"/>${body}` +
  (label ? `<text x="24" y="34" fill="${MUTED}" font-family="Inter" font-size="16">${label}</text>` : '') + '</svg>';

const K = 3, G = 712; // to gấp 3 so với video cũ, chân sát đáy khung

// 1. Lướt điện thoại, cái bóng ghé tai thì thầm
function sceneScroll() {
  const hx = 770, sx = 430;
  const J = POSE.slumpPhone, ph = [hx + J.lh[0] * K + 14, G + J.lh[1] * K - 40];
  let s = `<circle cx="${ph[0]}" cy="${ph[1]}" r="260" fill="url(#gC)" opacity=".5"/>`;
  s += shadow('whisper', sx, G, K);
  s += hero('slumpPhone', hx, G, K, { flame: 0.35 });
  s += `<g transform="translate(${ph[0]},${ph[1]}) rotate(12)"><rect x="-30" y="-50" width="60" height="100" rx="10" fill="#dfe9f5" stroke="#fff" stroke-width="5"/></g>`;
  s += redText(210, 330, 'just one more', 44) + redText(200, 400, 'you can sleep', 36, 0.85) + redText(200, 440, 'later', 36, 0.85) + redText(200, 510, "it's not that late", 30, 0.6);
  return frame(s, 'Người que nét đậm · to gấp 3 · cảnh lướt điện thoại, cái bóng viền đỏ thì thầm');
}
// 2. Lửa bùng, cái bóng lùi lại
function sceneFlare() {
  let s = `<circle cx="640" cy="${G - 120 * K}" r="560" fill="url(#gO)" opacity=".35"/>`;
  s += shadow('stand', 1110, G, K * 0.7, 0.45);
  s += hero('armsUp', 560, G, K, { flame: 0.8 });
  return frame(s, 'Người que nét đậm · to gấp 3 · khoảnh khắc lửa bùng');
}
// 3. So sánh kích thước: video cũ (×1), ×2, ×3
function sceneCompare() {
  let s = `<line x1="0" y1="${G}" x2="1280" y2="${G}" stroke="#2a2a2a" stroke-width="3"/>`;
  [[90, 1, '×1 (video cũ)'], [370, 2, '×2'], [860, 3, '×3 (đề xuất)']].forEach(([x, k, lb]) => {
    s += hero('stand', x, G, k, { flame: 0.5 });
    s += `<text x="${x + 40 * k + 16}" y="${G - 120 * k}" fill="${k === 3 ? ORANGE : MUTED}" font-family="Inter" font-size="22" font-weight="800">${lb}</text>`;
  });
  return frame(s, 'So sánh kích thước trong khung 16:9 · nét gốc 6px, phóng theo tỷ lệ (×3 = nét 18px)');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [f, svg] of [['que-dam-1-luot.png', sceneScroll()], ['que-dam-2-lua-bung.png', sceneFlare()], ['que-dam-3-so-sanh.png', sceneCompare()]]) {
    await page.setContent(`<html><body style="margin:0;background:${BG}">${svg}</body></html>`);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, f) });
    console.log(f);
  }
  await browser.close();
})();
