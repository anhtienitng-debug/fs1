// Vẽ concept nhân vật (SVG) và xuất PNG bằng Playwright.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const W = '#f4f1ea', BG = '#0b0b0c', GREY = '#6b6b6b';
const RED = '#e63946', ORANGE = '#ff8a1f', GOLD = '#f2c14e', GREEN = '#3ee86a';
const G = 560; // ground
const st = (c = W, w = 5) => `stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const line = (x1, y1, x2, y2, c = W, w = 5) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${st(c, w)}/>`;
const glow = (x, y, r, c, o = 0.35) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#g${c.slice(1)})" opacity="${o}"/>`;
const ground = (cx) => line(cx - 200, G, cx + 200, G, '#2a2a2a', 3);

// Con quỷ dạng bóng ma
function ghost(x, y, c, s = 1) {
  const p = `M${-45},0 Q${-58},-150 0,-172 Q${58},-150 45,0 Q30,-16 15,0 Q0,-16 -15,0 Q-30,-16 -45,0Z`;
  return `<g transform="translate(${x},${y}) scale(${s})">
    <path d="${p}" fill="${c}" fill-opacity=".14" ${st(c, 4)}/>
    <path d="M-22,-118 l14,6 M22,-118 l-14,6" ${st(c, 5)}/>
    <path d="M-14,-88 q14,-8 28,0" fill="none" ${st(c, 4)}/></g>`;
}
function whisper(x, y, t, c) {
  return `<text x="${x}" y="${y}" fill="${c}" font-family="Inter" font-style="italic" font-size="22" text-anchor="middle">${t}</text>`;
}

// Người que cơ bản. pose: slump | up | walk. Trả về {svg, head:[x,y], neck, hip}
function fig(x, pose, o = {}) {
  const c = o.c || W;
  let hip = [x, G - 70], neck = [x, G - 155], head = [x, G - 195], arms, legs;
  if (pose === 'slump') {
    neck = [x + 12, G - 148]; head = [x + 28, G - 180];
    arms = [[neck, [x - 18, G - 78]], [neck, [x + 34, G - 76]]];
    legs = [[hip, [x - 22, G]], [hip, [x + 22, G]]];
  } else if (pose === 'walk') {
    arms = [[[x, G - 140], [x - 42, G - 88]], [[x, G - 140], [x + 44, G - 100]]];
    legs = [[hip, [x - 34, G]], [hip, [x + 40, G - 4]]];
  } else {
    arms = [[[x, G - 140], [x - 55, G - 215]], [[x, G - 140], [x + 55, G - 215]]];
    legs = [[hip, [x - 26, G]], [hip, [x + 26, G]]];
  }
  let s = '';
  if (!o.noBody) s += line(hip[0], hip[1], neck[0], neck[1], c);
  if (!o.noArms) arms.forEach(([a, b]) => s += line(a[0], a[1], b[0], b[1], c));
  legs.forEach(([a, b]) => s += line(a[0], a[1], b[0], b[1], c));
  s += `<circle cx="${head[0]}" cy="${head[1]}" r="36" fill="${BG}" ${st(c)}/>`;
  s += eyes(head[0], head[1], pose === 'slump' ? 'tired' : 'fierce', c);
  return { svg: s, head, neck, hip, arms, legs };
}
function eyes(x, y, mood, c = W) {
  if (mood === 'tired') return line(x - 16, y + 4, x - 4, y + 6, c, 4) + line(x + 6, y + 6, x + 18, y + 4, c, 4);
  return `<circle cx="${x - 11}" cy="${y + 2}" r="5" fill="${c}"/><circle cx="${x + 11}" cy="${y + 2}" r="5" fill="${c}"/>` +
    line(x - 20, y - 12, x - 5, y - 7, c, 4) + line(x + 20, y - 12, x + 5, y - 7, c, 4);
}

// ---------------- VN1 Bảo – mũ bảo hiểm ----------------
function helmet(hx, hy, col, dusty) {
  let s = `<path d="M${hx - 42},${hy - 2} A42,42 0 0 1 ${hx + 42},${hy - 2} L${hx + 46},${hy + 6} L${hx - 46},${hy + 6}Z" fill="${col}" ${st(col, 3)}/>`;
  if (!dusty) s += `<path d="M${hx - 24},${hy - 26} A30,30 0 0 1 ${hx + 6},${hy - 36}" fill="none" ${st('#ffd6d9', 4)}/>`;
  else for (const [dx, dy] of [[-20, -18], [4, -30], [18, -12], [-6, -8], [26, -24]])
    s += `<circle cx="${hx + dx}" cy="${hy + dy}" r="3" fill="#9a9a9a"/>`;
  return s;
}
const VN1 = {
  code: 'VN1', slug: 'bao-mu-bao-hiem', name: 'Bảo', tag: 'Mũ bảo hiểm đỏ', color: RED,
  mech: 'Mũ treo xó bám bụi khi trì hoãn. Đội mũ, cài quai "tách" là lên đường.',
  low(cx) {
    const f = fig(cx - 10, 'slump');
    return ground(cx) + ghost(cx - 130, G, RED, 0.95) + whisper(cx - 130, G - 200, 'thôi để mai…', RED) +
      line(cx + 140, 250, cx + 140, 268, GREY, 4) + helmet(cx + 140, 300, '#5a2a2d', true) + f.svg;
  },
  high(cx) {
    const f = fig(cx, 'up');
    return glow(cx, G - 200, 190, RED) + ground(cx) + f.svg + helmet(f.head[0], f.head[1] - 14, RED, false) +
      line(f.head[0] - 38, f.head[1] - 4, f.head[0] - 16, f.head[1] + 34, RED, 3) +
      line(f.head[0] + 38, f.head[1] - 4, f.head[0] + 16, f.head[1] + 34, RED, 3);
  },
};

// ---------------- VN2 Hạt – hạt gạo ----------------
function grain(cx, mood, tilt = 0) {
  const cy = G - 115;
  return `<g transform="rotate(${tilt} ${cx} ${G})">` +
    line(cx - 18, G - 40, cx - 26, G) + line(cx + 18, G - 40, cx + 26, G) +
    (mood === 'tired' ? line(cx - 44, cy + 10, cx - 66, cy + 70) + line(cx + 44, cy + 10, cx + 66, cy + 70)
      : line(cx - 44, cy - 10, cx - 90, cy - 80) + line(cx + 44, cy - 10, cx + 90, cy - 80)) +
    `<ellipse cx="${cx}" cy="${cy}" rx="50" ry="88" fill="${W}"/>` +
    `<path d="M${cx - 18},${cy - 60} q-10,40 0,90" fill="none" stroke="#d9d3c3" stroke-width="5" stroke-linecap="round"/>` +
    eyes(cx, cy - 30, mood, BG) + '</g>';
}
const VN2 = {
  code: 'VN2', slug: 'hat-gao', name: 'Hạt', tag: 'Hạt gạo, lá mạ đỏ', color: RED,
  mech: 'Lá mạ trên đầu héo khi buông thả, mọc dài thêm theo bộ đếm ngày.',
  low(cx) {
    const top = G - 203;
    let s = ground(cx) + grain(cx, 'tired', 6);
    s += `<path d="M${cx + 20},${top + 2} q10,-40 50,-30 q20,8 18,40" fill="none" ${st('#7a2e33', 6)}/>`;
    s += `<path d="M${cx + 88},${top + 12} q-26,10 -20,40 q24,-8 20,-40Z" fill="#7a2e33"/>`;
    [0, 1, 2, 3].forEach(i => s += `<circle cx="${cx + 52 + i * 12}" cy="${top - 30 + (i % 2) * 4}" r="8" fill="${RED}"/>`);
    s += `<circle cx="${cx + 92}" cy="${top - 28}" r="2.5" fill="${BG}"/>`;
    return s + whisper(cx, 250, 'mệt thì nghỉ đi…', RED);
  },
  high(cx) {
    const top = G - 203;
    return glow(cx, G - 160, 200, RED) + ground(cx) + grain(cx, 'fierce') +
      line(cx, top, cx, top - 70, RED, 6) +
      `<path d="M${cx},${top - 40} q-40,-10 -52,-46 q40,4 52,46Z" fill="${RED}"/>` +
      `<path d="M${cx},${top - 60} q40,-14 48,-54 q-40,8 -48,54Z" fill="${RED}"/>` +
      `<path d="M${cx},${top - 70} q-6,-30 6,-50 q8,26 -6,50Z" fill="${RED}"/>`;
  },
};

// ---------------- VN3 Tèo – áo ba lỗ, dép tổ ong ----------------
function tank(x, neck) {
  const nx = neck[0], ny = neck[1];
  return `<path d="M${nx - 26},${ny + 8} L${nx - 12},${ny - 2} Q${nx},${ny + 14} ${nx + 12},${ny - 2} L${nx + 26},${ny + 8} L${x + 22},${G - 68} L${x - 22},${G - 68}Z" fill="${BG}" ${st()}/>`;
}
function sandal(x, y, col, worn) {
  let s = `<ellipse cx="${x}" cy="${y + 4}" rx="22" ry="8" fill="${col}"/>`;
  if (!worn) for (let i = -2; i <= 2; i++) s += `<circle cx="${x + i * 8}" cy="${y + 4}" r="2" fill="${BG}"/>`;
  else s += line(x - 6, y, x + 4, y + 8, BG, 2);
  return s;
}
const VN3 = {
  code: 'VN3', slug: 'teo-dep-to-ong', name: 'Tèo', tag: 'Áo ba lỗ, dép tổ ong đỏ', color: RED,
  mech: 'Dép mòn theo số km đi được. Cảnh kết thay đôi dép mới.',
  low(cx) {
    const f = fig(cx, 'slump', { noArms: true });
    const ph = [cx + 70, G - 110];
    let s = ground(cx) + ghost(cx - 135, G, RED, 0.9) + whisper(cx - 135, G - 195, 'lướt thêm tí…', RED);
    s += f.svg + tank(cx, f.neck);
    s += line(f.neck[0], f.neck[1] + 10, cx - 16, G - 80) + line(f.neck[0], f.neck[1] + 10, ph[0] - 6, ph[1] + 10);
    s += glow(ph[0] + 6, ph[1] - 10, 60, RED, 0.5) + `<rect x="${ph[0] - 4}" y="${ph[1] - 40}" width="26" height="44" rx="5" fill="${RED}"/>`;
    s += f.legs.map(([, b]) => sandal(b[0], b[1], '#7a2e33', true)).join('');
    return s;
  },
  high(cx) {
    const f = fig(cx, 'walk');
    return glow(cx, G - 170, 190, RED) + ground(cx) + f.svg + tank(cx, f.neck) +
      f.arms.map(([a, b]) => line(a[0], a[1], b[0], b[1])).join('') +
      f.legs.map(([, b]) => sandal(b[0], b[1], RED, false)).join('') +
      `<text x="${cx + 120}" y="${G - 260}" fill="${RED}" font-family="Inter" font-weight="800" font-size="34" text-anchor="middle">5.2 KM</text>`;
  },
};

// ---------------- VN4 Trâu nhỏ ----------------
function buffalo(cx, hornS, headDown) {
  const by = G - 85, hx = cx + 98, hy = headDown ? G - 70 : G - 130;
  let s = '';
  [[-55, -10], [-30, 5], [35, -5], [60, 8]].forEach(([dx, sw]) => s += line(cx + dx, by + 35, cx + dx + sw, G));
  s += `<path d="M${cx - 92},${by - 10} q-30,10 -26,46" fill="none" ${st()}/>`;
  s += `<ellipse cx="${cx}" cy="${by}" rx="95" ry="52" fill="${BG}" ${st()}/>`;
  s += line(cx + 70, by - 20, hx - 20, hy + 10);
  const h = hornS;
  s += `<path d="M${hx - 18},${hy - 26} q${-30 * h},${-6 * h} ${-34 * h},${-38 * h} q${18 * h},${12 * h} ${40 * h},${22 * h}Z" fill="${RED}"/>`;
  s += `<path d="M${hx + 18},${hy - 26} q${30 * h},${-6 * h} ${34 * h},${-38 * h} q${-18 * h},${12 * h} ${-40 * h},${22 * h}Z" fill="${RED}"/>`;
  s += `<ellipse cx="${hx}" cy="${hy}" rx="38" ry="34" fill="${BG}" ${st()}/>`;
  s += `<ellipse cx="${hx + 4}" cy="${hy + 18}" rx="20" ry="11" fill="${BG}" ${st(W, 4)}/>`;
  s += eyes(hx, hy - 8, headDown ? 'tired' : 'fierce');
  return s;
}
const VN4 = {
  code: 'VN4', slug: 'trau-nho', name: 'Trâu nhỏ', tag: 'Sừng đỏ', color: RED,
  mech: 'Sừng lớn dần theo số ngày kiên trì. Bùn đỏ là thứ níu chân.',
  low(cx) {
    return ground(cx) + buffalo(cx - 20, 0.5, true) +
      `<path d="M${cx - 160},${G + 4} q40,-60 90,-40 q50,-30 100,-6 q50,-20 90,20 q10,20 -20,26 L${cx - 160},${G + 26}Z" fill="${RED}" fill-opacity=".85"/>` +
      whisper(cx, 290, 'nằm đây cho sướng…', RED);
  },
  high(cx) {
    return `<circle cx="${cx + 150}" cy="250" r="44" fill="${RED}" opacity=".9"/>` + glow(cx, G - 120, 200, RED) +
      `<path d="M${cx - 220},${G} Q${cx},${G - 40} ${cx + 220},${G}" fill="none" ${st('#2a2a2a', 3)}/>` +
      `<g transform="translate(0,-14)">${buffalo(cx - 20, 1.25, false)}</g>`;
  },
};

// ---------------- VN5 Nữ sinh áo dài, ruy băng đỏ ----------------
function aodai(x, f, ribbonLong, headDown) {
  const [hx, hy] = f.head, n = f.neck;
  let s = `<path d="M${hx - 30},${hy - 16} Q${hx - 52},${hy + 60} ${hx - 34},${hy + 110}" fill="none" ${st(W, 9)}/>`;
  s += `<path d="M${n[0] - 22},${n[1] + 8} L${n[0] + 22},${n[1] + 8} L${x + 30},${G - 40} L${x + 4},${G - 46} L${x},${G - 70} L${x - 4},${G - 46} L${x - 30},${G - 40}Z" fill="${BG}" ${st()}/>`;
  const bx = hx - 34, by = hy - 10;
  s += `<path d="M${bx},${by} l-22,-14 l0,26Z M${bx},${by} l20,-16 l2,26Z" fill="${RED}"/>`;
  s += ribbonLong
    ? `<path d="M${bx},${by + 4} q-60,10 -90,-20 q-20,-20 -60,-6" fill="none" ${st(RED, 6)}/><path d="M${bx},${by + 4} q-50,30 -100,16" fill="none" ${st(RED, 6)}/>`
    : `<path d="M${bx},${by + 4} q-6,30 -2,56 M${bx},${by + 4} q8,28 6,50" fill="none" ${st('#7a2e33', 6)}/>`;
  return s;
}
const VN5 = {
  code: 'VN5', slug: 'nu-sinh-ao-dai', name: 'Nữ sinh', tag: 'Áo dài trắng, ruy băng đỏ', color: RED,
  mech: 'Ruy băng rủ xuống khi tự ti, bay mạnh khi lấy lại động lực.',
  low(cx) {
    const f = fig(cx + 10, 'slump', { noBody: true });
    let s = ground(cx) + aodai(cx + 10, f, false, true) + f.svg;
    s += `<rect x="${cx - 190}" y="300" width="120" height="150" fill="none" ${st(GREY, 3)}/>`;
    s += line(cx - 175, 320, cx - 85, 430, RED, 6) + line(cx - 85, 320, cx - 175, 430, RED, 6);
    s += `<g transform="rotate(-35 ${cx - 70} 290)"><rect x="${cx - 80}" y="200" width="20" height="120" rx="4" fill="${RED}"/><path d="M${cx - 80},320 l10,22 l10,-22Z" fill="${RED}"/></g>`;
    return s + whisper(cx - 130, 490, 'mày không đủ giỏi', RED);
  },
  high(cx) {
    const f = fig(cx, 'up', { noBody: true });
    return glow(cx, G - 190, 190, RED) + ground(cx) + aodai(cx, f, true, false) + f.svg +
      `<rect x="${cx - 74}" y="${G - 262}" width="40" height="30" fill="${W}" transform="rotate(-20 ${cx - 54} ${G - 247})"/>`;
  },
};

// ---------------- INT1 Ember – ngọn lửa ----------------
function bean(cx, mood) {
  const top = G - 200;
  let s = line(cx - 18, G - 20, cx - 22, G) + line(cx + 18, G - 20, cx + 22, G);
  s += mood === 'tired' ? line(cx - 44, G - 110, cx - 64, G - 50) + line(cx + 44, G - 110, cx + 64, G - 50)
    : line(cx - 44, G - 120, cx - 90, G - 200) + line(cx + 44, G - 120, cx + 90, G - 200);
  s += `<rect x="${cx - 46}" y="${top}" width="92" height="182" rx="46" fill="${BG}" ${st()}/>`;
  s += eyes(cx, top + 52, mood);
  return { s, top };
}
function flame(x, base, sc, col, inner) {
  const d = (k) => `M${x},${base - 100 * sc * k} C${x + 46 * sc * k},${base - 46 * sc * k} ${x + 34 * sc * k},${base} ${x},${base} C${x - 34 * sc * k},${base} ${x - 46 * sc * k},${base - 46 * sc * k} ${x},${base - 100 * sc * k}Z`;
  return `<path d="${d(1)}" fill="${col}"/>` + (inner ? `<path d="${d(0.55)}" fill="${inner}"/>` : '');
}
const INT1 = {
  code: 'INT1', slug: 'ember', name: 'Ember', tag: 'Ngọn lửa trên đầu', color: ORANGE,
  mech: 'Ngọn lửa là thanh tiến trình: tàn dần khi buông thả, bùng lên khi kỷ luật.',
  low(cx) {
    const b = bean(cx, 'tired');
    let s = ground(cx) + b.s + flame(cx + 4, b.top - 2, 0.28, '#7a4a22');
    [[-70, 230, 34], [-30, 210, 42], [16, 226, 34], [-40, 250, 30]].forEach(([dx, y, r]) =>
      s += `<circle cx="${cx + dx - 60}" cy="${y}" r="${r}" fill="#3a3a3a" opacity=".9"/>`);
    s += `<path d="M${cx - 60},270 q30,40 58,62" fill="none" ${st('#3a3a3a', 10)}/>`;
    return s + whisper(cx - 120, 330, 'why even try?', '#9a9a9a');
  },
  high(cx) {
    const b = bean(cx, 'fierce');
    return glow(cx, b.top - 60, 230, ORANGE, 0.5) + ground(cx) + b.s + flame(cx, b.top + 4, 1.25, ORANGE, '#ffd166');
  },
};

// ---------------- INT2 Tick – đồng hồ cát ----------------
function hourglass(cx, topFill, mood, arms) {
  const t = G - 250, m = G - 135, b = G - 20;
  let s = line(cx - 20, b, cx - 26, G) + line(cx + 20, b, cx + 26, G);
  s += arms === 'up' ? line(cx - 30, m, cx - 95, m - 90) + line(cx + 30, m, cx + 95, m - 90)
    : line(cx - 30, m, cx - 70, m + 70) + line(cx + 30, m, cx + 70, m + 70);
  const ty = m - (m - t) * topFill;
  const tw = 52 * topFill;
  if (topFill > 0.02) s += `<path d="M${cx - tw},${ty} L${cx + tw},${ty} L${cx},${m - 4}Z" fill="${GOLD}"/>`;
  const pile = 1 - topFill;
  s += `<path d="M${cx - 52 * Math.min(1, pile + 0.2)},${b} Q${cx},${b - 100 * pile} ${cx + 52 * Math.min(1, pile + 0.2)},${b}Z" fill="${GOLD}"/>`;
  s += line(cx, m, cx, b - 90 * pile + 4, GOLD, 3);
  s += `<path d="M${cx - 58},${t} L${cx + 58},${t} L${cx + 4},${m} L${cx + 58},${b} L${cx - 58},${b} L${cx - 4},${m}Z" fill="none" ${st()}/>`;
  s += line(cx - 70, t, cx + 70, t, W, 8) + line(cx - 70, b, cx + 70, b, W, 8);
  s += `<g>${eyes(cx, t - 28, mood)}</g>`;
  return s;
}
const INT2 = {
  code: 'INT2', slug: 'tick', name: 'Tick', tag: 'Thân là đồng hồ cát', color: GOLD,
  mech: 'Cát chảy theo bộ đếm ngày. Phí thời gian thì cát rơi nhanh hơn.',
  low(cx) {
    let s = ground(cx) + hourglass(cx + 20, 0.12, 'tired', 'down');
    s += `<g transform="translate(${cx - 120},260) rotate(25)"><path d="M0,0 q-10,-60 10,-70 q8,30 10,30 l4,-60 q14,-4 14,8 l2,56 l6,-62 q14,-4 14,8 l0,64 l6,-50 q14,-2 12,10 l-4,70 q-10,50 -50,40 q-26,-10 -24,-44Z" fill="#1b1b1b" ${st('#7a7a7a', 3)}/></g>`;
    return s + whisper(cx - 165, 400, 'plenty of time…', '#9a9a9a');
  },
  high(cx) { return glow(cx, G - 140, 220, GOLD, 0.45) + ground(cx) + hourglass(cx, 0.75, 'fierce', 'up'); },
};

// ---------------- INT3 Fold – origami ----------------
const INT3 = {
  code: 'INT3', slug: 'fold', name: 'Fold', tag: 'Người giấy origami', color: RED,
  mech: 'Thất bại thì bị vò nát, đứng dậy thì vuốt phẳng. Cảnh kết gấp thành hạc.',
  low(cx) {
    const pts = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2, r = i % 2 ? 62 : 82 + (i % 3) * 6;
      pts.push(`${cx + Math.cos(a) * r},${G - 80 + Math.sin(a) * r * 0.9}`);
    }
    let s = ground(cx) + `<polygon points="${pts.join(' ')}" fill="${W}"/>`;
    s += `<path d="M${cx - 50},${G - 110} L${cx - 10},${G - 70} L${cx + 30},${G - 120} L${cx + 50},${G - 60}" fill="none" ${st('#bdb8ad', 3)}/>`;
    s += `<path d="M${cx - 30},${G - 40} L${cx + 10},${G - 90}" ${st(RED, 4)}/>`;
    s += eyes(cx + 6, G - 96, 'tired', BG);
    s += `<g transform="translate(${cx - 60},${G - 280}) scale(1.4)"><path d="M0,40 q-6,-40 10,-46 q6,22 8,22 l2,-42 q12,-2 12,6 l2,40 l4,-44 q12,-2 12,6 l0,46 l4,-36 q12,0 10,8 l-4,50 q-8,30 -40,26 q-22,-8 -20,-36Z" fill="${RED}" fill-opacity=".2" ${st(RED, 3)}/></g>`;
    return s;
  },
  high(cx) {
    const x = cx - 40;
    let s = glow(cx, G - 200, 210, RED, 0.3) + ground(cx);
    s += `<polygon points="${x},${G - 230} ${x + 34},${G - 196} ${x},${G - 162} ${x - 34},${G - 196}" fill="${W}"/>`;
    s += eyes(x, G - 198, 'fierce', BG);
    s += `<polygon points="${x - 36},${G - 150} ${x + 36},${G - 150} ${x + 22},${G - 60} ${x - 22},${G - 60}" fill="${W}"/>`;
    s += line(x - 2, G - 150, x + 10, G - 60, RED, 4);
    s += `<polygon points="${x - 36},${G - 150} ${x - 90},${G - 230} ${x - 70},${G - 236}" fill="#d9d3c3"/><polygon points="${x + 36},${G - 150} ${x + 90},${G - 230} ${x + 70},${G - 236}" fill="#d9d3c3"/>`;
    s += `<polygon points="${x - 22},${G - 60} ${x - 30},${G} ${x - 14},${G}" fill="#d9d3c3"/><polygon points="${x + 22},${G - 60} ${x + 30},${G} ${x + 14},${G}" fill="#d9d3c3"/>`;
    const k = [cx + 110, 260];
    s += `<g transform="translate(${k[0]},${k[1]})"><polygon points="-60,10 0,0 60,10 0,24" fill="${W}"/><polygon points="0,4 -30,-60 10,6" fill="#d9d3c3"/><polygon points="0,4 40,-56 14,8" fill="${W}"/><polygon points="-60,10 -86,-26 -48,10" fill="${W}"/><polygon points="60,10 92,-14 54,14" fill="${W}"/>${line(-30, 14, 30, 14, RED, 3)}</g>`;
    return s;
  },
};

// ---------------- INT4 Volt – pin trên ngực ----------------
function hoodie(cx, level, mood, arms) {
  const hx = cx, hy = G - 200;
  let s = line(cx - 20, G - 70, cx - 26, G) + line(cx + 20, G - 70, cx + 26, G);
  s += arms === 'up' ? line(cx - 40, G - 150, cx - 95, G - 230) + line(cx + 40, G - 150, cx + 95, G - 230)
    : line(cx - 40, G - 150, cx - 56, G - 80) + line(cx + 40, G - 150, cx + 70, G - 110);
  s += `<path d="M${cx - 48},${G - 160} L${cx + 48},${G - 160} L${cx + 40},${G - 66} L${cx - 40},${G - 66}Z" fill="#1c1c1e" ${st()}/>`;
  s += `<path d="M${hx - 52},${hy + 40} Q${hx - 58},${hy - 52} ${hx},${hy - 56} Q${hx + 58},${hy - 52} ${hx + 52},${hy + 40}Z" fill="#1c1c1e" ${st()}/>`;
  s += `<ellipse cx="${hx}" cy="${hy + 4}" rx="32" ry="34" fill="#050505"/>`;
  const ec = level > 0.5 ? GREEN : '#2f6b3b';
  s += mood === 'tired' ? line(hx - 16, hy + 6, hx - 4, hy + 8, ec, 4) + line(hx + 4, hy + 8, hx + 16, hy + 6, ec, 4)
    : `<circle cx="${hx - 11}" cy="${hy + 4}" r="5" fill="${ec}"/><circle cx="${hx + 11}" cy="${hy + 4}" r="5" fill="${ec}"/>`;
  const bx = cx - 28, by = G - 136, bw = 52, bh = 28;
  s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="5" fill="none" ${st(GREEN, 4)}/><rect x="${bx + bw}" y="${by + 8}" width="6" height="12" fill="${GREEN}"/>`;
  s += `<rect x="${bx + 5}" y="${by + 5}" width="${(bw - 10) * level}" height="${bh - 10}" rx="2" fill="${level < 0.2 ? RED : GREEN}"/>`;
  s += `<text x="${cx}" y="${by + 54}" fill="${level < 0.2 ? RED : GREEN}" font-family="Inter" font-weight="800" font-size="20" text-anchor="middle">${Math.round(level * 100)}%</text>`;
  return s;
}
const INT4 = {
  code: 'INT4', slug: 'volt', name: 'Volt', tag: 'Hoodie, pin xanh trên ngực', color: GREEN,
  mech: 'Pin tụt theo doomscroll, sạc lại bằng ngủ, tập luyện, tập trung.',
  low(cx) {
    const ph = [cx + 120, G - 150];
    let s = ground(cx) + hoodie(cx - 20, 0.08, 'tired', 'down');
    s += `<path d="M${cx - 4},${G - 122} C${cx + 40},${G - 60} ${cx + 80},${G - 200} ${ph[0]},${ph[1] + 20}" fill="none" ${st(RED, 4)}/>`;
    s += glow(ph[0] + 4, ph[1], 70, RED, 0.5) + `<rect x="${ph[0] - 14}" y="${ph[1] - 30}" width="36" height="62" rx="6" fill="${RED}"/>`;
    return s + whisper(cx + 110, 290, 'one more video…', RED);
  },
  high(cx) { return glow(cx, G - 150, 200, GREEN, 0.4) + ground(cx) + hoodie(cx, 1, 'fierce', 'up'); },
};

// ---------------- INT5 Lone – sói con ----------------
function wolf(cx, sc, howl) {
  let s = `<g transform="translate(${cx},${G}) scale(${sc})">`;
  [[-50, 0], [-28, 0], [34, 0], [56, 0]].forEach(([dx]) => s += line(dx, -40, dx, 0));
  s += `<path d="M-78,-70 q-50,-10 -56,-60" fill="none" ${st(W, 9)}/>`;
  s += `<ellipse cx="0" cy="-70" rx="82" ry="40" fill="${BG}" ${st()}/>`;
  const hx = 78, hy = howl ? -150 : -100;
  s += `<path d="M${hx - 20},${hy - 22} l-6,-36 l24,24Z M${hx + 12},${hy - 26} l10,-34 l10,30Z" fill="${BG}" ${st(W, 4)}/>`;
  s += howl ? `<path d="M${hx + 10},${hy - 6} l40,-46 l10,20Z" fill="${BG}" ${st(W, 4)}/>` : `<path d="M${hx + 24},${hy + 2} l40,10 l-38,14Z" fill="${BG}" ${st(W, 4)}/>`;
  s += line(62, -88, hx - 14, hy + 22);
  s += `<circle cx="${hx}" cy="${hy}" r="32" fill="${BG}" ${st()}/>`;
  s += howl ? line(hx - 8, hy - 4, hx + 4, hy - 8, W, 4) + line(hx + 10, hy - 8, hx + 20, hy - 14, W, 4) : eyes(hx + 4, hy - 4, 'tired');
  s += `<path d="M${hx - 34},${hy + 26} q34,18 60,0" fill="none" ${st(RED, 12)}/><path d="M${hx - 20},${hy + 34} l-24,40 l18,4Z" fill="${RED}"/>`;
  return s + '</g>';
}
const INT5 = {
  code: 'INT5', slug: 'lone', name: 'Lone', tag: 'Sói con, khăn quàng đỏ', color: RED,
  mech: 'Sói con lớn dần theo bộ đếm ngày. Cảnh kết tru dưới trăng.',
  low(cx) {
    let s = ground(cx);
    [[-150, 0.7], [150, 0.75]].forEach(([dx, k]) => s += `<g opacity=".7"><g transform="translate(${cx + dx},${G}) scale(${dx < 0 ? 1 : -1},1) scale(${k})"><ellipse cx="0" cy="-90" rx="70" ry="50" fill="#2a2a2a"/><circle cx="60" cy="-150" r="40" fill="#2a2a2a"/><path d="M40,-180 l-6,-40 l26,30Z M70,-184 l10,-38 l12,34Z" fill="#2a2a2a"/><circle cx="72" cy="-156" r="5" fill="${RED}"/>${[-40, -15, 25, 50].map(d => `<rect x="${d}" y="-60" width="10" height="60" fill="#2a2a2a"/>`).join('')}</g></g>`);
    s += wolf(cx - 20, 0.7, false);
    return s + whisper(cx, 270, 'ha ha… nhóc con', RED);
  },
  high(cx) {
    return `<circle cx="${cx + 130}" cy="230" r="54" fill="${W}" opacity=".92"/>` + glow(cx + 130, 230, 140, '#f4f1ea', 0.3) +
      `<path d="M${cx - 200},${G} L${cx - 120},${G - 60} L${cx + 40},${G - 50} L${cx + 120},${G}Z" fill="#1a1a1a" ${st('#2a2a2a', 3)}/>` +
      `<g transform="translate(0,-48)">${wolf(cx - 40, 1.1, true)}</g>`;
  },
};

// ---------------- Card ----------------
function card(c, idx) {
  const grad = [RED, ORANGE, GOLD, GREEN, '#f4f1ea'].map(col =>
    `<radialGradient id="g${col.slice(1)}"><stop offset="0" stop-color="${col}" stop-opacity=".9"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>${grad}</defs>
  <rect width="1280" height="720" fill="${BG}"/>
  <text x="60" y="78" fill="${c.color}" font-family="Inter" font-weight="800" font-size="26" letter-spacing="3">${c.code}</text>
  <text x="${60 + c.code.length * 22 + 20}" y="78" fill="${W}" font-family="Inter" font-weight="800" font-size="36">${c.name}</text>
  <text x="1220" y="78" fill="#8d8a84" font-family="Inter" font-size="24" text-anchor="end">${c.tag}</text>
  <text x="340" y="150" fill="#8d8a84" font-family="Inter" font-weight="700" font-size="18" letter-spacing="4" text-anchor="middle">BUÔNG THẢ · DAY 47</text>
  <text x="940" y="150" fill="${c.color}" font-family="Inter" font-weight="700" font-size="18" letter-spacing="4" text-anchor="middle">KỶ LUẬT · DAY 190</text>
  <line x1="640" y1="140" x2="640" y2="600" stroke="#222" stroke-width="2"/>
  <g>${c.low(340)}</g>
  <g>${c.high(940)}</g>
  <text x="640" y="660" fill="#cfcbc2" font-family="Inter" font-size="24" text-anchor="middle">${c.mech}</text>
</svg>`;
}

(async () => {
  const all = [VN1, VN2, VN3, VN4, VN5, INT1, INT2, INT3, INT4, INT5];
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  for (const [i, c] of all.entries()) {
    const svg = card(c, i);
    await page.setContent(`<html><body style="margin:0;background:${BG}">${svg}</body></html>`);
    await page.waitForTimeout(150);
    const f = path.join(OUT, `${c.code.toLowerCase()}-${c.slug}.png`);
    await page.screenshot({ path: f, clip: { x: 0, y: 0, width: 1280, height: 720 } });
    console.log(f);
  }
  await browser.close();
})();
