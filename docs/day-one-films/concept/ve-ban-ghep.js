// Bản ghép Spark + Ember: người que, lửa trong ngực lan lên thành ngọn lửa trên đầu.
// Chạy: node ve-ban-ghep.js <thư mục ra>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const W = '#f4f1ea', BG = '#0b0b0c', MUTED = '#8d8a84';
const ORANGE = '#ff8a1f', CORE = '#ffd166', EMBER_DIM = '#7a4a22', SMOKE = '#3a3a3a';
const G = 560;
const st = (c = W, w = 5) => `stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const line = (x1, y1, x2, y2, c = W, w = 5) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${st(c, w)}/>`;
const text = (x, y, t, o = {}) =>
  `<text x="${x}" y="${y}" fill="${o.c || W}" font-family="Inter" font-size="${o.size || 20}" font-weight="${o.w || 400}" text-anchor="${o.a || 'middle'}"${o.it ? ' font-style="italic"' : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${t}</text>`;
const glow = (x, y, r, o = 0.4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gO)" opacity="${o}"/>`;
const DEFS = `<defs><radialGradient id="gO"><stop offset="0" stop-color="${ORANGE}" stop-opacity=".9"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient></defs>`;

function eyes(x, y, mood) {
  if (mood === 'tired') return line(x - 16, y + 4, x - 4, y + 6, W, 4) + line(x + 6, y + 6, x + 18, y + 4, W, 4);
  if (mood === 'neutral') return `<circle cx="${x - 11}" cy="${y + 2}" r="5" fill="${W}"/><circle cx="${x + 11}" cy="${y + 2}" r="5" fill="${W}"/>`;
  if (mood === 'happy') return `<path d="M${x - 17},${y + 4} Q${x - 11},${y - 4} ${x - 5},${y + 4} M${x + 5},${y + 4} Q${x + 11},${y - 4} ${x + 17},${y + 4}" fill="none" ${st(W, 4)}/>`;
  return `<circle cx="${x - 11}" cy="${y + 2}" r="5" fill="${W}"/><circle cx="${x + 11}" cy="${y + 2}" r="5" fill="${W}"/>` +
    line(x - 20, y - 12, x - 5, y - 7, W, 4) + line(x + 20, y - 12, x + 5, y - 7, W, 4);
}
function flame(x, base, sc, col = ORANGE, core = true) {
  const d = q => `M${x},${base - 100 * sc * q} C${x + 46 * sc * q},${base - 46 * sc * q} ${x + 34 * sc * q},${base} ${x},${base} C${x - 34 * sc * q},${base} ${x - 46 * sc * q},${base - 46 * sc * q} ${x},${base - 100 * sc * q}Z`;
  return `<path d="${d(1)}" fill="${col}"/>` + (core ? `<path d="${d(0.55)}" fill="${CORE}"/>` : '');
}
function smoke(x, y, k = 1) {
  let s = '';
  [[-40, -70, 40], [0, -100, 50], [40, -72, 40], [-10, -50, 38], [26, -40, 30]].forEach(([dx, dy, r]) =>
    s += `<circle cx="${x + dx * k}" cy="${y + dy * k}" r="${r * k}" fill="${SMOKE}"/>`);
  return s + `<path d="M${x - 22 * k},${y - 96 * k} l${14 * k},${6 * k} M${x + 22 * k},${y - 96 * k} l${-14 * k},${6 * k}" fill="none" ${st('#9a9a9a', 5 * k)}/>`;
}

// stage: 0 tắt · 1 nhóm · 2 cháy · 3 lan lên · 4 bùng
const POSE = ['slump', 'stand', 'stand', 'up', 'up'];
const MOOD = ['tired', 'neutral', 'fierce', 'fierce', 'happy'];
function hero(x, stage, gy = G) {
  const pose = POSE[stage];
  let hip = [x, gy - 70], neck = [x, gy - 155], head = [x, gy - 195], arms;
  if (pose === 'slump') {
    neck = [x + 12, gy - 148]; head = [x + 28, gy - 180];
    arms = [[neck, [x - 18, gy - 78]], [neck, [x + 34, gy - 76]]];
  } else if (pose === 'stand') arms = [[[x, gy - 140], [x - 30, gy - 78]], [[x, gy - 140], [x + 30, gy - 78]]];
  else arms = [[[x, gy - 140], [x - 55, gy - 215]], [[x, gy - 140], [x + 55, gy - 215]]];
  const legs = [[hip, [x - 24, gy]], [hip, [x + 24, gy]]];
  const chest = [x + (pose === 'slump' ? 6 : 0), gy - 112];
  let s = '';
  // hào quang
  if (stage === 2) s += glow(chest[0], chest[1] - 10, 120, 0.45);
  if (stage === 3) s += glow(x, gy - 170, 170, 0.45);
  if (stage === 4) s += glow(x, gy - 230, 240, 0.6);
  s += line(...hip, ...neck);
  // vệt lửa chạy dọc thân lên cổ (giai đoạn 3–4)
  if (stage >= 3) s += line(chest[0], chest[1] - 20, neck[0], neck[1] + 4, ORANGE, 7) + line(chest[0], chest[1] - 20, neck[0], neck[1] + 4, CORE, 3);
  arms.concat(legs).forEach(([a, b]) => s += line(...a, ...b));
  // lửa trong ngực
  if (stage === 0) s += `<circle cx="${chest[0]}" cy="${chest[1]}" r="6" fill="${EMBER_DIM}"/><path d="M${chest[0]},${chest[1] - 8} q-10,-16 4,-30 q-12,-14 2,-30" fill="none" ${st(SMOKE, 3)}/>`;
  else s += flame(chest[0], chest[1] + 20, [0, 0.32, 0.55, 0.45, 0.42][stage]);
  // đầu
  s += `<circle cx="${head[0]}" cy="${head[1]}" r="36" fill="${BG}" ${st()}/>` + eyes(head[0], head[1], MOOD[stage]);
  // lửa trên đầu
  if (stage === 3) s += flame(head[0], head[1] - 30, 0.55);
  if (stage === 4) {
    s += flame(head[0], head[1] - 28, 1.2);
    [[-60, -150], [56, -175], [-30, -205], [40, -125]].forEach(([dx, dy]) => s += `<circle cx="${head[0] + dx}" cy="${head[1] + dy * 0.6}" r="4" fill="${CORE}"/>`);
  }
  return s;
}

// So sánh: Spark (V1) và Ember gốc ở trạng thái mạnh nhất
function spark(x) {
  let s = glow(x, G - 120, 150, 0.55);
  s += line(x, G - 70, x, G - 155) + line(x, G - 140, x - 55, G - 215) + line(x, G - 140, x + 55, G - 215) + line(x, G - 70, x - 24, G) + line(x, G - 70, x + 24, G);
  s += `<circle cx="${x}" cy="${G - 195}" r="36" fill="${BG}" ${st()}/>` + eyes(x, G - 195, 'fierce');
  return s + flame(x, G - 92, 0.62);
}
function ember(x) {
  const top = G - 200;
  let s = glow(x, top - 60, 230, 0.5);
  s += line(x - 18, G - 20, x - 22, G) + line(x + 18, G - 20, x + 22, G) + line(x - 44, G - 120, x - 90, G - 200) + line(x + 44, G - 120, x + 90, G - 200);
  s += `<rect x="${x - 46}" y="${top}" width="92" height="182" rx="46" fill="${BG}" ${st()}/>` + eyes(x, top + 52, 'fierce');
  return s + flame(x, top + 4, 1.25);
}

const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}<rect width="${w}" height="${h}" fill="${BG}"/>${body}</svg>`;
const header = (t, sub) => text(60, 70, t, { a: 'start', w: 800, size: 36 }) + text(60, 104, sub, { a: 'start', c: MUTED, size: 19 });

// 1. Thẻ trước / sau
function card() {
  let b = text(60, 78, 'GHÉP', { a: 'start', c: ORANGE, w: 800, size: 26, ls: 3 }) + text(160, 78, 'Ember (bản ghép Spark + Ember)', { a: 'start', w: 800, size: 34 });
  b += text(340, 150, 'BUÔNG THẢ · DAY 47', { c: MUTED, w: 700, size: 18, ls: 4 }) + text(940, 150, 'KỶ LUẬT · DAY 190', { c: ORANGE, w: 700, size: 18, ls: 4 });
  b += `<line x1="640" y1="140" x2="640" y2="600" stroke="#222" stroke-width="2"/>`;
  b += line(140, G, 540, G, '#2a2a2a', 3) + line(740, G, 1140, G, '#2a2a2a', 3);
  b += smoke(210, 330, 0.9) + text(210, 210, 'why even try?', { c: '#9a9a9a', it: true, size: 22 }) + hero(360, 0);
  b += hero(940, 4);
  b += text(640, 660, 'Lửa nhỏ trong tim → lan dọc thân → bùng thành ngọn lửa trên đầu.', { c: '#cfcbc2', size: 24 });
  return svg(1280, 720, b);
}

// 2. Dải 5 giai đoạn
function stages() {
  const names = ['0 · Tắt', '1 · Nhóm lửa', '2 · Cháy trong tim', '3 · Lan lên', '4 · Bùng'];
  const notes = ['chỉ còn tàn + khói', 'Day 1, lửa nhỏ trong ngực', 'montage, hào quang ở ngực', 'vệt lửa chạy lên cổ, đầu bắt lửa', 'thử thách cuối, cảnh kết'];
  const beats = ['Nhịp 1–2: trượt dốc', 'Nhịp 3: bước ngoặt', 'Nhịp 4: montage', 'Nhịp 5: thử thách', 'Nhịp 6: kết'];
  let b = header('Ember (bản ghép) · 5 giai đoạn của ngọn lửa', 'Ngọn lửa là thanh tiến trình. Mỗi giai đoạn khớp với một nhịp của kịch bản 6 nhịp.');
  b += line(80, 760, 1840, 760, '#2a2a2a', 3);
  const K = 1.3;
  names.forEach((n, i) => {
    const x = 230 + i * 365;
    b += `<g transform="translate(${x},760) scale(${K}) translate(${-x},-760)">${hero(x, i, 760)}</g>`;
    b += text(x, 820, n, { w: 800, size: 24, c: i === 0 ? MUTED : W });
    b += text(x, 852, notes[i], { size: 17, c: MUTED });
    b += `<rect x="${x - 110}" y="880" width="220" height="40" rx="20" fill="#1b130c" stroke="${i === 0 ? '#333' : ORANGE}" stroke-width="2"/>`;
    b += text(x, 907, beats[i], { size: 16, c: i === 0 ? MUTED : ORANGE, w: 700 });
  });
  b += `<path d="M150,990 L1770,990" ${st('#2a2a2a', 3)}/><path d="M1760,980 l14,10 l-14,10" fill="none" ${st('#2a2a2a', 3)}/>`;
  b += text(960, 1030, 'Kích thước lửa luôn khớp với mức kỷ luật · màu nhấn duy nhất: cam #FF8A1F', { size: 18, c: MUTED });
  return svg(1920, 1080, b);
}

// 3. Thử ở cỡ thumbnail
function thumbTest() {
  const who = [['V1 · Spark', x => spark(x)], ['Ember gốc', x => ember(x)], ['Bản ghép', x => hero(x, 4)]];
  const sizes = [[480, 270, 'Trang chủ (lớn)'], [246, 138, 'Kết quả tìm kiếm'], [168, 94, 'Đề xuất bên cạnh']];
  let b = header('Thử độ nhận diện ở cỡ thumbnail', 'Cùng một cảnh mạnh nhất, thu nhỏ theo 3 cỡ YouTube thực tế hiển thị.');
  sizes.forEach(([w, h, lb], c) => b += text(560 + [0, 560, 886][c] + w / 2, 170, lb, { size: 18, c: MUTED, w: 700 }));
  who.forEach(([name, fn], r) => {
    const y = 200 + r * 290;
    b += text(60, y + 140, name, { a: 'start', w: 800, size: 26, c: r === 2 ? ORANGE : W });
    sizes.forEach(([w, h], c) => {
      const x = 560 + [0, 560, 886][c];
      b += `<rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" rx="8" fill="none" stroke="${r === 2 ? ORANGE : '#2a2a2a'}" stroke-width="2"/>`;
      b += `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="620 205 640 360" preserveAspectRatio="xMidYMid slice"><rect x="0" y="0" width="2000" height="2000" fill="#111"/>${fn(940)}` +
        `<text x="1240" y="268" fill="${W}" font-family="Inter" font-weight="900" font-size="50" text-anchor="end">DISCIPLINE</text></svg>`;
    });
  });
  return svg(1920, 1080, b);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const [f, s, w, h] of [['int-ghep-truoc-sau.png', card(), 1280, 720], ['int-ghep-5-giai-doan.png', stages(), 1920, 1080], ['int-ghep-thu-thumbnail.png', thumbTest(), 1920, 1080]]) {
    await page.setContent(`<html><body style="margin:0;background:${BG}">${s}</body></html>`);
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(OUT, f), clip: { x: 0, y: 0, width: w, height: h } });
    console.log(f);
  }
  await browser.close();
})();
