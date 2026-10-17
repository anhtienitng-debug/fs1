// Vẽ bảng thiết kế nhân vật (character sheet) cho Bảo (VN1) và Ember (INT1).
// Chạy: node ve-bang-thiet-ke.js <thư mục ra>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const W = '#f4f1ea', BG = '#0b0b0c', GREY = '#6b6b6b', MUTED = '#8d8a84';
const RED = '#e63946', RED_DULL = '#5a2a2d', GOLD = '#f2c14e';
const ORANGE = '#ff8a1f', CORE = '#ffd166', EMBER_DIM = '#7a4a22', SMOKE = '#3a3a3a';
const FONT = 'font-family="Inter"';

const st = (c = W, w = 5) => `stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
const line = (a, b, c = W, w = 5) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${st(c, w)}/>`;
const poly = (pts, c = W, w = 5) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" ${st(c, w)}/>`;
const text = (x, y, t, o = {}) =>
  `<text x="${x}" y="${y}" fill="${o.c || W}" ${FONT} font-size="${o.size || 20}" font-weight="${o.w || 400}" text-anchor="${o.a || 'middle'}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.it ? ' font-style="italic"' : ''}>${t}</text>`;
const glow = (x, y, r, c, o = 0.35) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#g${c.slice(1)})" opacity="${o}"/>`;
const defs = () => `<defs>${[RED, ORANGE, GOLD].map(c =>
  `<radialGradient id="g${c.slice(1)}"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}</defs>`;

// ---------- Khuôn mặt ----------
// facing: dx dịch mắt theo hướng nhìn; side=true chỉ còn một mắt
function face(x, y, mood, o = {}) {
  const c = o.c || W, k = o.k || 1, dx = (o.dx || 0) * k;
  const e = (ex, ey) => [x + dx + ex * k, y + ey * k];
  const eyesX = o.side ? [14] : [-11, 11];
  let s = '';
  const dot = (ex, r = 5) => { const p = e(ex, 2); return `<circle cx="${p[0]}" cy="${p[1]}" r="${r * k}" fill="${c}"/>`; };
  switch (mood) {
    case 'tired':
      eyesX.forEach(ex => s += line(e(ex - 6, 4), e(ex + 6, 5), c, 4 * k)); break;
    case 'sad':
      eyesX.forEach(ex => { s += dot(ex); s += line(e(ex - 8 * Math.sign(ex || 1), -10), e(ex + 8 * Math.sign(ex || 1), -16), c, 3.5 * k); });
      s += `<path d="M${e(-9, 22)} Q${e(0, 14)} ${e(9, 22)}" ${st(c, 3.5 * k)}/>`; break;
    case 'fierce':
      eyesX.forEach(ex => { s += dot(ex); s += line(e(ex - 8 * Math.sign(ex || 1) * (o.side ? -1 : 1), -14), e(ex + 6 * Math.sign(ex || 1) * (o.side ? -1 : 1), -8), c, 4 * k); });
      break;
    case 'shout':
      eyesX.forEach(ex => { s += dot(ex, 4); s += line(e(ex - 9 * Math.sign(ex), -16), e(ex + 6 * Math.sign(ex), -8), c, 4 * k); });
      s += `<ellipse cx="${e(0, 20)[0]}" cy="${e(0, 20)[1]}" rx="${8 * k}" ry="${7 * k}" fill="${c}"/>`; break;
    case 'happy':
      eyesX.forEach(ex => s += `<path d="M${e(ex - 6, 4)} Q${e(ex, -4)} ${e(ex + 6, 4)}" ${st(c, 4 * k)}/>`);
      s += `<path d="M${e(-9, 14)} Q${e(0, 24)} ${e(9, 14)}" ${st(c, 3.5 * k)}/>`; break;
    case 'scared':
      eyesX.forEach(ex => { const p = e(ex, 2); s += `<circle cx="${p[0]}" cy="${p[1]}" r="${8 * k}" ${st(c, 3 * k)}/><circle cx="${p[0]}" cy="${p[1]}" r="${2.5 * k}" fill="${c}"/>`; });
      s += line(e(-6, 20), e(6, 20), c, 3 * k); break;
    case 'none': break;
    default: eyesX.forEach(ex => s += dot(ex));
  }
  return s;
}

// ---------- Tư thế (toạ độ tương đối, gốc = giữa hai chân trên mặt đất) ----------
const POSES = {
  stand:   { head: [0, -195], neck: [0, -155], hip: [0, -70], sh: [0, -140], la: [[-22, -110], [-30, -78]], ra: [[22, -110], [30, -78]], ll: [[-12, -36], [-22, 0]], rl: [[12, -36], [22, 0]], mood: 'neutral' },
  slump:   { head: [28, -180], neck: [12, -148], hip: [0, -70], sh: [10, -136], la: [[-6, -106], [-16, -78]], ra: [[24, -106], [34, -76]], ll: [[-10, -36], [-22, 0]], rl: [[12, -36], [22, 0]], mood: 'tired' },
  run:     { head: [26, -190], neck: [14, -152], hip: [0, -74], sh: [12, -140], la: [[-22, -118], [-40, -140]], ra: [[40, -124], [56, -152]], ll: [[-22, -38], [-52, -28]], rl: [[36, -46], [46, -4]], mood: 'fierce', dx: 8 },
  pushup:  { head: [120, -62], neck: [82, -54], hip: [-40, -42], sh: [72, -52], la: [[70, -26], [70, 0]], ra: [[78, -26], [78, 0]], ll: [[-90, -22], [-140, -4]], rl: [[-90, -22], [-140, -4]], mood: 'fierce', dx: 10 },
  punch:   { head: [10, -195], neck: [4, -155], hip: [-6, -70], sh: [4, -140], la: [[-26, -118], [-6, -130]], ra: [[50, -140], [96, -142]], ll: [[-24, -36], [-40, 0]], rl: [[20, -36], [34, 0]], mood: 'shout', dx: 8 },
  phone:   { head: [26, -168], neck: [12, -134], hip: [0, -62], sh: [10, -122], la: [[30, -92], [44, -112]], ra: [[38, -90], [48, -108]], ll: [[38, -62], [40, 0]], rl: [[46, -60], [50, 0]], mood: 'tired', dx: 8, prop: 'phone' },
  victory: { head: [0, -195], neck: [0, -155], hip: [0, -70], sh: [0, -140], la: [[-34, -178], [-56, -216]], ra: [[34, -178], [56, -216]], ll: [[-12, -36], [-26, 0]], rl: [[12, -36], [26, 0]], mood: 'happy' },
};
const POSE_LABEL = { slump: 'Gục', run: 'Chạy', pushup: 'Hít đất', punch: 'Đấm', phone: 'Lướt điện thoại', victory: 'Chiến thắng' };

const T = (o, k, p) => [o[0] + p[0] * k, o[1] + p[1] * k];

// ---------- Bảo: mũ bảo hiểm ----------
// view: front | q34 | side | back ; state: dusty | shiny
function helmet(hx, hy, k, view = 'front', state = 'shiny', strap = true) {
  const col = state === 'dusty' ? RED_DULL : RED;
  const r = 42 * k, base = hy - 12 * k;
  let s = '';
  if (view === 'side') {
    s += `<path d="M${hx - r},${base} A${r},${r} 0 0 1 ${hx + r},${base} L${hx + r + 16 * k},${base + 4 * k} L${hx - r},${base + 6 * k}Z" fill="${col}"/>`;
  } else if (view === 'back') {
    s += `<path d="M${hx - r - 2 * k},${base + 10 * k} A${r + 2 * k},${r + 2 * k} 0 0 1 ${hx + r + 2 * k},${base + 10 * k}Z" fill="${col}"/>`;
    s += line([hx - 18 * k, base - 22 * k], [hx + 18 * k, base - 22 * k], '#b52a35', 4 * k);
  } else {
    const off = view === 'q34' ? 6 * k : 0;
    s += `<path d="M${hx - r + off},${base} A${r},${r} 0 0 1 ${hx + r + off},${base} L${hx + r + 4 * k + off},${base + 7 * k} L${hx - r - 4 * k + off},${base + 7 * k}Z" fill="${col}"/>`;
  }
  if (state === 'shiny' && view !== 'back')
    s += `<path d="M${hx - 24 * k},${base - 26 * k} A${30 * k},${30 * k} 0 0 1 ${hx + 4 * k},${base - 36 * k}" ${st('#ffd6d9', 4 * k)}/>`;
  if (state === 'dusty')
    for (const [dx, dy] of [[-20, -18], [4, -30], [18, -12], [-6, -8], [26, -24], [-28, -6]])
      s += `<circle cx="${hx + dx * k}" cy="${base + dy * k}" r="${3 * k}" fill="#9a9a9a"/>`;
  if (strap && view !== 'back') {
    s += line([hx - (view === 'side' ? 10 : 38) * k, base + 6 * k], [hx - 14 * k, hy + 34 * k], col, 3 * k);
    if (view !== 'side') s += line([hx + 38 * k, base + 6 * k], [hx + 14 * k, hy + 34 * k], col, 3 * k);
  }
  return s;
}

function bao(o, k, pose, opt = {}) {
  const p = POSES[pose];
  const P = q => T(o, k, q);
  const head = P(p.head), view = opt.view || 'front';
  let s = '';
  if (p.prop === 'phone') {
    s += `<rect x="${o[0] - 30 * k}" y="${o[1] - 62 * k}" width="${60 * k}" height="${62 * k}" fill="#1a1a1a" stroke="#2a2a2a" stroke-width="3"/>`;
  }
  s += line(P(p.hip), P(p.neck), W, 5 * k);
  s += poly([P(p.sh), P(p.la[0]), P(p.la[1])], W, 5 * k) + poly([P(p.sh), P(p.ra[0]), P(p.ra[1])], W, 5 * k);
  s += poly([P(p.hip), P(p.ll[0]), P(p.ll[1])], W, 5 * k) + poly([P(p.hip), P(p.rl[0]), P(p.rl[1])], W, 5 * k);
  if (p.prop === 'phone') {
    const h = P(p.ra[1]);
    s += glow(h[0] + 8 * k, h[1] - 10 * k, 50 * k, RED, 0.5) + `<rect x="${h[0] - 2 * k}" y="${h[1] - 34 * k}" width="${20 * k}" height="${34 * k}" rx="${4 * k}" fill="${RED}"/>`;
  }
  s += `<circle cx="${head[0]}" cy="${head[1]}" r="${36 * k}" fill="${BG}" ${st(W, 5 * k).replace('fill="none"', '')}/>`;
  if (view !== 'back') s += face(head[0], head[1], opt.mood || p.mood, { k, dx: view === 'q34' ? 9 : view === 'side' ? 6 : p.dx || 0, side: view === 'side' });
  if (opt.helmet !== false) s += helmet(head[0], head[1], k, view, opt.state || 'shiny', opt.strap !== false);
  return s;
}

// ---------- Ember: thân hạt đậu + ngọn lửa ----------
function flame(x, base, sc, level) {
  if (level === 0) {
    return `<path d="M${x},${base} q-14,-30 6,-50 q-18,-24 4,-52" ${st(SMOKE, 6 * sc)}/>` +
      `<circle cx="${x}" cy="${base - 2}" r="${5 * sc}" fill="${EMBER_DIM}"/>`;
  }
  const L = [0, 0.3, 0.6, 1, 1.35][level] * sc;
  const col = level === 1 ? EMBER_DIM : ORANGE;
  const d = (q) => `M${x},${base - 100 * L * q} C${x + 46 * L * q},${base - 46 * L * q} ${x + 34 * L * q},${base} ${x},${base} C${x - 34 * L * q},${base} ${x - 46 * L * q},${base - 46 * L * q} ${x},${base - 100 * L * q}Z`;
  let s = level >= 3 ? glow(x, base - 50 * L, 140 * L, ORANGE, level === 4 ? 0.6 : 0.4) : '';
  s += `<path d="${d(1)}" fill="${col}"/>`;
  if (level >= 2) s += `<path d="${d(0.55)}" fill="${CORE}"/>`;
  if (level === 4) [[-40, -70], [38, -90], [-20, -130]].forEach(([dx, dy]) =>
    s += `<circle cx="${x + dx * sc}" cy="${base + dy * sc}" r="${4 * sc}" fill="${CORE}"/>`);
  return s;
}

function ember(o, k, pose, opt = {}) {
  const p = POSES[pose];
  const P = q => T(o, k, q);
  const hip = P(p.hip), head = P(p.head);
  const ang = Math.atan2(head[0] - hip[0], -(head[1] - hip[1])) * 180 / Math.PI;
  const view = opt.view || 'front';
  const len = 190 * k, wid = (view === 'side' ? 80 : 92) * k;
  let s = '';
  if (p.prop === 'phone')
    s += `<rect x="${o[0] - 30 * k}" y="${o[1] - 62 * k}" width="${60 * k}" height="${62 * k}" fill="#1a1a1a" stroke="#2a2a2a" stroke-width="3"/>`;
  // tay chân từ thân
  const rot = (pt) => { const a = ang * Math.PI / 180, dx = pt[0], dy = pt[1]; return [hip[0] + dx * Math.cos(a) - dy * Math.sin(a), hip[1] + dx * Math.sin(a) + dy * Math.cos(a)]; };
  const shL = rot([-40 * k, -95 * k]), shR = rot([40 * k, -95 * k]);
  const hpL = rot([-18 * k, 6 * k]), hpR = rot([18 * k, 6 * k]);
  s += poly([shL, P(p.la[0]), P(p.la[1])], W, 5 * k) + poly([shR, P(p.ra[0]), P(p.ra[1])], W, 5 * k);
  s += poly([hpL, P(p.ll[1])], W, 5 * k) + poly([hpR, P(p.rl[1])], W, 5 * k);
  s += `<g transform="rotate(${ang} ${hip[0]} ${hip[1]})">`;
  s += `<rect x="${hip[0] - wid / 2}" y="${hip[1] - len + 12 * k}" width="${wid}" height="${len}" rx="${wid / 2}" fill="${BG}" stroke="${W}" stroke-width="${5 * k}"/>`;
  if (view !== 'back') s += face(hip[0], hip[1] - len + 64 * k, opt.mood || p.mood, { k, dx: view === 'q34' ? 10 : view === 'side' ? 8 : (p.dx || 0), side: view === 'side' });
  s += `</g>`;
  if (p.prop === 'phone') {
    const h = P(p.ra[1]);
    s += glow(h[0] + 8 * k, h[1] - 10 * k, 50 * k, ORANGE, 0.4) + `<rect x="${h[0] - 2 * k}" y="${h[1] - 34 * k}" width="${20 * k}" height="${34 * k}" rx="${4 * k}" fill="#d9d3c3"/>`;
  }
  const top = rot([0, -len + 14 * k]);
  s += flame(top[0], top[1], k, opt.flame ?? (p.mood === 'tired' ? 1 : 3));
  return s;
}

// ---------- Con quỷ ----------
function ghost(x, y, c, k, mood = 'smirk') {
  const d = `M${-45},0 Q${-58},-150 0,-172 Q${58},-150 45,0 Q30,-16 15,0 Q0,-16 -15,0 Q-30,-16 -45,0Z`;
  let eyes = mood === 'broken' ? '' : `<path d="M-22,-118 l14,6 M22,-118 l-14,6" ${st(c, 5)}/>`;
  let mouth = mood === 'smirk' ? `<path d="M-14,-88 q14,-8 28,0" ${st(c, 4)}/>` : mood === 'grin' ? `<path d="M-20,-92 q20,18 40,0" ${st(c, 4)}/>` : '';
  if (mood === 'broken') {
    return `<g transform="translate(${x},${y}) scale(${k})">${[[-30, -40, 20], [10, -90, -15], [-10, -140, 35], [30, -30, -30], [-40, -110, 10]].map(([dx, dy, r]) =>
      `<polygon points="0,0 22,6 8,24" transform="translate(${dx},${dy}) rotate(${r})" fill="${c}" fill-opacity=".5" stroke="${c}" stroke-width="3"/>`).join('')}</g>`;
  }
  return `<g transform="translate(${x},${y}) scale(${k})"><path d="${d}" fill="${c}" fill-opacity=".14" ${st(c, 4).replace('fill="none"', '')}/>${eyes}${mouth}</g>`;
}
function smoke(x, y, k, mood = 'smirk') {
  if (mood === 'broken')
    return [[-40, -30], [30, -60], [-10, -100], [40, -120]].map(([dx, dy]) => `<circle cx="${x + dx * k}" cy="${y + dy * k}" r="${10 * k}" fill="${SMOKE}" opacity=".5"/>`).join('');
  let s = '';
  [[-40, -70, 40], [0, -100, 50], [40, -72, 40], [-10, -50, 38], [26, -40, 30]].forEach(([dx, dy, r]) =>
    s += `<circle cx="${x + dx * k}" cy="${y + dy * k}" r="${r * k}" fill="${SMOKE}"/>`);
  s += `<path d="M${x - 22 * k},${y - 96 * k} l14,6 M${x + 22 * k},${y - 96 * k} l-14,6" ${st('#9a9a9a', 5 * k)}/>`;
  if (mood !== 'none') s += `<path d="M${x - 14 * k},${y - 66 * k} q14,-8 28,0" ${st('#9a9a9a', 4 * k)}/>`;
  return s;
}

// ---------- Khung bảng ----------
function sheet(title, sub, accent, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${defs()}
  <rect width="1920" height="1080" fill="${BG}"/>
  ${text(60, 70, title, { a: 'start', size: 38, w: 800 })}
  ${text(60, 106, sub, { a: 'start', size: 20, c: MUTED })}
  <rect x="1760" y="44" width="100" height="10" fill="${accent}"/>
  ${body}</svg>`;
}
const section = (x, y, w, h, label, accent) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#111113" stroke="#1f1f22" stroke-width="2"/>` +
  text(x + 24, y + 38, label, { a: 'start', size: 16, w: 700, c: accent, ls: 3 });
const ground = (x1, x2, y) => line([x1, y], [x2, y], '#2a2a2a', 3);

// ---------- Trang 1: tạo hình ----------
function page1(name, draw, accent, sub) {
  let b = '';
  // Xoay góc
  b += section(40, 140, 900, 490, 'XOAY GÓC', accent);
  const views = [['front', 'Chính diện'], ['q34', '3/4'], ['side', 'Nghiêng'], ['back', 'Sau lưng']];
  b += ground(80, 900, 560);
  views.forEach(([v, lb], i) => {
    const x = 160 + i * 215;
    b += draw([x, 560], 1, 'stand', { view: v, mood: 'neutral' });
    b += text(x, 600, lb, { size: 18, c: MUTED });
  });
  // Biểu cảm
  b += section(980, 140, 900, 490, 'BIỂU CẢM', accent);
  const moods = [['neutral', 'Bình thường'], ['tired', 'Mệt mỏi'], ['sad', 'Buồn'], ['scared', 'Sợ'], ['fierce', 'Quyết tâm'], ['shout', 'Gào lên'], ['happy', 'Vui'], ['tired', draw.lastLabel]];
  moods.forEach(([m, lb], i) => {
    const x = 1080 + (i % 4) * 210, y = (draw.rowY || [290, 500])[Math.floor(i / 4)];
    b += draw.head(x, y, m, i === 7);
    b += text(x, y + (draw.labelDy || 72), lb, { size: 17, c: MUTED });
  });
  // Tư thế
  b += section(40, 650, 1840, 390, 'TƯ THẾ CHÍNH', accent);
  b += ground(80, 1840, 975);
  Object.keys(POSE_LABEL).forEach((ps, i) => {
    const x = 210 + i * 290 + (ps === 'pushup' ? 30 : 0);
    b += draw([x, 975], 1, ps, {});
    b += text(x, 1015, POSE_LABEL[ps], { size: 18, c: MUTED });
  });
  return sheet(name, sub, accent, b);
}

// ---------- Trang 2: hệ thống ----------
function page2(name, sub, accent, o) {
  let b = '';
  b += section(40, 140, 1840, 370, o.stateTitle, accent);
  o.states.forEach(([fn, lb, note], i) => {
    const x = 230 + i * 360;
    b += fn(x, 432);
    b += text(x, 466, lb, { size: 19, w: 700 });
    b += text(x, 490, note, { size: 15, c: MUTED });
  });
  b += section(40, 530, 1130, 510, o.demonTitle, accent);
  b += ground(80, 1130, 940);
  o.demons.forEach(([fn, lb], i) => {
    const x = 190 + i * 270;
    b += fn(x, 940);
    b += text(x, 982, lb, { size: 18, c: MUTED });
  });
  b += text(605, 1020, o.demonNote, { size: 16, c: MUTED, it: true });
  b += section(1200, 530, 680, 510, 'BẢNG MÀU & QUY TẮC', accent);
  o.palette.forEach(([c, n, hex], i) => {
    const y = 585 + i * 44;
    b += `<rect x="1230" y="${y}" width="40" height="32" rx="6" fill="${c}" stroke="#333" stroke-width="2"/>`;
    b += text(1286, y + 22, n, { a: 'start', size: 18 }) + text(1850, y + 22, hex, { a: 'end', size: 16, c: MUTED });
  });
  o.rules.forEach((r, i) => b += text(1230, 585 + o.palette.length * 44 + 26 + i * 29, '• ' + r, { a: 'start', size: 16, c: '#cfcbc2' }));
  return sheet(name, sub, accent, b);
}

// ---------- Ghép cho từng nhân vật ----------
const baoDraw = (o, k, pose, opt) => bao(o, k, pose, opt);
baoDraw.lastLabel = 'Bỏ mũ (buông)';
baoDraw.head = (x, y, m, noHelmet) => {
  let s = `<circle cx="${x}" cy="${y}" r="${36 * 1.4}" fill="${BG}" stroke="${W}" stroke-width="6"/>` + face(x, y, m, { k: 1.4 });
  if (!noHelmet) s += helmet(x, y, 1.4, 'front', m === 'tired' ? 'dusty' : 'shiny', false);
  return s;
};
const emberDraw = (o, k, pose, opt) => ember(o, k, pose, opt);
emberDraw.lastLabel = 'Mất lửa';
emberDraw.rowY = [262, 494];
emberDraw.labelDy = 104;
emberDraw.head = (x, y, m, out) => {
  const lv = out ? 0 : { neutral: 2, tired: 1, sad: 1, scared: 1, fierce: 3, shout: 4, happy: 3 }[m];
  return `<rect x="${x - 50}" y="${y - 52}" width="100" height="130" rx="50" fill="${BG}" stroke="${W}" stroke-width="6"/>` +
    face(x, y, m, { k: 1.4 }) + flame(x, y - 46, 0.55, lv);
};

const BAO = {
  file: 'vn1-bao',
  p1: () => page1('VN1 · Bảo', baoDraw, RED, 'Bảng thiết kế nhân vật · kênh Việt Nam · tỷ lệ chuẩn: đầu r=36, thân 85, chân 70'),
  p2: () => page2('VN1 · Bảo — hệ thống', 'Mũ bảo hiểm là thanh tiến trình · con quỷ "Để Mai"', RED, {
    stateTitle: 'MŨ BẢO HIỂM — 5 TRẠNG THÁI',
    states: [
      [(x, y) => line([x, y - 210], [x, y - 190], GREY, 4) + helmet(x, y - 140, 1.3, 'front', 'dusty', false), '1. Treo xó', 'bụi bám, đỏ sẫm'],
      [(x, y) => bao([x, y + 10], 0.75, 'slump', { helmet: false }) + helmet(x + 40, y - 70, 0.9, 'front', 'dusty', false), '2. Cầm lên', 'còn bụi, do dự'],
      [(x, y) => bao([x, y + 10], 0.75, 'stand', { state: 'shiny', strap: false, mood: 'neutral' }), '3. Đội, chưa cài', 'đỏ sáng'],
      [(x, y) => bao([x, y + 10], 0.75, 'stand', { state: 'shiny', mood: 'fierce' }) + text(x + 80, y - 120, 'tách!', { c: RED, size: 22, w: 800 }), '4. Cài quai', 'khoảnh khắc chốt'],
      [(x, y) => glow(x, y - 100, 120, RED, 0.5) + bao([x, y + 10], 0.75, 'victory', { state: 'shiny' }), '5. Toả sáng', 'cảnh kết, có hào quang'],
    ],
    demonTitle: 'CON QUỶ "ĐỂ MAI" — 4 KÍCH CỠ',
    demons: [
      [(x, y) => ghost(x, y, RED, 0.45, 'smirk'), 'Nhỏ — ngồi sau xe'],
      [(x, y) => ghost(x, y, RED, 1, 'smirk') + text(x, y - 200, 'thôi để mai…', { c: RED, it: true, size: 20 }), 'Thường — thì thầm'],
      [(x, y) => ghost(x, y, RED, 1.9, 'grin'), 'Khổng lồ — thử thách cuối'],
      [(x, y) => ghost(x, y, RED, 1, 'broken'), 'Vỡ — bị xuyên qua'],
    ],
    demonNote: 'Cùng màu đỏ với mũ: người xem hiểu là "cùng một năng lượng, hai hướng".',
    palette: [[BG, 'Nền', '#0B0B0C'], [W, 'Nét nhân vật', '#F4F1EA'], [RED, 'Đỏ nhấn (mũ, quỷ)', '#E63946'], [RED_DULL, 'Đỏ sẫm (bụi, buông thả)', '#5A2A2D'], [GOLD, 'Vàng bình minh (cảnh kết)', '#F2C14E'], [GREY, 'Xám phụ', '#6B6B6B']],
    rules: ['Chỉ một màu nhấn trên khung hình: đỏ.', 'Mũ luôn có vệt sáng khi kỷ luật, có bụi khi buông.', 'Không có miệng trừ lúc buồn, gào, vui.', 'Nét dày 5px ở khung 1080p, đầu luôn tròn.', 'Câu kết cố định: "Đội mũ vào. Lên đường."'],
  }),
};

const EMBER = {
  file: 'int1-ember',
  p1: () => page1('INT1 · Ember', emberDraw, ORANGE, 'Character sheet · international channel · capsule 92×190, flame on top'),
  p2: () => page2('INT1 · Ember — hệ thống', 'Ngọn lửa là thanh tiến trình · con quỷ "Smoke"', ORANGE, {
    stateTitle: 'NGỌN LỬA — 5 MỨC',
    states: [0, 1, 2, 3, 4].map(lv => [
      (x, y) => ember([x, y + 10], 0.75, lv <= 1 ? 'slump' : lv === 4 ? 'victory' : 'stand', { flame: lv, mood: ['tired', 'tired', 'neutral', 'fierce', 'happy'][lv] }),
      ['0. Tắt', '1. Tàn', '2. Âm ỉ', '3. Cháy', '4. Bùng'][lv],
      ['chỉ còn khói', 'nâu, không lõi', 'có lõi vàng', 'có hào quang', 'tia lửa, cảnh kết'][lv],
    ]),
    demonTitle: 'CON QUỶ "SMOKE" — 4 KÍCH CỠ',
    demons: [
      [(x, y) => smoke(x, y - 20, 0.5), 'Small — on the shoulder'],
      [(x, y) => smoke(x, y - 40, 1) + text(x, y - 210, 'why even try?', { c: '#9a9a9a', it: true, size: 20 }), 'Normal — whispering'],
      [(x, y) => smoke(x, y - 60, 1.9), 'Giant — final test'],
      [(x, y) => smoke(x, y - 40, 1, 'broken'), 'Burned away'],
    ],
    demonNote: 'Khói muốn dập lửa: xung đột đọc được ngay, không cần chữ.',
    palette: [[BG, 'Background', '#0B0B0C'], [W, 'Line', '#F4F1EA'], [ORANGE, 'Flame', '#FF8A1F'], [CORE, 'Flame core', '#FFD166'], [EMBER_DIM, 'Dying ember', '#7A4A22'], [SMOKE, 'Smoke demon', '#3A3A3A']],
    rules: ['Cam là màu duy nhất; khói là xám.', 'Kích thước lửa = mức kỷ luật, không bao giờ ngẫu nhiên.', 'Thân luôn là viên nang, không có cổ.', 'Không có miệng trừ lúc buồn, gào, vui.', 'Câu kết cố định: "Keep the fire. Day one."'],
  }),
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const c of [BAO, EMBER]) {
    for (const [n, fn] of [['tao-hinh', c.p1], ['he-thong', c.p2]]) {
      await page.setContent(`<html><body style="margin:0;background:${BG}">${fn()}</body></html>`);
      await page.waitForTimeout(150);
      const f = path.join(OUT, `${c.file}-${n}.png`);
      await page.screenshot({ path: f, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
      console.log(f);
    }
  }
  await browser.close();
})();
