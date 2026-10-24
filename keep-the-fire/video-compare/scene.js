// COMPARE — vẽ khung hình tại thời điểm t (giây). Chạy trong trình duyệt: window.frame(t) → chuỗi SVG. Bộ nhân vật lấy từ SCROLL.
(function () {
  const W = '#f4f1ea', BG = '#0d0a09', MUTED = '#8d8a84', GREY = '#55534f';
  const ORANGE = '#ff8a1f', CORE = '#ffd166', EMBER = '#7a4a22', SMOKE = '#3a3a3a', COLD = '#bcd7ff';
  const DUR = 167; // 161 giây phim gốc + 6 giây hồi tưởng chèn ở 73.2

  // ---------- tiện ích ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const ramp = (t, a, b) => ease(clamp((t - a) / (b - a)));
  const fade = (t, a, b, fi = 0.6, fo = 0.6) => clamp((t - a) / fi) * clamp((b - t) / fo);
  const P = (x, y) => [x, y];
  const mix = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
  const st = (c = W, w = 5, o = 1) => `stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${o}"`;
  const ln = (a, b, c = W, w = 5, o = 1) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${st(c, w, o)}/>`;
  const pl = (pts, c = W, w = 5, o = 1) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" ${st(c, w, o)}/>`;
  const txt = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" fill="${o.c || W}" fill-opacity="${o.op ?? 1}" font-family="Inter" font-size="${o.size || 36}" font-weight="${o.w || 500}" text-anchor="${o.a || 'middle'}"${o.it ? ' font-style="italic"' : ''}${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${s}</text>`;
  const glow = (x, y, r, o = 0.4, id = 'gO') => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id})" opacity="${o}"/>`;
  const rnd = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------- lửa, khói, sợi lửa ----------
  function flame(x, base, sc, t, o = 1) {
    if (sc <= 0.09) {
      const r = 4 + 2 * Math.sin(t * 6);
      return `<circle cx="${x}" cy="${base - 6}" r="${r}" fill="${EMBER}" opacity="${o}"/>` +
        `<path d="M${x},${base - 12} q-8,-14 3,-26 q-10,-12 2,-26" fill="none" ${st(SMOKE, 3, 0.8 * o)}/>`;
    }
    const fl = 1 + 0.06 * Math.sin(t * 13) + 0.04 * Math.sin(t * 7.3);
    const s = sc * fl, sway = 4 * sc * Math.sin(t * 5);
    const d = q => `M${x + sway * q},${base - 100 * s * q} C${x + 46 * s * q},${base - 46 * s * q} ${x + 34 * s * q},${base} ${x},${base} C${x - 34 * s * q},${base} ${x - 46 * s * q},${base - 46 * s * q} ${x + sway * q},${base - 100 * s * q}Z`;
    return `<g opacity="${o}"><path d="${d(1)}" fill="${ORANGE}"/><path d="${d(0.55)}" fill="${CORE}"/></g>`;
  }
  function smoke(x, y, k, t, o = 1) {
    if (k <= 0.01 || o <= 0.01) return '';
    let s = `<g opacity="${o}">`;
    [[-40, -70, 40], [0, -100, 50], [40, -72, 40], [-10, -50, 38], [26, -40, 30]].forEach(([dx, dy, r], i) => {
      const w = 1 + 0.06 * Math.sin(t * 2.2 + i * 1.7);
      s += `<circle cx="${x + dx * k}" cy="${y + dy * k + 3 * Math.sin(t * 1.5 + i)}" r="${r * k * w}" fill="${SMOKE}"/>`;
    });
    s += `<path d="M${x - 22 * k},${y - 96 * k} l${14 * k},${6 * k} M${x + 22 * k},${y - 96 * k} l${-14 * k},${6 * k}" fill="none" ${st('#9a9a9a', 5 * k)}/>`;
    s += `<path d="M${x - 14 * k},${y - 66 * k} q${14 * k},${-8 * k} ${28 * k},0" fill="none" ${st('#9a9a9a', 4 * k)}/>`;
    return s + '</g>';
  }
  const whisper = (x, y, s, o) => txt(x, y, s, { c: '#a19d96', it: true, size: 24, op: o, w: 400 });
  // sợi lửa từ ngực vào điện thoại
  function thread(a, b, t, amt) {
    if (amt <= 0.01) return '';
    const c = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 60];
    const d = `M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}`;
    let s = `<path d="${d}" fill="none" stroke="${ORANGE}" stroke-width="3" stroke-dasharray="3 13" stroke-dashoffset="${-t * 90}" stroke-linecap="round" opacity="${amt}"/>`;
    for (let i = 0; i < 4; i++) {
      const k = ((t * 0.9 + i / 4) % 1);
      const p = [(1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * c[0] + k * k * b[0], (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * c[1] + k * k * b[1]];
      s += `<circle cx="${p[0]}" cy="${p[1]}" r="${3 * (1 - k) + 1}" fill="${CORE}" opacity="${amt * (1 - k * 0.6)}"/>`;
    }
    return s;
  }
  // logo TikTok (nốt nhạc lệch xanh–hồng của hãng, không phải đỏ kẻ thù) để người xem nhận ra ngay
  function tkIcon(x, y, k = 1) {
    const note = 'M1,-12 L5,-12 Q6,-6 11,-5 L11,-1 Q7,-1 5,-3 L5,5 A6,6 0 1 1 -1,-1 L-1,3 A2.4,2.4 0 1 0 1,5Z';
    return `<g transform="translate(${x},${y}) scale(${k})"><path d="${note}" transform="translate(-1.2,-1.2)" fill="#25f4ee"/><path d="${note}" transform="translate(1.2,1.2)" fill="#fe2c55"/><path d="${note}" fill="#fff"/></g>`;
  }
  // nút dọc bên phải màn hình video ngắn: tim, bình luận, chia sẻ
  function tkRail(x, y, liked) {
    const heart = `<path d="M${x},${y + 8} C${x - 14},${y - 2} ${x - 10},${y - 14} ${x},${y - 6} C${x + 10},${y - 14} ${x + 14},${y - 2} ${x},${y + 8}Z" fill="${liked ? '#fe2c55' : '#eeeae4'}"/>`;
    const bubble = `<path d="M${x - 10},${y + 30} a10,8 0 1 1 6,7 l-6,3Z" fill="#eeeae4"/>`;
    const share = `<path d="M${x - 9},${y + 76} Q${x - 6},${y + 64} ${x + 3},${y + 63} L${x + 3},${y + 58} L${x + 11},${y + 66} L${x + 3},${y + 74} L${x + 3},${y + 69} Q${x - 4},${y + 69} ${x - 9},${y + 76}Z" fill="#eeeae4"/>`;
    const cnt = (yy, v) => txt(x, yy, v, { size: 8, w: 700, c: '#eeeae4' });
    return heart + cnt(y + 18, '1.2M') + bubble + cnt(y + 52, '8.4K') + share + cnt(y + 88, 'Share');
  }

  function phone(x, y, rot, lit, o = 1, w = 22, h = 38) {
    let s = `<g transform="translate(${x},${y}) rotate(${rot})" opacity="${o}">`;
    if (lit > 0) s += glow(0, 0, 70, 0.45 * lit, 'gC');
    s += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="5" fill="#1b1e25" ${st(lit > 0 ? '#bcd7ff' : '#55534f', 2, 0.5 + 0.5 * lit)}/>`;
    return s + '</g>';
  }

  // ---------- nhân vật kiểu "LỬA": đầu tròn, thân viên nang màu kem, tay chân mảnh, mặt nhìn nghiêng ----------
  const RED = '#e3302b', YEL = '#ffd23f', SKIN = '#e9d6bd', SKIN_LINE = '#9a846b', LEG = '#efe6d8', INK = '#050405';
  const unitv = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
  const addv = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const dirOf = J => (J.face ?? (J.look ?? 1)) >= 0 ? 1 : -1;
  // tay hai đoạn cố định (38 + 38): bàn tay xa quá thì kéo về, khuỷu tính lại, bẻ về phía khuỷu gợi ý
  const ARM = 38;
  function ikArm(s, h, hint) {
    let d = Math.hypot(h[0] - s[0], h[1] - s[1]) || 1;
    const u = [(h[0] - s[0]) / d, (h[1] - s[1]) / d];
    if (d > 2 * ARM - 1) { d = 2 * ARM - 1; h = [s[0] + u[0] * d, s[1] + u[1] * d]; }
    const a = d / 2, hh = Math.sqrt(Math.max(0, ARM * ARM - a * a)), b = [s[0] + u[0] * a, s[1] + u[1] * a], n = [-u[1], u[0]];
    const e1 = [b[0] + n[0] * hh, b[1] + n[1] * hh], e2 = [b[0] - n[0] * hh, b[1] - n[1] * hh];
    // tay giơ cao: theo khuỷu gợi ý; còn lại khuỷu luôn bẻ xuống dưới → chuyển động nhanh không bị lật khuỷu
    const e = h[1] < s[1] - 20 ? (Math.hypot(e1[0] - hint[0], e1[1] - hint[1]) <= Math.hypot(e2[0] - hint[0], e2[1] - hint[1]) ? e1 : e2) : (e1[1] >= e2[1] ? e1 : e2);
    return [e, h];
  }
  function fixArms(J) {
    const u = unitv(J.neck, J.hip), sh = addv(J.neck, u, 22);
    [J.le, J.lh] = ikArm(sh, J.lh, J.le);
    [J.re, J.rh] = ikArm(sh, J.rh, J.re);
    return J;
  }
  // thân + tay chân; fill/line = màu ruột/viền, e = độ dày viền
  // tay/chân: đường cong bậc hai đi đúng qua khớp giữa (khuỷu/gối) → mềm, không gãy khúc
  function limb([a, m, b], w, c) {
    const C = [2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2];
    return `<path d="M${a[0]},${a[1]} Q${C[0]},${C[1]} ${b[0]},${b[1]}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  function bodyShapes(J, fill, line, e, legFill) {
    fixArms(J);
    const u = unitv(J.neck, J.hip);
    const top = addv(J.neck, u, 12), bot = J.hip;
    const L = (p, q, w, c) => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    const PL = (pts, w, c) => limb(pts, w, c);
    const sh = addv(J.neck, u, 22);
    let s = '';
    // chân (sau thân)
    for (const [k, f] of [[J.lk, J.lf], [J.rk, J.rf]]) s += PL([bot, k, f], 12 + e, line) + PL([bot, k, f], 12, legFill);
    // tay phía sau
    s += PL([sh, J.re, J.rh], 12 + e, line) + PL([sh, J.re, J.rh], 12, fill);
    // thân viên nang
    s += L(top, bot, 46 + e, line) + L(top, bot, 46, fill);
    // đầu
    s += `<circle cx="${J.head[0]}" cy="${J.head[1]}" r="${31 + e / 2}" fill="${line}"/><circle cx="${J.head[0]}" cy="${J.head[1]}" r="31" fill="${fill}"/>`;
    // tay phía trước
    s += PL([sh, J.le, J.lh], 12 + e, line) + PL([sh, J.le, J.lh], 12, fill);
    return s;
  }
  // mặt nhìn nghiêng: mắt chấm, lông mày gạch, miệng cong
  function face(J, mood, c, blink) {
    const ang = Math.atan2(J.head[0] - J.neck[0], -(J.head[1] - J.neck[1])) * 180 / Math.PI;
    return `<g transform="rotate(${ang} ${J.head[0]} ${J.head[1]})">${faceUp(J, mood, c, blink)}</g>`;
  }
  function faceUp(J, mood, c, blink) {
    const d = dirOf(J), [x, y] = J.head, ex = x + 13 * d, ey = y - 2;
    const L = (p, q, w = 3.2) => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    let s = '';
    if (blink || mood === 'tired') s += L([ex - 5, ey + 1], [ex + 5, ey + 2]);
    else if (mood === 'happy') s += `<path d="M${ex - 5},${ey + 2} Q${ex},${ey - 4} ${ex + 5},${ey + 2}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
    else s += `<circle cx="${ex}" cy="${ey}" r="3.6" fill="${c}"/>`;
    if (mood === 'fierce' || mood === 'smirk') s += L([ex - 9 * d, ey - 12], [ex + 7 * d, ey - 7]);
    else if (mood === 'sad') s += L([ex - 8 * d, ey - 8], [ex + 7 * d, ey - 12]);
    else if (mood === 'tired') s += L([ex - 8 * d, ey - 8], [ex + 7 * d, ey - 8]);
    else s += L([ex - 7 * d, ey - 10], [ex + 6 * d, ey - 11]);
    const mx = x + 9 * d, my = y + 13;
    if (mood === 'happy' || mood === 'smirk') s += `<path d="M${mx - 5},${my} Q${mx},${my + 5} ${mx + 6 * d},${my - 1}" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`;
    else if (mood === 'sad' || mood === 'tired') s += `<path d="M${mx - 5},${my + 3} Q${mx},${my - 1} ${mx + 5},${my + 3}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`;
    return s;
  }
  // vị trí ngọn lửa lơ lửng trước ngực (như video mẫu)
  function flamePos(J) {
    const d = J.flameDir ?? dirOf(J), ch = mix(J.neck, J.hip, 0.35);
    if (Math.abs(J.hip[0] - J.neck[0]) > Math.abs(J.hip[1] - J.neck[1])) return [J.head[0] + 4, J.head[1] - 64]; // đang nằm: lửa trên đầu
    if (J.runner) return [J.head[0] - 46 * d, J.head[1] + 6]; // đang chạy: lửa sau lưng, cạnh đầu
    return [ch[0] + 50 * d, ch[1] - 34];
  }
  function fig(J, o = {}) {
    const op = o.op ?? 1;
    let s = `<g opacity="${op}">`;
    const fp = flamePos(J);
    if (o.flame !== undefined && o.flame > 0.05) s += glow(fp[0], fp[1] - 10, 90 + 220 * o.flame, 0.22 + 0.33 * o.flame);
    const fill = o.c || SKIN;
    s += bodyShapes(J, fill, SKIN_LINE, 3, o.c ? fill : LEG);
    s += face(J, o.mood || 'neutral', '#2b231c', o.blink);
    if (o.flame !== undefined) {
      s += flame(fp[0], fp[1] + 18 * Math.max(0.6, o.flame), o.flame * 0.5, o.t || 0);
      if (o.flame > 0.15) for (let i = 0; i < 3; i++) { const k = ((o.t || 0) * 0.7 + i / 3) % 1; s += `<circle cx="${fp[0] + 8 * Math.sin(i * 3 + k * 6)}" cy="${fp[1] - 40 * o.flame - 40 * k}" r="${1.6 * (1 - k)}" fill="${CORE}" opacity="${1 - k}"/>`; }
    }
    return s + '</g>';
  }
  // cái bóng: cùng dáng, đen tuyền, viền đỏ phát sáng, mắt gạch trắng
  let ENEMY = null; // vị trí đầu kẻ thù trên màn hình (cho lời thì thầm)
  function shadowFig(J, o = {}) {
    const op = o.op ?? 1, k = o.k || 1, ax = o.ax ?? J.hip[0], ay = o.ay ?? Math.max(J.lf[1], J.rf[1]);
    const jit = o.jitter ? `translate(${Math.sin(o.jitter * 97.1 + J.head[1]) * o.jitter},${Math.cos(o.jitter * 53.7) * o.jitter * 0.6})` : '';
    const d = dirOf(J), [x, y] = J.head, hang = Math.atan2(J.head[0] - J.neck[0], -(J.head[1] - J.neck[1])) * 180 / Math.PI;
    const eyes = `<g filter="url(#redGlow)" transform="rotate(${hang} ${x} ${y})"><line x1="${x + 6 * d}" y1="${y - 14}" x2="${x + 20 * d}" y2="${y - 5}" stroke="#ff5a4f" stroke-width="4" stroke-linecap="round"/><circle cx="${x + 13 * d}" cy="${y + 4}" r="4.2" fill="#ff5a4f"/></g>`;
    const hx = ax + (x - ax) * k, hy = ay + (y - ay) * k;
    if (op > 0.3) ENEMY = { x: 640 + (hx - CAM.x) * CAM.k, y: 360 + (hy - CAM.y) * CAM.k, r: 31 * k * CAM.k, d };
    return `<g opacity="${op}" transform="${jit} translate(${ax},${ay}) scale(${k}) translate(${-ax},${-ay})">` +
      `<g filter="url(#redGlow)">${bodyShapes(J, RED, RED, 5, RED)}</g>` + bodyShapes(J, INK, RED, 2.5, INK) + eyes + '</g>';
  }
  function whisperPose(x, g, dir = 1) {
    return {
      head: [x + 24 * dir, g - 190], neck: [x + 12 * dir, g - 156], hip: [x, g - 72],
      le: [x + 30 * dir, g - 122], lh: [x + 44 * dir, g - 168], re: [x - 6 * dir, g - 112], rh: [x - 4 * dir, g - 80],
      lk: [x - 6 * dir, g - 36], lf: [x - 16 * dir, g], rk: [x + 12 * dir, g - 36], rf: [x + 20 * dir, g], look: dir, face: dir,
    };
  }
  // chữ thì thầm: viền đỏ
  const redText = (x, y, s, op, size = 32) =>
    `<text x="${x}" y="${y}" fill="#ffc2c9" fill-opacity="${op}" stroke="${RED}" stroke-width="1" stroke-opacity="${op}" filter="url(#redGlow)" font-family="Inter" font-size="${size}" font-weight="600" text-anchor="middle">${s}</text>`;
  // các tư thế: trả về khớp
  function stand(x, g, o = {}) {
    const lean = o.lean || 0;
    return {
      head: [x + lean * 1.4, g - 195], neck: [x + lean, g - 158], hip: [x, g - 72],
      le: [x - 22, g - 112], lh: [x - 28, g - 78], re: [x + 22, g - 112], rh: [x + 28, g - 78],
      lk: [x - 12, g - 36], lf: [x - 22, g], rk: [x + 12, g - 36], rf: [x + 22, g], look: o.look || 0,
    };
  }
  function slump(x, g) {
    return {
      head: [x + 26, g - 180], neck: [x + 12, g - 150], hip: [x, g - 72],
      le: [x - 4, g - 112], lh: [x - 12, g - 80], re: [x + 30, g - 110], rh: [x + 40, g - 82],
      lk: [x - 10, g - 36], lf: [x - 22, g], rk: [x + 12, g - 36], rf: [x + 22, g], look: 6,
    };
  }
  function standPhone(x, g, hold = 1) {
    const J = slump(x, g);
    J.re = [x + 34, g - 108]; J.rh = [x + 46, g - 130]; J.le = [x + 10, g - 110]; J.lh = [x + 40, g - 126];
    return J;
  }
  function lieBed(x, y) {
    return {
      head: [x - 120, y - 30], neck: [x - 84, y - 24], hip: [x + 10, y - 18],
      le: [x - 60, y - 74], lh: [x - 92, y - 104], re: [x - 50, y - 70], rh: [x - 84, y - 102],
      lk: [x + 60, y - 30], lf: [x + 112, y - 16], rk: [x + 62, y - 24], rf: [x + 118, y - 12], look: 6,
    };
  }
  function sitChair(x, g, o = {}) {
    const hy = g - 92, lean = o.lean || 0;
    return {
      head: [x + 22 + lean, g - 210], neck: [x + 10 + lean * 0.7, g - 172], hip: [x, hy],
      le: [x + 34, g - 128], lh: o.hand || [x + 70, g - 128], re: [x + 40, g - 124], rh: o.hand2 || [x + 76, g - 124],
      lk: [x + 50, hy - 4], lf: [x + 52, g], rk: [x + 56, hy], rf: [x + 58, g], look: o.look ?? 8,
    };
  }
  function walk(x, g, ph, o = {}) {
    const a = Math.sin(ph), b = Math.cos(ph);
    const J = {
      head: [x + 8, g - 194 + Math.abs(b) * -4], neck: [x + 4, g - 156], hip: [x, g - 72 - Math.abs(b) * 3],
      le: [x - 18 * a, g - 112], lh: [x - 30 * a, g - 80], re: [x + 18 * a, g - 112], rh: [x + 30 * a, g - 80],
      lk: [x + 18 * a, g - 38], lf: [x + 30 * a, g - Math.max(0, -b) * 10], rk: [x - 18 * a, g - 38], rf: [x - 30 * a, g - Math.max(0, b) * 10], look: 6,
    };
    if (o.phone) { J.le = [x + 22, g - 112]; J.lh = [x + 44, g - 130]; J.re = [x + 24, g - 110]; J.rh = [x + 46, g - 128]; J.head = [x + 22, g - 184]; J.neck = [x + 10, g - 152]; }
    return J;
  }
  function run(x, g, ph) {
    const a = Math.sin(ph), c = Math.cos(ph), up = Math.abs(a) * 5;
    const step = (sg) => { // một chân: sg = +1/-1 lệch pha
      const p = sg * a, lift = Math.max(0, sg * c) * 14;
      const foot = [x + 22 * p, g - lift], knee = [x + 8 + 14 * p + (lift > 0 ? 8 : 0), g - 38 - up * 0.5 - lift * 0.4];
      return [knee, foot];
    };
    const [lk, lf] = step(1), [rk, rf] = step(-1);
    return {
      head: [x + 9, g - 196 - up], neck: [x + 6, g - 158 - up], hip: [x, g - 72 - up],
      // tay gần camera: gập khuỷu, nắm tay trước ngực, đánh ngược pha chân
      le: [x + 10 - 10 * a, g - 112 - up], lh: [x + 30 - 12 * a, g - 128 - up + 6 * a],
      re: [x + 6 + 10 * a, g - 112 - up], rh: [x + 24 + 12 * a, g - 126 - up - 6 * a],
      lk, lf, rk, rf, look: 10, face: 1, runner: true,
    };
  }
  function armsUp(x, g, k = 1) {
    const J = stand(x, g);
    J.le = mix(J.le, [x - 34, g - 178], k); J.lh = mix(J.lh, [x - 56, g - 216], k);
    J.re = mix(J.re, [x + 34, g - 178], k); J.rh = mix(J.rh, [x + 56, g - 216], k);
    return J;
  }
  function sitGround(x, g) { // ngồi bệt, nhìn nghiêng sang phải, hai chân duỗi ngang về phía trước
    return {
      head: [x + 10, g - 150], neck: [x + 4, g - 112], hip: [x, g - 22],
      le: [x + 18, g - 84], lh: [x + 46, g - 52], re: [x + 22, g - 82], rh: [x + 52, g - 50],
      lk: [x + 48, g - 30], lf: [x + 96, g - 8], rk: [x + 52, g - 26], rf: [x + 102, g - 6], look: 1, face: 1,
    };
  }
  const ground = (x1, x2, g, o = 1) => ln([x1, g], [x2, g], '#2e2924', 2.2, o);
  // ---------- đạo cụ kiểu vẽ tay ----------
  const WOOD = '#8a6a48', FRAME = '#a9998a';
  function bed(x, y) {
    return `<g filter="url(#wobble)">` + ln([x - 196, y + 34], [x - 196, y + 70], FRAME, 2.5) + ln([x + 190, y + 34], [x + 190, y + 70], FRAME, 2.5) +
      `<path d="M${x - 198},${y + 12} L${x - 198},${y - 80} L${x - 190},${y - 92} L${x - 182},${y - 80} L${x - 182},${y + 12}" fill="none" ${st(FRAME, 2.5)}/>` +
      `<rect x="${x - 190}" y="${y + 18}" width="380" height="14" rx="6" fill="#2a2833"/>` +
      `<rect x="${x - 190}" y="${y - 8}" width="380" height="30" rx="10" fill="#3b3948"/>` +
      `<ellipse cx="${x - 132}" cy="${y - 14}" rx="44" ry="13" fill="#e6dccd" ${st('#b9ab98', 1.5)}/></g>`;
  }
  function desk(x, g) {
    return `<g filter="url(#wobble)">` + ln([x - 124, g - 130], [x + 144, g - 130], WOOD, 6) + ln([x - 104, g - 128], [x - 104, g], WOOD, 3) + ln([x + 124, g - 128], [x + 124, g], WOOD, 3) + '</g>';
  }
  function chair(x, g) { return `<g filter="url(#wobble)">` + ln([x - 26, g - 90], [x + 26, g - 90], WOOD, 4) + ln([x - 22, g - 90], [x - 22, g], WOOD, 3) + ln([x + 22, g - 90], [x + 22, g], WOOD, 3) + ln([x - 26, g - 90], [x - 30, g - 190], WOOD, 3) + '</g>'; }
  function books(x, y, open = 0) {
    if (open) return `<path d="M${x - 40},${y} L${x},${y + 6} L${x + 40},${y} L${x + 40},${y - 30} L${x},${y - 24} L${x - 40},${y - 30}Z" fill="#f2e8d6" stroke="#b9ab98" stroke-width="1.5"/>` + ln([x, y + 6], [x, y - 24], '#b9ab98', 1.5);
    return `<g filter="url(#wobble)"><rect x="${x - 40}" y="${y - 14}" width="80" height="14" rx="2" fill="#6b4e3a"/><rect x="${x - 34}" y="${y - 28}" width="70" height="14" rx="2" fill="#4c5a6b"/><rect x="${x - 38}" y="${y - 42}" width="76" height="14" rx="2" fill="#7a6a4a"/></g>`;
  }
  function windowFrame(x, y) {
    return `<g filter="url(#wobble)"><rect x="${x}" y="${y}" width="150" height="110" fill="#0e1118" ${st('#6b6760', 2.5)}/>` + ln([x + 75, y], [x + 75, y + 110], '#6b6760', 2.5) + ln([x, y + 55], [x + 150, y + 55], '#6b6760', 2.5) + `<circle cx="${x + 112}" cy="${y + 22}" r="9" fill="#d9d4cc"/></g>`;
  }
  // ảnh trên tường: Spark cười giữa hai người bạn, ngọn lửa to. light 0..1 = được chiếu sáng bao nhiêu
  function memoryPhoto(x, y, w, h, light, t) {
    const k = h / 300;
    let inner = `<rect width="${w}" height="${h}" fill="#7a4a2a"/><rect width="${w}" height="${h * 0.62}" fill="#c47a3c"/><circle cx="${w * 0.78}" cy="${h * 0.5}" r="${h * 0.16}" fill="#ffd9a0"/>`;
    inner += `<rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="#3d4a2a"/>`;
    inner += `<g transform="translate(${w * 0.5},${h * 0.86}) scale(${k})">` + fig(stand(-78, 0, { look: 8 }), { c: '#cfc6b8', mood: 'happy' }) + fig(stand(78, 0, { look: -8 }), { c: '#b9b5ad', mood: 'happy' }) + fig(stand(0, 0, { look: 4 }), { flame: 1.0, t, mood: 'happy' }) + '</g>';
    return `<g filter="url(#wobble)"><rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" fill="#5a4030" stroke="#3a2a20" stroke-width="2"/></g>` +
      `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}<rect width="${w}" height="${h}" fill="#000" opacity="${0.85 * (1 - light)}"/></svg>`;
  }
  function slippers(x, g) { return `<ellipse cx="${x}" cy="${g - 4}" rx="11" ry="5" fill="#3b5bd6"/><ellipse cx="${x + 26}" cy="${g - 4}" rx="11" ry="5" fill="#3b5bd6"/>`; }
  // camera: phóng to nhân vật ×3; chữ giao diện (ui) giữ nguyên cỡ trên màn hình
  let CAM = { x: 640, y: 360, k: 1 };
  const STAND = (x, k = 1.6) => ({ x, y: 560 - 250 / k, k }); // nhân vật cao ~nửa khung, chân ở y≈610
  const ui = s => CAM.k === 1 ? s : `<g transform="translate(${CAM.x},${CAM.y}) scale(${1 / CAM.k}) translate(-640,-360)">${s}</g>`;
  function clock(x, y, s) { return ui(txt(x, y, s, { size: 22, c: '#6f6c66', w: 600, ls: 3 })); }
  function hud(day, screen, o = 1) {
    return ui(hudRaw(day, screen, o));
  }
  let HUD_FOCUS = false;
  const FIRE_BY_DAY = { 12: 55, 45: 38, 88: 24, 140: 13, 201: 3, f1: 22, f4: 36, f11: 52, f23: 66, f37: 81, f60: 93 };
  const MONO = "'JetBrains Mono','DejaVu Sans Mono',monospace";
  function hudRaw(day, screen, o = 1, fireOverride) {
    let s = '';
    if (day) {
      const focus = HUD_FOCUS, f = fireOverride ?? FIRE_BY_DAY[(focus ? 'f' : '') + day] ?? FIRE_BY_DAY[day] ?? 0, c = f > 8 ? ORANGE : '#7b7872';
      s += `<text x="48" y="70" fill="${c}" fill-opacity="${o}" font-family="${MONO}" font-size="16" font-weight="700" letter-spacing="3" filter="url(#softGlow)">FIRE <tspan font-size="24" letter-spacing="0">${f}%</tspan></text>`;
      if (focus) s += `<text x="1232" y="72" fill="${YEL}" fill-opacity="${o}" filter="url(#yelGlow)" font-family="${MONO}" font-size="18" font-weight="700" letter-spacing="2" text-anchor="end">FOCUS · DAY <tspan font-size="24">${day}</tspan></text>`;
      else s += `<text x="1232" y="72" fill="#8d8a84" fill-opacity="${o}" font-family="${MONO}" font-size="18" font-weight="700" letter-spacing="3" text-anchor="end">DAY <tspan font-size="24" fill="#cfcbc2">${day}</tspan></text>`;
    }
    if (screen) s += `<text x="1232" y="98" fill="#6f6c66" fill-opacity="${o}" font-family="${MONO}" font-size="12" letter-spacing="2" text-anchor="end">SCREEN TIME ${screen}</text>`;
    return s;
  }
  // nhấp lướt: trả về [đang-lướt 0..1, số lần đã lướt]
  function flicks(t, start, period) {
    if (t < start) return [0, 0];
    const n = Math.floor((t - start) / period), ph = ((t - start) % period) / period;
    return [ph < 0.3 ? Math.sin((ph / 0.3) * Math.PI) : 0, n + (ph < 0.3 ? ph / 0.3 : 1)];
  }


  // ---------- các cảnh ----------
  const S = [];
  const scene = (a, b, fn, fx = {}) => S.push({ a, b, fn, fi: 0.1, fo: fx.fo ?? 0.03, cam: fx.cam, nopush: fx.nopush });

  // ================= TOMORROW =================
  const GOLD = '#f2b544', PAPER = '#ddd2bd', INKP = '#2b2620', GWOOD = '#b07a45', GLINE = '#5c3b20';
  // ---------- đạo cụ ----------
  // đàn guitar: (cx,cy) = tâm thùng đàn, ang = góc cần đàn (độ, âm = chĩa lên), k = cỡ
  function guitar(cx, cy, ang, k = 1, o = {}) {
    let s = `<g transform="translate(${cx},${cy}) rotate(${ang}) scale(${k})">`;
    s += `<circle cx="0" cy="0" r="27" fill="${GWOOD}" stroke="${GLINE}" stroke-width="3"/><circle cx="30" cy="0" r="20" fill="${GWOOD}" stroke="${GLINE}" stroke-width="3"/>`;
    s += `<rect x="-6" y="-24" width="40" height="48" fill="${GWOOD}"/><circle cx="14" cy="0" r="7.5" fill="#2a1a0e"/>`;
    s += `<rect x="-20" y="-6" width="6" height="12" rx="2" fill="#3a2414"/>`;
    s += `<rect x="46" y="-4.5" width="76" height="9" fill="#4a3020" stroke="${GLINE}" stroke-width="2"/><rect x="120" y="-7" width="18" height="14" rx="3" fill="#3a2414"/>`;
    for (let i = 0; i < 6; i++) s += `<line x1="62" y1="-4.5" x2="62" y2="4.5" stroke="#8a7a60" stroke-width="1"/>`.replace(/62/g, 52 + i * 12);
    if (!o.broken) s += `<line x1="-18" y1="-1.5" x2="124" y2="-1.5" stroke="#e8e0cc" stroke-width="1"/><line x1="-18" y1="1.5" x2="124" y2="1.5" stroke="#e8e0cc" stroke-width="1"/>`;
    else s += `<line x1="-18" y1="1.5" x2="124" y2="1.5" stroke="#e8e0cc" stroke-width="1"/><path d="M124,-1.5 q-30,${-14 - o.broken * 10} -64,-26" fill="none" stroke="#e8e0cc" stroke-width="1"/>`;
    return s + '</g>';
  }
  const gpt = (cx, cy, ang, lx, k = 1) => [cx + Math.cos(ang * Math.PI / 180) * lx * k, cy + Math.sin(ang * Math.PI / 180) * lx * k];
  // tay trước vẽ lại đè lên đạo cụ; chấm bàn tay sau đè lên cần đàn
  function frontArm(J, fill = SKIN) {
    const u = unitv(J.neck, J.hip), sh = addv(J.neck, u, 22);
    return limb([sh, J.le, J.lh], 15, SKIN_LINE) + limb([sh, J.le, J.lh], 12, fill);
  }
  const handDot = (p, fill = SKIN) => `<circle cx="${p[0]}" cy="${p[1]}" r="7.5" fill="${fill}" stroke="${SKIN_LINE}" stroke-width="2"/>`;
  const bandage = p => `<rect x="${p[0] - 6}" y="${p[1] - 4}" width="12" height="7" rx="2" fill="#f4efe4" stroke="#b9ab98" stroke-width="1" transform="rotate(-20 ${p[0]} ${p[1]})"/>`;
  // Spark ngồi ôm đàn. x,g = chỗ ngồi; strum 0..1 = tay gảy lên/xuống; fret = vị trí bàn tay trên cần (0..1)
  function playing(x, g, o = {}) {
    const J = sitChair(x, g, { look: o.look ?? 8 });
    if (o.hy) { J.hip = [x, g - o.hy]; }
    const cx = x + 20, cy = g - 104 + (o.dy || 0), ang = -22;
    const fret = gpt(cx, cy, ang, 52 + 22 * (o.fret || 0)), hole = gpt(cx, cy, ang, 12);
    J.rh = [fret[0], fret[1] + 3]; J.re = [x + 52, g - 112];
    J.lh = [hole[0] + 2, hole[1] - 10 + 18 * (o.strum || 0)]; J.le = [x - 6, g - 112];
    if (o.lean) { J.head = [J.head[0] + o.lean, J.head[1] + Math.abs(o.lean) * 0.6]; }
    fixArms(J);
    let s = fig(J, { flame: o.flame, t: o.t, mood: o.mood, blink: o.blink }) + guitar(cx, cy, ang, 1, { broken: o.broken });
    s += handDot(J.rh) + (o.band ? bandage([J.rh[0] - 2, J.rh[1] - 6]) + bandage([J.rh[0] + 6, J.rh[1] + 2]) : '');
    s += frontArm(J);
    if (o.flame !== undefined) { const fp = flamePos(J); s += flame(fp[0], fp[1] + 18 * Math.max(0.6, o.flame), o.flame * 0.5, o.t || 0); }
    return { s, J };
  }
  // lịch tường: day = số ngày; note 0..1 = chữ "tomorrow" của kẻ thù hiện dần; ember = đốm lửa bị nhốt; tick = dấu ✓ vàng
  let CLIPN = 0;
  function calendar(x, y, day, o = {}) {
    const w = 92, h = 112, id = `cal${CLIPN++}`;
    let s = `<g filter="url(#wobble)"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PAPER}" stroke="#8a7d68" stroke-width="2"/><rect x="${x}" y="${y}" width="${w}" height="24" fill="#3c3a40"/>` +
      `<circle cx="${x + 26}" cy="${y}" r="3" fill="#777"/><circle cx="${x + 66}" cy="${y}" r="3" fill="#777"/></g>`;
    s += txt(x + w / 2, y + 18, o.month || 'NOV', { size: 14, c: '#e9e3d8', w: 800, ls: 3 }) + txt(x + w / 2, y + 66, String(day), { size: 38, c: INKP, w: 800 });
    if (o.note) {
      s += `<clipPath id="${id}"><rect x="${x + 4}" y="${y + 72}" width="${(w - 8) * o.note}" height="34"/></clipPath>`;
      s += `<g clip-path="url(#${id})"><text x="${x + w / 2}" y="${y + 96}" fill="#ff9aa6" stroke="${RED}" stroke-width=".8" filter="url(#redGlow)" font-family="Inter" font-size="15" font-style="italic" font-weight="700" text-anchor="middle">tomorrow</text></g>`;
    }
    if (o.ember) s += glow(x + w - 14, y + 40, 16, 0.5 * o.ember) + `<circle cx="${x + w - 14}" cy="${y + 40}" r="${2.5 + 2 * o.ember}" fill="${ORANGE}" opacity="${0.4 + 0.6 * o.ember}"/>`;
    if (o.tick) s += `<path d="M${x + 22},${y + 88} l12,12 l26,-24" fill="none" stroke="${YEL}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="${o.tick}" filter="url(#yelGlow)"/>`;
    return s;
  }
  function poster(x, y, date, o = {}) {
    let s = `<g filter="url(#wobble)" opacity="${o.op ?? 1}"><rect x="${x}" y="${y}" width="96" height="128" fill="#cbb48c" stroke="#7a6a50" stroke-width="2" transform="rotate(${o.rot ?? -2} ${x + 48} ${y + 64})"/></g>`;
    s += `<g transform="rotate(${o.rot ?? -2} ${x + 48} ${y + 64})" opacity="${o.op ?? 1}">` + txt(x + 48, y + 30, 'OPEN', { size: 20, c: INKP, w: 900 }) + txt(x + 48, y + 52, 'MIC', { size: 20, c: INKP, w: 900 }) +
      guitar(x + 40, y + 84, -30, 0.32) + txt(x + 48, y + 120, date, { size: 13, c: '#6b2f1c', w: 800, ls: 1 });
    if (o.circle) s += `<ellipse cx="${x + 48}" cy="${y + 116}" rx="34" ry="11" fill="none" stroke="#6b2f1c" stroke-width="2"/>`;
    return s + '</g>';
  }
  // đống tờ lịch đã xé, mỗi tờ nhốt một đốm lửa
  function pile(x, g, n, ember, t) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const px = x + (rnd(i) - 0.5) * 90, py = g - 8 - (i % 4) * 6 - rnd(i + 3) * 6, r = (rnd(i + 5) - 0.5) * 50;
      s += `<g transform="rotate(${r} ${px} ${py})"><rect x="${px - 15}" y="${py - 10}" width="30" height="20" rx="3" fill="${PAPER}" stroke="#8a7d68" stroke-width="1.5"/><path d="M${px - 9},${py + 3} q5,-4 9,0 t9,0" fill="none" stroke="${RED}" stroke-width="1.4" opacity=".8"/></g>`;
      if (ember > 0) s += `<circle cx="${px + 8}" cy="${py - 4}" r="${2 + ember * 1.5}" fill="${ORANGE}" opacity="${(0.35 + 0.4 * Math.sin(t * 3 + i)) * ember}"/>`;
    }
    return s;
  }
  const PILE_PTS = (x, g, n) => Array.from({ length: n }, (_, i) => [x + (rnd(i) - 0.5) * 90 + 8, g - 12 - (i % 4) * 6 - rnd(i + 3) * 6]);
  function lamp(x, g, on) {
    let s = `<rect x="${x - 34}" y="${g - 70}" width="68" height="70" fill="#1c1a1e" stroke="#4a4650" stroke-width="2"/>` + ln([x, g - 70], [x, g - 120], '#4a4650', 4) + `<path d="M${x - 22},${g - 120} L${x + 22},${g - 120} L${x + 12},${g - 146} L${x - 12},${g - 146}Z" fill="${on ? '#e8c890' : '#2a2a2e'}" stroke="#4a4650" stroke-width="2"/>`;
    if (on) s = glow(x, g - 120, 260, 0.35 * on) + s;
    return s;
  }
  function cap(J, c = GOLD) { // mũ lưỡi trai: vòm + lưỡi dài phẳng về phía mặt
    const d = dirOf(J), [x, y] = J.head;
    return `<path d="M${x - 30},${y - 8} Q${x},${y - 46} ${x + 30},${y - 8}Z" fill="${c}" stroke="#8a6a20" stroke-width="2"/><rect x="${d > 0 ? x + 18 : x - 58}" y="${y - 12}" width="40" height="7" rx="3" fill="${c}" stroke="#8a6a20" stroke-width="2"/>`;
  }
  const flip = (cx, s) => `<g transform="translate(${2 * cx},0) scale(-1,1)">${s}</g>`;
  function stool(x, g) { return `<g filter="url(#wobble)">` + ln([x - 26, g - 80], [x + 26, g - 80], WOOD, 6) + ln([x - 20, g - 80], [x - 28, g], WOOD, 4) + ln([x + 20, g - 80], [x + 28, g], WOOD, 4) + '</g>'; }
  function timer(x, y, sec) {
    const m = Math.floor(sec / 60), ss = String(Math.floor(sec % 60)).padStart(2, '0');
    return `<rect x="${x - 26}" y="${y - 14}" width="52" height="28" rx="8" fill="#e8e0cc" stroke="#8a7d68" stroke-width="2"/>` + `<text x="${x}" y="${y + 6}" fill="${INKP}" font-family="${MONO}" font-size="15" font-weight="700" text-anchor="middle">${m}:${ss}</text>`;
  }
  function rain(t, x0, x1, y0, y1, o = 0.35) {
    let s = '';
    for (let i = 0; i < 70; i++) { const x = x0 + rnd(i) * (x1 - x0) - ((t * 260) % 80) * 0.3, y = y0 + (((rnd(i + 9) * (y1 - y0)) + t * 900) % (y1 - y0)); s += ln([x, y], [x - 4, y + 18], '#8fa3c0', 1.4, o); }
    return s;
  }

  // ---------- HUD: trái FIRE %, phải DAYS LEFT n (xám) / TODAY · DAY n (vàng) ----------
  const room = (g = 560) => ground(-200, 1500, g, 0.6);
  const dark = (o) => o > 0 ? `<rect x="-400" y="-300" width="2200" height="1400" fill="#000" opacity="${o}"/>` : '';

  // ================= COMPARE =================
  const GRAPH = '#3a3632';
  const DECK = '#3a3444', GRIP = '#22202a', WHEEL = '#e8dcc0', CONC = '#4a4a52', CONC2 = '#3a3a42', OTHER = '#b9b5ad';
  // ván trượt: (x,y) = giữa mặt ván (chỗ đặt chân), ang = độ nghiêng
  function skateboard(x, y, ang = 0) {
    return `<g transform="rotate(${ang} ${x} ${y})"><rect x="${x - 40}" y="${y}" width="80" height="6" rx="3" fill="${DECK}" stroke="${GRIP}" stroke-width="1.5"/>` +
      `<path d="M${x - 40},${y + 3} q-6,-2 -8,-8 M${x + 40},${y + 3} q6,-2 8,-8" fill="none" stroke="${DECK}" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="${x - 26}" cy="${y + 12}" r="5" fill="${WHEEL}" stroke="#7a7060" stroke-width="1.5"/><circle cx="${x + 26}" cy="${y + 12}" r="5" fill="${WHEEL}" stroke="#7a7060" stroke-width="1.5"/></g>`;
  }
  // người đứng trên ván (hơi khuỵu), chân đặt đúng trên mặt ván
  function riderPose(x, g, o = {}) {
    const c = o.crouch ?? 8, J = stand(x, g, { look: o.look ?? 10 });
    J.hip = [x, g - 72 + c]; J.neck = [x + 4, g - 158 + c]; J.head = [x + 8, g - 195 + c];
    J.lf = [x - 24, g]; J.rf = [x + 24, g]; J.lk = [x - 16, g - 36 + c * 0.6]; J.rk = [x + 20, g - 36 + c * 0.6];
    if (o.arms) { J.le = [x - 30, g - 128 + c]; J.lh = [x - 58, g - 120 + c + (o.wob || 0)]; J.re = [x + 32, g - 128 + c]; J.rh = [x + 60, g - 124 + c - (o.wob || 0)]; }
    return J;
  }
  function rider(x, y, ang, o = {}) {
    const J = riderPose(x, y, o);
    return `<g transform="rotate(${ang} ${x} ${y})">` + skateboard(x, y) + fig(J, { flame: o.flame, t: o.t, mood: o.mood, c: o.c, blink: o.blink }) + (o.extra ? o.extra(J) : '') + '</g>';
  }
  // dốc nhảy (kicker): chân dốc x0, đỉnh x1 cao h
  const kicker = (x0, x1, h, g = 560) => `<ellipse cx="${(x0 + x1) / 2 + 10}" cy="${g + 4}" rx="${(x1 - x0) / 2 + 30}" ry="6" fill="#000" opacity=".3"/>` +
    `<path d="M${x0},${g} Q${(x0 + x1) / 2 + 10},${g - h * 0.25} ${x1},${g - h} L${x1 + 14},${g - h} L${x1 + 14},${g}Z" fill="url(#rampP)" stroke="${CONC2}" stroke-width="3"/>` + `<rect x="${x1}" y="${g - h}" width="14" height="${h}" fill="#34343c"/>` + ln([x1 - 4, g - h], [x1 + 14, g - h], '#c8c8d4', 4);
  // quỹ đạo người bay qua dốc lớn (x0 780 → đỉnh 860 cao 70 → đáp 1150)
  let KX = 780, FX0 = 580; // vị trí dốc lớn · điểm người trượt bắt đầu hiện
  function flyPath(u) {
    const x = FX0 + u * (KX + 600 - FX0); let y = 560, a = 0;
    if (x >= KX && x < KX + 80) { y = 560 - (x - KX) * 0.85; a = -38; }
    else if (x >= KX + 80 && x < KX + 370) { const q = (x - KX - 80) / 290; y = 492 - 170 * Math.sin(Math.PI * q) + 68 * q; a = lerp(-30, 12, q); }
    return [x, y, a];
  }
  function flyers(t, n = 3, o = {}) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const u = ((t * (o.speed || 0.22) + i / n + 0.15) % 1), [x, y, a] = flyPath(u);
      s += `<g opacity="${clamp((x - FX0) / 60) * clamp((KX + 600 - x) / 60)}">` + rider(x, y, a, { c: OTHER, flame: o.flame ?? 1.0, t: t + i, mood: 'happy', look: 10 }) + '</g>';
    }
    return s;
  }
  const FLY_FLAME = (t, i, n = 3, sp = 0.22) => { const [x, y, a] = flyPath((t * sp + i / n + 0.15) % 1); const J = riderPose(x, y); return [x + (flamePos(J)[0] - x), flamePos(J)[1]]; };
  // ---------- công viên trượt ván (nền chi tiết) ----------
  function park(t, o = {}) {
    const dawn = !!o.dawn;
    let s = `<defs><linearGradient id="skyP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dawn ? '#232848' : '#241630'}"/><stop offset=".55" stop-color="${dawn ? '#8a6a7a' : '#9a4a3a'}"/><stop offset=".85" stop-color="${dawn ? '#e0a880' : '#e8904a'}"/><stop offset="1" stop-color="${dawn ? '#f4cc98' : '#f4b468'}"/></linearGradient>` +
      `<linearGradient id="concP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3840"/><stop offset="1" stop-color="#232228"/></linearGradient>` +
      `<linearGradient id="rampP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a6a74"/><stop offset="1" stop-color="#44444c"/></linearGradient></defs>`;
    s += `<rect x="-600" y="-400" width="2600" height="980" fill="url(#skyP)"/>`;
    const sx = dawn ? 180 : 1040;
    s += glow(sx, 470, 380, 0.5) + `<circle cx="${sx}" cy="470" r="46" fill="${dawn ? '#ffe2b0' : '#ffd29a'}" opacity=".95"/>`;
    // mây trôi chậm
    for (let i = 0; i < 6; i++) { const cx = ((i * 330 + t * 6) % 2200) - 500, cy = 80 + 60 * rnd(i + 2); s += `<g opacity=".35" fill="${dawn ? '#f0c8b0' : '#f0a070'}"><ellipse cx="${cx}" cy="${cy}" rx="${90 + 40 * rnd(i)}" ry="16"/><ellipse cx="${cx + 50}" cy="${cy - 10}" rx="60" ry="14"/></g>`; }
    // phố xa: nhà cao, cửa sổ sáng đèn
    for (let i = 0; i < 16; i++) {
      const bx = -520 + i * 150 + 30 * rnd(i), bw = 90 + 50 * rnd(i + 4), bh = 110 + 170 * rnd(i + 11);
      s += `<rect x="${bx}" y="${470 - bh}" width="${bw}" height="${bh + 20}" fill="#2a1c2a" opacity=".85"/>`;
      for (let r = 0; r < Math.floor(bh / 26); r++) for (let c = 0; c < Math.floor(bw / 22); c++) if (rnd(i * 97 + r * 13 + c) > 0.62) s += `<rect x="${bx + 8 + c * 22}" y="${470 - bh + 12 + r * 26}" width="9" height="11" fill="#f2b468" opacity="${0.45 + 0.4 * rnd(r + c + i)}"/>`;
    }
    // hàng cây
    for (let i = 0; i < 14; i++) { const tx = -500 + i * 180 + 40 * rnd(i + 30), th = 60 + 30 * rnd(i + 31); s += `<rect x="${tx - 4}" y="${520 - th * 0.4}" width="8" height="${th * 0.4 + 30}" fill="#1e1a1c"/><ellipse cx="${tx}" cy="${520 - th * 0.55}" rx="${36 + 12 * rnd(i)}" ry="${th * 0.45}" fill="#24221e"/>`; }
    // hàng rào lưới
    s += `<g opacity=".55">` + ln([-600, 470], [2000, 470], '#5a5a62', 3);
    for (let x = -600; x < 2000; x += 120) s += ln([x, 470], [x, 552], '#5a5a62', 3);
    for (let x = -600; x < 2000; x += 14) s += ln([x, 472], [x + 40, 550], '#4a4a52', 0.8) + ln([x + 40, 472], [x, 550], '#4a4a52', 0.8);
    s += '</g>';
    // tường graffiti (không dùng đỏ/vàng)
    s += `<rect x="40" y="430" width="380" height="130" fill="#4a4650"/>` + ln([40, 430], [420, 430], '#6a6670', 4);
    s += `<path d="M70,520 q30,-60 70,-20 q40,40 80,-30 q30,-40 70,10" fill="none" stroke="#3fb8b0" stroke-width="14" stroke-linecap="round"/><path d="M90,540 q60,-30 120,0 t120,-10" fill="none" stroke="#8a6ad8" stroke-width="10" stroke-linecap="round"/>`;
    s += `<text x="230" y="505" fill="#e8f0ff" stroke="#3b6bd6" stroke-width="4" paint-order="stroke" font-family="Inter" font-size="46" font-weight="900" font-style="italic" text-anchor="middle" transform="rotate(-6 230 505)">SK8</text>`;
    // cột đèn
    for (const lx of [-260, 620, 1380]) s += ln([lx, 560], [lx, 380], '#2a2a30', 6) + ln([lx, 382], [lx + 34, 382], '#2a2a30', 5) + `<rect x="${lx + 26}" y="380" width="20" height="8" rx="3" fill="#ffe2b0"/>` + glow(lx + 36, 392, 70, dawn ? 0.15 : 0.35);
    // sàn bê tông: tấm, khe, vết nứt
    s += `<rect x="-600" y="560" width="2600" height="360" fill="url(#concP)"/>` + ln([-600, 560], [2000, 560], '#6a6a72', 3);
    for (let x = -600; x < 2000; x += 160) s += ln([x, 562], [x - 60, 760], '#1c1c22', 2);
    s += ln([-600, 640], [2000, 640], '#1c1c22', 1.5);
    for (let i = 0; i < 8; i++) { const cx = -300 + i * 260 + 60 * rnd(i + 50); s += `<path d="M${cx},${600 + 20 * rnd(i)} l14,6 l-6,10 l16,8" fill="none" stroke="#18181c" stroke-width="1.5"/>`; }
    // thanh trượt + ghế (nền sau)
    s += ln([1180, 532], [1360, 532], '#9a9aa6', 5) + ln([1196, 532], [1196, 560], '#6a6a74', 4) + ln([1344, 532], [1344, 560], '#6a6a74', 4);
    s += `<rect x="-120" y="530" width="120" height="10" rx="3" fill="#6a4a30"/>` + ln([-110, 540], [-110, 560], '#3a2a20', 4) + ln([-10, 540], [-10, 560], '#3a2a20', 4);
    if (o.big !== false) s += kicker(KX, KX + 80, 70);
    if (o.small) s += `<path d="M${o.small - 70},560 L${o.small - 70},520 L${o.small},520 Q${o.small + 30},525 ${o.small + 60},560Z" fill="url(#rampP)" stroke="${CONC2}" stroke-width="3"/>` + ln([o.small - 70, 520], [o.small + 2, 520], '#c8c8d4', 4) + `<rect x="${o.small - 70}" y="520" width="8" height="40" fill="#34343c"/>`;
    return s;
  }
  // thước dây: hộp + dây; enemy = đen vạch đỏ · mine = vàng (của Spark)
  function tape(a, b, kind = 'enemy', box = true) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    const col = kind === 'enemy' ? '#141216' : YEL, tick = kind === 'enemy' ? RED : '#6a4a10';
    let s = `<g transform="translate(${a[0]},${a[1]}) rotate(${ang})"><rect x="0" y="-4" width="${len}" height="8" fill="${col}" stroke="${kind === 'enemy' ? RED : '#8a6a20'}" stroke-width="1"${kind === 'enemy' ? ' filter="url(#redGlow)"' : ' filter="url(#yelGlow)"'}/>`;
    for (let d = 8; d < len - 2; d += 10) s += ln([d, -4], [d, d % 50 < 10 ? 2 : -1], tick, 1.2);
    s += '</g>';
    if (box) s += `<rect x="${a[0] - 12}" y="${a[1] - 12}" width="24" height="24" rx="6" fill="${kind === 'enemy' ? INK : '#f2c440'}" stroke="${kind === 'enemy' ? RED : '#8a6a20'}" stroke-width="2"/>`;
    return s;
  }
  // khung cửa có vạch chiều cao hồi nhỏ (cột trái) + vạch trượt ván (cột phải)
  const KIDS = [[5, 470], [6, 452], [7, 434], [8, 418], [9, 404], [10, 390], [11, 376], [12, 364]];
  const DAYS = [[1, 446], [5, 432], [12, 418], [20, 404], [30, 390], [45, 376]];
  function doorFrame(x, o = {}) {
    let s = `<rect x="${x}" y="200" width="110" height="360" fill="#0c0c10"/>`;
    s += `<rect x="${x - 14}" y="196" width="14" height="364" fill="#d8d0c0"/><rect x="${x + 110}" y="196" width="14" height="364" fill="#d8d0c0"/><rect x="${x - 14}" y="186" width="138" height="14" fill="#d8d0c0"/>`;
    if (o.kids) KIDS.forEach(([a, y]) => { s += ln([x - 14, y], [x, y], GRAPH, 2, o.kids) + `<text x="${x - 18}" y="${y + 4}" fill="${o.lit ? '#d8d0c0' : '#6a6460'}" fill-opacity="${o.kids}" font-family="Inter" font-size="11" font-weight="700" text-anchor="end">${a}</text>`; });
    (o.days || []).forEach(([d, y, q = 1]) => { s += ln([x + 96, y], [x + 110, y], YEL, 2.4, q) + `<text x="${x + 92}" y="${y + 4}" fill="${YEL}" fill-opacity="${q}" filter="url(#yelGlow)" font-family="${MONO}" font-size="10" font-weight="700" text-anchor="end">DAY ${d}</text>`; });
    return s;
  }
  function hallway(t, o = {}) {
    let s = `<rect x="-400" y="-300" width="2200" height="860" fill="${o.lit ? '#3a3028' : '#121014'}"/>` + room();
    if (o.lit) s += `<path d="M300,120 L380,120 L640,560 L200,560Z" fill="#ffd9a0" opacity=".08"/>` + glow(560, 300, 260, 0.25 * o.lit);
    return s;
  }
  function hudC(fire, m, o = 1) {
    if (o <= 0) return '';
    const c = fire > 8 ? ORANGE : '#7b7872';
    let s = `<text x="48" y="70" fill="${c}" fill-opacity="${o}" font-family="${MONO}" font-size="16" font-weight="700" letter-spacing="3" filter="url(#softGlow)">FIRE <tspan font-size="24" letter-spacing="0">${fire}%</tspan></text>`;
    if (m && m.yest !== undefined) {
      s += `<text x="1232" y="62" fill="${YEL}" fill-opacity="${o}" filter="url(#yelGlow)" font-family="${MONO}" font-size="14" font-weight="700" letter-spacing="2" text-anchor="end">YOU vs YESTERDAY <tspan font-size="20">+1</tspan></text>`;
      s += `<rect x="1072" y="74" width="${150 + 10 * Math.min(1, m.yest / 45)}" height="7" fill="${ORANGE}" opacity="${o}"/><rect x="1072" y="86" width="150" height="7" fill="#7b7872" opacity="${o}"/>`;
    } else if (m) {
      s += `<text x="1232" y="62" fill="#8d8a84" fill-opacity="${o}" font-family="${MONO}" font-size="14" font-weight="700" letter-spacing="2" text-anchor="end">YOU vs THEM <tspan font-size="20" fill="#cfcbc2">${m.pct}%</tspan></text>`;
      s += `<rect x="1072" y="74" width="${Math.max(2, 160 * (1 + m.pct / 100))}" height="7" fill="${ORANGE}" opacity="${o}"/><rect x="1072" y="86" width="160" height="7" fill="#8d8a84" opacity="${o}"/>`;
    }
    return ui(s);
  }
  const kidFig = (J, k, hat) => `<g transform="translate(${J.hip[0]},560) scale(${k}) translate(${-J.hip[0]},-560)">` + fig(J, { c: '#e6dccb', mood: 'happy' }) +
    (hat === 'beanie' ? `<path d="M${J.head[0] - 30},${J.head[1] - 6} Q${J.head[0]},${J.head[1] - 48} ${J.head[0] + 30},${J.head[1] - 6}Z" fill="#4a8a5a"/>` : `<path d="M${J.head[0] - 32},${J.head[1] - 2} Q${J.head[0]},${J.head[1] - 50} ${J.head[0] + 32},${J.head[1] - 2}Z" fill="#3b6bd6"/>`) + '</g>';
  const PCT = t => Math.round(t < 7.2 ? -88 : t < 42 ? lerp(-88, -95, ramp(t, 14, 41)) : lerp(-95, -99, ramp(t, 42, 58)));
  const FIREC = t => Math.round(t < 12 ? 70 : t < 14 ? 66 : t < 42 ? lerp(64, 30, ramp(t, 14, 41)) : t < 58 ? lerp(30, 10, ramp(t, 42, 52)) : 4);

  // ================= 1. Vết thương (0–14): công viên lúc hoàng hôn =================
  scene(0, 14, t => {
    let s = park(t) + flyers(t, 3);
    KX = 780; FX0 = 600;
    const x0 = 470, onBoard = t > 9.2;
    // bóng người bay đổ lên Spark → kẻ thù mọc từ đó
    const born = ramp(t, 5.0, 6.4);
    if (t > 4 && t < 6.2) s += `<ellipse cx="${lerp(660, 400, ramp(t, 4, 5.4))}" cy="562" rx="70" ry="8" fill="#000" opacity="${0.4 * (1 - born)}"/>`;
    let J, sp = '';
    if (!onBoard) {
      J = stand(x0, 560, { look: 10 }); J.re = [x0 + 18, 470]; J.rh = [x0 + 30, 500];
      sp = fig(J, { flame: 0.62, t, mood: t > 7 ? 'sad' : 'happy' }) + `<g transform="rotate(-80 ${x0 + 36} 500)">${skateboard(x0 + 36, 496)}</g>` + handDot(fixArms(J).rh);
    } else {
      const fall = ramp(t, 12.0, 12.4), x = x0 + 60 * ramp(t, 10, 12);
      if (fall < 1) sp = rider(x, 548, Math.sin(t * 9) * 5 * ramp(t, 10, 12), { flame: 0.6, t, mood: 'neutral', arms: true, wob: Math.sin(t * 9) * 10 });
      else { const bx = x + 40 + 200 * ramp(t, 12.4, 13.6); sp = skateboard(bx, 548) + fig(sitGround(x, 560), { flame: 0.55, t, mood: 'sad' }); }
      J = riderPose(x, 548);
    }
    if (born > 0) {
      const E = whisperPose(340, 560, 1), measuring = t > 6.4 && t < 9.2;
      if (measuring) { E.lh = [410, 420]; E.le = [380, 440]; }
      s += shadowFig(E, { k: 0.2 + 0.8 * born, op: born, ax: lerp(440, 340, born), ay: 560 });
    }
    s += sp;
    if (t > 6.6 && t < 9.2) {
      const fpS = flamePos(J), fpO = FLY_FLAME(t, 0), ext = ramp(t, 6.6, 7.4);
      s += tape([fpS[0] + 6, fpS[1] - 10], mix([fpS[0] + 6, fpS[1] - 10], fpO, ext));
    }
    return s + hudC(FIREC(t), t > 7.2 ? { pct: PCT(t) } : null, ramp(t, 0.6, 1.2));
  }, { cam: { x: 640, y: 400, k: 1.2 } });

  // ================= 2. Cái giá (14–42) =================
  scene(14, 17.5, t => { // DAY 2: đẩy ván, té ngồi
    let s = park(t, { big: false });
    const x = lerp(300, 560, ramp(t, 14.2, 15.8)), fall = t > 15.8;
    if (!fall) s += rider(x, 548, Math.sin(t * 11) * 7, { flame: 0.55, t, mood: 'sad', arms: true, wob: Math.sin(t * 11) * 14 });
    else s += skateboard(x + 60 + 180 * ramp(t, 15.8, 17), 548, 0) + fig(sitGround(x, 560), { flame: 0.5, t, mood: 'sad' });
    return s + hudC(FIREC(t), { pct: PCT(t) });
  }, { cam: STAND(560, 1.4) });
  scene(17.5, 21, t => { // DAY 4: bé Kip nhỏ hơn nhảy ollie qua Spark
    let s = park(t, { big: false });
    const kx = lerp(200, 1000, ramp(t, 17.7, 20.2)), hop = Math.max(0, Math.sin(Math.PI * clamp((kx - 500) / 260))) * 110;
    const J = sitGround(600, 560);
    s += `<g transform="translate(600,560) scale(${lerp(1, 0.9, ramp(t, 19, 20))}) translate(-600,-560)">` + fig(J, { flame: 0.48, t, mood: 'sad' }) + '</g>';
    const K = riderPose(kx, 548 - hop);
    s += `<g transform="translate(${kx},${548 - hop}) scale(.72) translate(${-kx},${-(548 - hop)})">` + skateboard(kx, 548 - hop, hop > 10 ? -10 : 0) + kidFig(K, 1, 'beanie').replace(/scale\(1\)/, 'scale(1)') + '</g>';
    return s + hudC(FIREC(t), { pct: PCT(t) });
  }, { cam: STAND(640, 1.35) });
  scene(21, 24.5, t => { // DAY 6: kẻ thù đo lại lửa
    let s = park(t, { big: false });
    const J = stand(560, 560, { look: 10 }); J.re = [578, 470]; J.rh = [590, 500];
    const K = riderPose(860, 548); K.look = -10; K.face = -1;
    s += shadowFig(Object.assign(whisperPose(440, 560, 1), { lh: [500, 400], le: [472, 430] }), { k: 1 });
    s += fig(J, { flame: 0.44, t, mood: 'sad' }) + `<g transform="rotate(-80 596 500)">${skateboard(596, 496)}</g>` + handDot(fixArms(J).rh);
    s += flip(860, `<g transform="translate(860,548) scale(.72) translate(-860,-548)">` + skateboard(860, 548) + kidFig(riderPose(860, 548), 1, 'beanie') + '</g>');
    const a = flamePos(J), ext = ramp(t, 21.4, 22.4);
    s += `<circle cx="790" cy="420" r="18" fill="${ORANGE}" opacity=".0"/>`;
    s += tape([a[0] + 8, a[1] - 14], mix([a[0] + 8, a[1] - 14], [830, 440], ext));
    return s + hudC(FIREC(t), { pct: PCT(t) });
  }, { cam: STAND(680, 1.4) });
  scene(24.5, 28, t => { // DAY 9: ngồi mép công viên ôm ván xem
    KX = 820; FX0 = 520;
    let s = park(t) + flyers(t, 2);
    const J = sitGround(240, 560); J.lh = [282, 486]; J.le = [262, 468]; fixArms(J);
    s += `<g transform="rotate(-70 276 500)">${skateboard(276, 496)}</g>` + fig(J, { flame: 0.38, t, mood: 'sad' }) + handDot(J.lh);
    return s + hudC(FIREC(t), { pct: PCT(t) });
  }, { cam: { x: 600, y: 410, k: 1.2 } });
  scene(28, 31.5, t => { // DAY 13: về nhà, đi ngang khung cửa có vạch hồi nhỏ, không nhìn
    let s = hallway(t) + doorFrame(560, { kids: 0.6 });
    const x = lerp(300, 900, ramp(t, 28, 31.4)), J = walk(x, 560, t * 6); J.head = [J.head[0] - 4, J.head[1] + 10];
    J.re = [x + 18, 470]; J.rh = [x + 30, 500]; fixArms(J);
    s += fig(J, { flame: 0.34, t, mood: 'sad' }) + `<g transform="rotate(-80 ${x + 36} 500)">${skateboard(x + 36, 496)}</g>` + handDot(J.rh);
    return s + hudC(FIREC(t), { pct: PCT(t) });
  }, { cam: STAND(620, 1.4) });
  scene(31.5, 35, t => { // DAY 17: ván bám bụi ở góc tường
    let s = hallway(t) + shadowFig(whisperPose(700, 560, -1), { k: 0.9, op: ramp(t, 31.7, 32.3) }) + `<g transform="rotate(-82 860 500)">${skateboard(860, 496)}</g>`;
    for (let i = 0; i < 24; i++) s += `<circle cx="${850 + 24 * rnd(i)}" cy="${440 + 110 * rnd(i + 3)}" r="1.4" fill="#8a8478" opacity=".7"/>`;
    const J = sitChair(560, 560, { look: -8 }); J.face = -1; J.head = [J.head[0] - 30, J.head[1] + 10];
    s += chair(560, 560) + fig(J, { flame: 0.3, t, mood: 'tired' });
    return s + hudC(FIREC(t), { pct: PCT(t) });
  }, { cam: STAND(700) });
  scene(35, 42, t => { // xem người giỏi nhất bay qua dốc lớn, nắm chặt tay, quyết đuổi kịp ngay
    KX = 820; FX0 = 560;
    let s = park(t) + flyers(t, 2, { speed: 0.3 });
    const J = stand(380, 560, { look: 10 });
    if (t > 38) { J.le = [400, 470]; J.lh = [410, 450]; }
    J.re = [398, 470]; J.rh = [410, 500]; fixArms(J);
    s += fig(J, { flame: 0.32, t, mood: t > 38 ? 'fierce' : 'sad' }) + `<g transform="rotate(-80 416 500)">${skateboard(416, 496)}</g>` + handDot(J.rh);
    if (t > 40) s += `<path d="M470,520 L760,520" stroke="#cfc6b8" stroke-width="2" stroke-dasharray="6 8" opacity="${fade(t, 40, 42, 0.3, 0.3)}"/>`;
    return s + hudC(FIREC(t), { pct: PCT(t) });
  }, { cam: { x: 620, y: 410, k: 1.2 } });

  // ================= 3. Cày (42–58): lao xuống dốc lớn nhất, té mạnh =================
  const DROP = [[700, 380], [760, 380], [840, 460], [900, 548], [1000, 548]];
  scene(42, 58, t => {
    let s = park(t, { big: false });
    s += `<path d="M560,560 L560,380 L760,380 Q860,390 900,560Z" fill="${CONC}" stroke="${CONC2}" stroke-width="3"/>` + ln([560, 380], [760, 380], '#8a8a96', 5);
    for (let i = 0; i < 7; i++) s += `<circle cx="${1000 + i * 52}" cy="${600 + 3 * Math.sin(i)}" r="24" fill="#1a1a20"/>`; // khán giả
    const drop = ramp(t, 46.8, 49.2), crash = t >= 49.4;
    let sp;
    if (!crash) {
      let x = 700, y = 380, a = 0;
      if (drop > 0) { x = lerp(760, 920, drop); y = drop < 0.6 ? 380 + 160 * Math.pow(drop / 0.6, 1.6) : 548; a = drop < 0.6 ? 40 * Math.sin(Math.PI * drop / 0.6) : 0; if (drop > 0.85) a = Math.sin(t * 40) * 25; }
      sp = rider(x, y - 6, a, { flame: lerp(0.3, 0.2, drop), t, mood: drop > 0 ? 'fierce' : 'sad', arms: true, wob: t < 46.8 ? Math.sin(t * 30) * 4 : Math.sin(t * 14) * 14 });
    } else {
      const k = ramp(t, 49.4, 50.2), bx = 960 + 300 * ramp(t, 49.4, 50.6), by = 548 - 80 * Math.sin(Math.PI * ramp(t, 49.4, 50.6));
      const J = lieBed(1000 + 30 * k, 560); J.lh = [920, 540]; J.rh = [930, 548];
      sp = skateboard(bx, by, 300 * ramp(t, 49.4, 50.6)) + fig(J, { flame: 0.12, t, mood: 'sad' });
      if (t > 52) sp += `<rect x="900" y="528" width="16" height="10" rx="3" fill="#f4efe4" stroke="#b9ab98"/>`;
    }
    s += sp;
    if (t > 44 && t < 46.6) s += shadowFig(whisperPose(600, 380, 1), { k: 0.8, ax: 600, ay: 380 });
    if (t > 51.2) s = s + shadowFig(whisperPose(860, 560, 1), { k: 1.0, op: ramp(t, 51.2, 51.8) });
    return s + hudC(FIREC(t), { pct: PCT(t) });
  }, { cam: t => { const c = { x: lerp(700, 900, ramp(t, 46.8, 49.6)), y: lerp(330, 420, ramp(t, 46.8, 49.6)), k: 1.5 }; return c; } });

  // ================= 4. Đáy (58–72): ngồi tựa khung cửa trong bóng tối, tay băng =================
  scene(58, 72, t => {
    let s = hallway(t) + doorFrame(560, { kids: 0.15 }) + shadowFig(whisperPose(760, 560, -1), { k: 1.0, op: ramp(t, 59.4, 60.2) });
    s += skateboard(860, 552, 180);
    const J = sitGround(580, 560); J.head = [J.head[0] + 6, J.head[1] + 14]; J.lh = [610, 520]; J.le = [600, 500]; fixArms(J);
    s += fig(J, { flame: 0.05, t, mood: 'tired' }) + `<rect x="${J.le[0] - 10}" y="${J.le[1] - 6}" width="22" height="14" rx="4" fill="#f4efe4" stroke="#b9ab98"/>`;
    return s + dark(0.25) + hudC(4, { pct: -99 });
  }, { cam: STAND(640) });

  // ================= 5. Bước ngoặt (72–86) =================
  scene(72, 82.6, t => {
    const lit = ramp(t, 72.4, 72.8);
    let s = hallway(t, { lit }) + doorFrame(560, { kids: lerp(0.15, 1, lit), lit: lit > 0.5 });
    if (t < 72.4) s += `<text x="1200" y="140" fill="#888" font-size="1"></text>`;
    const stood = ramp(t, 73.4, 74.4);
    const A = sitGround(580, 560), B = stand(586, 560, { look: 10 });
    const J = {}; for (const k in B) J[k] = Array.isArray(B[k]) ? mix(A[k], B[k], stood) : B[k];
    // kẻ thù chìa thước dây chỉ ra cửa sổ (người khác); Spark giành lấy, quay vào khung cửa
    const grab = ramp(t, 76.6, 77.2), turned = t > 77.4;
    const E = whisperPose(780, 560, -1);
    const born = ramp(t, 74.6, 75.6), gone = ramp(t, 77.4, 78.4);
    if (t > 74.6 && !turned) { E.lh = [730, 420]; E.le = [756, 440]; }
    if (born > 0 && gone < 1) s += shadowFig(E, { k: 0.3 + 0.7 * born, op: born * (1 - gone), ax: 760, ay: 560, jitter: turned ? 5 : 0 });
    if (t > 75.6 && !turned) s += tape([730, 420], [lerp(730, 1060, ramp(t, 75.6, 76.4)), 380]);
    if (grab > 0 && !turned) { J.lh = mix([606, 470], [720, 420], grab); J.le = [640, 444]; }
    if (turned) { J.look = -10; J.face = -1; J.head = [J.head[0] - 8, J.head[1]]; J.lh = [574, 450]; J.le = [586, 470]; }
    fixArms(J);
    s += fig(J, { flame: t < 77.4 ? 0.05 : lerp(0.05, 0.18, ramp(t, 77.4, 78.4)), t, mood: t > 76 ? 'fierce' : t > 73 ? 'sad' : 'tired', blink: false });
    if (stood > 0.9 && t < 76) s += ln([570, J.head[1] - 31], [606, J.head[1] - 31], '#cfc6b8', 1.5, 0.8); // đỉnh đầu cao hơn vạch 12
    if (turned) s += tape([574, 450], [574, lerp(450, 336, ramp(t, 77.4, 78.2))], 'mine', true) + handDot(J.lh);
    else if (grab > 0) s += handDot(J.lh);
    if (t > 77.4 && t < 78.6) { const q = (t - 77.4) / 1.2; s += `<text x="${J.head[0] + 60}" y="${J.head[1] + 20 - 26 * q}" fill="${ORANGE}" fill-opacity="${1 - q}" filter="url(#softGlow)" font-family="${MONO}" font-size="15" font-weight="700">+4%</text>`; }
    // từ khoá: THEM (xám) vỡ → YESTERDAY (vàng) → bay vào góc
    if (t > 78.4) {
      const o = fade(t, 78.4, 82.6, 0.3, 0.01), crack = ramp(t, 79.2, 80.0), y2 = ramp(t, 80.0, 80.6), fly2 = ramp(t, 81.6, 82.4);
      let k = '';
      'THEM'.split('').forEach((ch, i) => { const d = clamp(crack * 1.4 - i * 0.1); k += `<text x="${900 + i * 52}" y="${200 + 300 * d * d}" fill="#9a968e" fill-opacity="${1 - d}" font-family="Inter" font-size="72" font-weight="900" text-anchor="middle" transform="rotate(${30 * d * (i % 2 ? 1 : -1)} ${900 + i * 52} 200)">${ch}</text>`; });
      if (y2 > 0) k += `<text x="${lerp(980, 1150, fly2)}" y="${lerp(200, 62, fly2)}" fill="${YEL}" fill-opacity="${y2}" filter="url(#yelGlow)" font-family="Inter" font-size="${lerp(58, 14, fly2)}" font-weight="900" letter-spacing="${lerp(6, 2, fly2)}" text-anchor="middle">YESTERDAY</text>`;
      s += ui(`<g opacity="${o}">${k}</g>`);
    }
    return s + hudC(t < 77.4 ? 4 : 8, t < 82.2 ? { pct: -99 } : { yest: 0 });
  }, { nopush: true, cam: t => ({ ...STAND(640), k: 1.6 + 0.2 * ramp(t, 73.6, 74.6) * (1 - ramp(t, 75.4, 76)) }) });
  scene(82.6, 86, t => { // kẻ vạch DAY 1 bên cột phải
    let s = hallway(t, { lit: 1 }) + doorFrame(560, { kids: 1, lit: true, days: [[1, DAYS[0][1], ramp(t, 83.6, 84.4)]] });
    const J = stand(726, 560, { look: -10 }); J.face = -1; J.flameDir = 1;
    const draw = ramp(t, 83.0, 84.4);
    J.lh = [lerp(700, 664, draw), DAYS[0][1] + 2]; J.le = [704, 450]; fixArms(J);
    s += fig(J, { flame: lerp(0.18, 0.3, draw), t, mood: 'fierce' }) + ln(J.lh, [J.lh[0] - 16, J.lh[1] - 4], '#e8b04a', 4) + handDot(J.lh);
    return s + hudC(t < 84.4 ? 8 : 16, { yest: 1 });
  }, { cam: STAND(640, 1.9) });

  // ================= 6. Montage YOU vs YESTERDAY (86–118) =================
  scene(86, 92.4, t => { // DAY 1: đứng thăng bằng trên thảm phòng khách
    let s = room() + `<rect x="420" y="556" width="420" height="8" rx="3" fill="#7a3a3a"/>` + timer(760, 470, Math.max(0, 10 - (t - 86.6)));
    s += rider(600, 548, Math.sin(t * 5) * 3, { flame: 0.36, t, mood: 'fierce', arms: true, wob: Math.sin(t * 5) * 10 });
    return s + hudC(22, { yest: 1 });
  }, { cam: STAND(620) });
  scene(92.4, 98.8, t => { // DAY 5: đẩy ván ở bãi xe vắng
    let s = `<rect x="-400" y="-300" width="2200" height="860" fill="#1c1e26"/>` + `<rect x="-400" y="560" width="2200" height="300" fill="#2a2a30"/>`;
    for (let i = 0; i < 9; i++) { const x = ((i * 200 - t * 260) % 1800 + 1800) % 1800 - 300; s += ln([x, 600], [x + 90, 600], '#e8e0cc', 4, 0.6); }
    const push = Math.sin(t * 4) > 0.6;
    s += shadowFig(whisperPose(380, 560, 1), { k: lerp(0.6, 0.05, ramp(t, 93.4, 96)), op: fade(t, 92.6, 96.2, 0.3, 0.4), ax: 380, ay: 560 });
    s += rider(560, 548, 0, { flame: 0.5, t, mood: 'happy', crouch: push ? 14 : 6 });
    return s + hudC(34, { yest: 5 });
  }, { cam: STAND(560) });
  scene(98.8, 105.2, t => { // DAY 12: lên lề đường
    let s = `<rect x="-400" y="-300" width="2200" height="860" fill="#2a3044"/>` + `<rect x="-400" y="560" width="2200" height="300" fill="#2a2a30"/>` + `<rect x="740" y="536" width="900" height="24" fill="#5a5a64"/>`;
    const x = lerp(300, 900, ramp(t, 99.2, 104.4)), hop = x > 690 && x < 760 ? Math.sin(Math.PI * (x - 690) / 70) * 30 : 0, base = x >= 740 ? 524 : 548;
    s += rider(x, base - hop, hop > 2 ? -12 : 0, { flame: 0.62, t, mood: hop > 2 ? 'fierce' : 'happy' });
    return s + hudC(48, { yest: 12 });
  }, { cam: STAND(620) });
  scene(105.2, 111.6, t => { // DAY 20: Ember tập cùng, cả hai té, cười
    let s = park(t, { big: false });
    const fallen = t > 108.2;
    if (!fallen) { s += rider(lerp(320, 560, ramp(t, 105.4, 108)), 548, Math.sin(t * 8) * 6, { flame: 0.7, t, mood: 'happy', arms: true, wob: Math.sin(t * 8) * 10 }); s += rider(lerp(460, 720, ramp(t, 105.4, 108)), 548, Math.sin(t * 7 + 1) * 6, { c: '#d9cfc0', mood: 'happy', arms: true, wob: Math.sin(t * 7) * 10, extra: J => cap(J) }); }
    else { const E = sitGround(740, 560); s += skateboard(820, 548) + skateboard(660, 548) + fig(sitGround(560, 560), { flame: 0.74, t, mood: 'happy' }) + fig(E, { c: '#d9cfc0', mood: 'happy' }) + cap(E); }
    return s + hudC(62, { yest: 20 });
  }, { cam: STAND(620) });
  scene(111.6, 118, t => { // DAY 30: cú ollie đầu tiên, thấp, công viên vắng lúc bình minh → cột vạch trên khung cửa
    if (t < 115.6) {
      let s = park(t, { dawn: 1, big: false });
      const x = lerp(260, 900, ramp(t, 111.8, 115.4)), u = clamp((x - 520) / 120), hop = Math.sin(Math.PI * u) * 34;
      s += rider(x, 548 - hop, u > 0 && u < 1 ? lerp(-14, 6, u) : 0, { flame: 0.82, t, mood: u > 0 ? 'fierce' : 'happy' });
      return s + hudC(76, { yest: 30 });
    }
    const n = 5;
    let s = hallway(t, { lit: 1 }) + doorFrame(560, { kids: 1, lit: true, days: DAYS.slice(0, n).map(([d, y], i) => [d, y, clamp((t - 115.8) * 3 - i * 0.6)]) });
    return s + hudC(85, { yest: 30 });
  }, { cam: t => t < 115.6 ? STAND(600) : { x: 620, y: 410, k: 2.4 } });

  // ================= 7. Trận cuối (118–134): công viên đông người, dốc nhỏ =================
  const SMALL = 520;
  const sparkFinal = t => {
    // đứng trên dốc nhỏ → lăn xuống → lướt → (lặng) → ollie → đáp
    if (t < 127.4) return [SMALL - 40, 508, 0, 0];
    if (t < 128.4) { const q = ramp(t, 127.4, 128.4); return [lerp(SMALL - 40, SMALL + 60, q), lerp(508, 548, Math.pow(q, 1.5)), 22 * Math.sin(Math.PI * q), 0]; }
    if (t < 130.0) return [lerp(SMALL + 60, SMALL + 230, ramp(t, 128.4, 130.0)), 548, 0, 1];
    const q = clamp((t - 130.0) / 0.6); return [lerp(SMALL + 230, SMALL + 330, q), 548 - Math.sin(Math.PI * q) * 40, q < 1 ? lerp(-16, 6, q) : 0, 2];
  };
  scene(118, 134, t => {
    KX = 1080; FX0 = 900;
    let s = park(t, { small: SMALL });
    s += flyers(t, 3, { speed: 0.26 });
    for (let i = 0; i < 9; i++) s += `<circle cx="${-60 + i * 50}" cy="${612 + 4 * Math.sin(i * 2)}" r="22" fill="#18161c"/>`;
    const broke = t >= 130.6, shatter = ramp(t, 130.6, 131.8);
    const born = ramp(t, 120.4, 122);
    if (born > 0 && shatter < 1) s += shadowFig(whisperPose(320, 560, 1), { k: 0.4 + 0.9 * born, op: born * (broke ? 1 - shatter : 1), ax: 260, ay: 560, jitter: broke ? 30 * (1 - shatter) : 0 });
    const [x, y, a, ph] = sparkFinal(t);
    let fl = 0.85; fl = lerp(fl, 0.4, ramp(t, 121, 125)); fl = lerp(fl, 0.62, ramp(t, 126.2, 127.4)); fl = lerp(fl, 1.3, shatter);
    const eyesClosed = t > 125.8 && t < 127.3;
    s += rider(x, y, a, { flame: fl, t, mood: eyesClosed ? 'tired' : t > 127.3 ? 'fierce' : 'sad', crouch: ph === 1 ? 18 : 8, arms: t < 127.4, wob: t < 125.8 ? Math.sin(t * 40) * 2 : 0 });
    const J = riderPose(x, y);
    // thước dây quấn: nối lửa Spark với lửa từng người bay qua
    if (t > 121.4 && !broke && !(t > 125.1 && t < 127.4)) for (let i = 0; i < 3; i++) { const e = ramp(t, 121.4 + i * 0.7, 122.2 + i * 0.7); if (e > 0) s += tape(flamePos(J), mix(flamePos(J), FLY_FLAME(t, i, 3, 0.26), e), 'enemy', i === 0); }
    else if (broke && shatter < 1) for (let i = 0; i < 6; i++) { const fp = flamePos(J), a2 = i * 1.1; s += `<rect x="${fp[0] + Math.cos(a2) * 160 * shatter}" y="${fp[1] + Math.sin(a2) * 120 * shatter + 80 * shatter * shatter}" width="30" height="7" fill="#141216" stroke="${RED}" stroke-width="1" transform="rotate(${200 * shatter * (i % 2 ? 1 : -1)} ${fp[0]} ${fp[1]})" opacity="${1 - shatter}"/>`; }
    // nhắm mắt: khung cửa với cột vạch vàng hiện mờ
    if (eyesClosed) s += ui(`<g opacity="${0.5 * fade(t, 125.8, 127.3, 0.3, 0.3)}"><g transform="translate(960,360) scale(1.2) translate(-615,-380)">` + doorFrame(580, { kids: 1, lit: true, days: DAYS.slice(0, 5) }) + '</g></g>');
    if (broke) s += `<circle cx="${flamePos(J)[0]}" cy="${flamePos(J)[1]}" r="${60 + 1100 * shatter}" fill="none" ${st(YEL, 8, 0.7 * (1 - shatter))}/>`;
    if (t > 130.6 && t < 130.8) s += ui(`<rect width="1280" height="720" fill="#fff" opacity=".8"/>`);
    return s;
  }, { nopush: true, cam: t => {
    const [x] = sparkFinal(t);
    const face = ramp(t, 125.2, 125.8) * (1 - ramp(t, 127.2, 127.5));
    let c = { x: lerp(560, 640, ramp(t, 120.4, 122.4)), y: 400, k: 1.25 };
    if (face > 0) c = { x: lerp(c.x, SMALL - 30, face), y: lerp(c.y, 330, face), k: lerp(c.k, 2.6, face) };
    if (t > 127.4) c = { x: lerp(SMALL + 40, x + 40, 0.7), y: 420, k: 1.6 };
    return c;
  } });

  // ================= 8. Phần thưởng (134–150) =================
  scene(134, 142, t => { // bé mới tập ngã, Spark đỡ dậy, chỉ cách đặt chân
    KX = 780; FX0 = 600;
    let s = park(t, { big: false });
    const up = ramp(t, 137.2, 138.4);
    const kx = 760;
    if (up < 1) { const A = sitGround(kx, 560); A.face = -1; s += skateboard(kx - 70, 548) + flip(kx, kidFig(sitGround(kx, 560), 0.7, 'helmet')); }
    else s += `<g>` + flip(kx, `<g transform="translate(${kx},548) scale(.7) translate(${-kx},-548)">` + skateboard(kx, 548) + kidFig(riderPose(kx, 548, { arms: true, wob: Math.sin(t * 5) * 6 }), 1, 'helmet') + '</g>') + '</g>';
    const J = stand(620, 560, { look: 10 });
    if (t > 135.6 && up < 1) { J.le = [646, 470]; J.lh = [lerp(660, 690, ramp(t, 135.6, 136.6)), lerp(480, 500, ramp(t, 135.6, 136.6))]; }
    if (up >= 1 && t > 139) { J.le = [644, 470]; J.lh = [672, 510 + 6 * Math.sin(t * 4)]; J.head = [J.head[0] + 6, J.head[1] + 8]; }
    fixArms(J);
    s += skateboard(520, 548, 0) + fig(J, { flame: 1.0, t, mood: 'happy', blink: (t % 3.4) < 0.12 }) + handDot(J.lh);
    return s + hudC(92, { yest: 44 });
  }, { cam: STAND(690, 1.5) });
  scene(142, 150, t => { // về nhà kẻ vạch DAY 45
    let s = hallway(t, { lit: 1 }) + doorFrame(560, { kids: 1, lit: true, days: DAYS.map(([d, y], i) => [d, y, i < 5 ? 1 : ramp(t, 144.2, 145.2)]) });
    const J = stand(726, 560, { look: -10 }); J.face = -1; J.flameDir = 1;
    const draw = ramp(t, 143.4, 145.0);
    J.lh = [lerp(700, 664, draw), DAYS[5][1] + 2]; J.le = [704, 430]; fixArms(J);
    s += fig(J, { flame: 1.0, t, mood: t > 145.4 ? 'happy' : 'fierce' }) + ln(J.lh, [J.lh[0] - 16, J.lh[1] - 4], '#e8b04a', 4) + handDot(J.lh) + `<g transform="rotate(-82 860 500)">${skateboard(860, 496)}</g>`;
    return s + hudC(100, { yest: 45 });
  }, { cam: t => ({ x: lerp(660, 620, ramp(t, 142, 150)), y: 420, k: lerp(1.9, 2.2, ramp(t, 142, 150)) }) });

  // ================= 9. Tấm gương + tên phim (150–161) =================
  scene(150, 155.6, t => {
    let s = hallway(t, { lit: 1 }) + doorFrame(560, { kids: 1, lit: true, days: DAYS });
    s += ui(`<rect x="0" y="96" width="1280" height="66" fill="#000" opacity="${0.55 * fade(t, 150.4, 155.4, 0.8, 0.6)}"/><rect x="0" y="560" width="1280" height="72" fill="#000" opacity="${0.55 * fade(t, 152.4, 155.4, 0.6, 0.6)}"/>` + txt(640, 140, 'Someone will always be ahead.', { size: 40, w: 600, op: fade(t, 150.4, 155.4, 0.8, 0.6) }) +
      `<text x="640" y="610" fill="${YEL}" fill-opacity="${fade(t, 152.4, 155.4, 0.6, 0.6)}" filter="url(#yelGlow)" font-family="Inter" font-size="50" font-weight="800" text-anchor="middle">Just beat yesterday.</text>`);
    return s;
  }, { fo: 0.6, cam: { x: 618, y: 400, k: 2.3 } });
  scene(155.6, 161, t => {
    let s = `<text x="640" y="360" fill="${YEL}" fill-opacity="${fade(t, 156.0, 160.4, 0.8, 0.8)}" filter="url(#yelGlow)" font-family="Inter" font-size="92" font-weight="800" letter-spacing="22" text-anchor="middle">COMPARE</text>`;
    s += txt(640, 410, 'an animated short film', { size: 22, c: MUTED, ls: 6, op: fade(t, 156.6, 160.4, 0.8, 0.8) });
    s += flame(640, 520, 0.32, t, fade(t, 157.0, 160.4, 0.6, 0.8)) + txt(640, 572, 'Keep the fire.', { size: 20, c: ORANGE, w: 600, ls: 4, op: fade(t, 157.4, 160.4, 0.6, 0.8) });
    return s;
  }, { fo: 0.01 });


  // ================= 5b. Hồi tưởng (chèn 73.2–79.2, thời gian thật) =================
  // Lý do thôi so với người khác: hồi nhỏ, mỗi lần mẹ kẻ vạch, bé chỉ so với vạch cũ của chính mình — và lớn lên từng chút.
  const FLASH_A = 73.2, FLASH_LEN = 6;
  const MARKS = [[7, 434, 73.6], [8, 418, 76.0], [9, 404, 76.7], [10, 390, 77.4]];
  function flashback(t) {
    let s = hallway(t, { lit: 1 }) + glow(600, 400, 340, 0.35);
    const shown = MARKS.filter(([, , ts]) => t > ts + 0.55); // số hiện sau khi tay mẹ rút về
    s += doorFrame(560, { kids: 0 });
    [[5, 470], [6, 452]].concat(shown.map(([a, y]) => [a, y])).forEach(([a, y]) => { s += ln([546, y], [560, y], GRAPH, 2.4) + `<text x="542" y="${y + 4}" fill="#e8dcc0" font-family="Inter" font-size="11" font-weight="700" text-anchor="end">${a}</text>`; });
    // bé lớn dần qua từng vạch: chiều cao đỉnh đầu ≈ vạch hiện tại
    const step = t < 75.6 ? 0 : t < 76.3 ? 1 : t < 77.0 ? 2 : 3, k = [0.62, 0.66, 0.70, 0.74][step];
    const cheer = (t > 74.6 && t < 75.6) || (t > 76.2 && t < 76.5) || (t > 76.9 && t < 77.2) || (t > 77.6 && t < 78.2);
    const C = cheer ? armsUp(590, 560, 1) : stand(590, 560, { look: 10 });
    if (!cheer && t > 74.2 && t < 74.6) { C.head = [C.head[0] - 4, C.head[1] + 10]; } // nhìn xuống vạch cũ của mình
    s += `<g transform="translate(590,560) scale(${k}) translate(-590,-560)">` + fig(C, { c: '#efe2cf', flame: 0.5, t, mood: 'happy' }) + '</g>';
    // mẹ (búi tóc) kẻ vạch trên đầu bé
    const M = stand(486, 560, { look: 10 }); // mẹ đứng phía ngoài cột trái, tay không che mặt bé
    const mk = MARKS.slice().reverse().find(([, , ts]) => t > ts - 0.4) || MARKS[0];
    const drawing = MARKS.some(([, , ts]) => t > ts - 0.3 && t < ts + 0.5);
    if (drawing) { M.lh = [546, mk[1] + 2]; M.le = [516, mk[1] + 22]; }
    else { M.lh = [506, 482]; M.le = [500, 456]; }
    fixArms(M);
    s += `<circle cx="${M.head[0] - 22}" cy="${M.head[1] - 14}" r="13" fill="#6a4a36"/>` + fig(M, { c: '#e2d2bc', mood: 'happy' });
    if (drawing) s += ln(M.lh, [M.lh[0] - 14, M.lh[1] - 8], '#e8b04a', 4) + handDot(M.lh, '#e2d2bc');
    // mũi tên nhỏ: từ vạch cũ lên vạch mới
    if (shown.length) { const [a, y] = shown[shown.length - 1], py = a === 7 ? 452 : MARKS.find(m => m[0] === a - 1)[1]; s += `<path d="M572,${py} q12,${(y - py) / 2} 0,${y - py + 4}" fill="none" stroke="#e8dcc0" stroke-width="1.6" stroke-dasharray="3 3" marker-end="none" opacity=".8"/>`; }
    // lớp ký ức: tông ấm, mép tối mềm
    const io = Math.min(clamp((t - FLASH_A) / 0.5), clamp((FLASH_A + FLASH_LEN - t) / 0.6));
    s += `<rect x="-600" y="-400" width="2600" height="1400" fill="#c88a4a" opacity=".16"/>`;
    return { s, io };
  }

  // ---------- lời thì thầm: [giây, câu, thời lượng] (thời gian thật) ----------
  const WH = [
    [6.6, 'look at them.', 2.3],
    [17.9, 'they started younger', 2.2],
    [21.6, "you're so far behind", 2.2],
    [32.0, 'why bother'],
    [44.4, "everyone's watching", 2.0],
    [51.6, 'i told you.', 2.2],
    [60.4, "you'll never catch up.", 2.6],
    [75.0, 'look at them.', 1.8],
    [93.6, 'look at them', 1.6],
    [121.4, 'look at them', 2.2], [122.4, "they're better", 2.0], [123.4, "you're last", 1.8], [124.4, 'why try', 1.6],
  ];
  function whispers(t) {
    if (!ENEMY) return '';
    let s = '', n = 0;
    const fr = Math.floor(t * 8); // run nhẹ, đổi mỗi 3 khung
    for (const [a, w, d = 2.0] of WH) {
      if (t < a - 0.05 || t > a + d + 0.5) continue;
      const o = fade(t, a, a + d, 0.2, 0.45), up = 14 * clamp((t - a) / (d + 0.5));
      const side = -ENEMY.d; // phía lưng kẻ thù, không đè mặt nó hay nhân vật
      let x = ENEMY.x + side * (ENEMY.r + 18), y = ENEMY.y - ENEMY.r * 0.2 - n * 34 - up * 0.6;
      x += Math.sin(fr * 12.9 + a) * 1.2; y += Math.cos(fr * 7.3 + a) * 1.2;
      const anchor = side < 0 ? 'end' : 'start';
      const wpx = w.length * 11.5; // bề rộng ước lượng (22px)
      if (anchor === 'end') x = Math.min(1236, Math.max(44 + wpx, x)); else x = Math.min(1236 - wpx, Math.max(44, x));
      y = Math.min(650, Math.max(70, y));
      s += `<text x="${x}" y="${y}" fill="#ff9aa6" fill-opacity="${o}" stroke="${RED}" stroke-width="1.1" stroke-opacity="${o}" filter="url(#redGlow)" font-family="Inter" font-size="22" font-weight="600" text-anchor="${anchor}">${w}</text>`;
      n++;
    }
    return s;
  }


  const DEFS = `<defs><radialGradient id="gO"><stop offset="0" stop-color="${ORANGE}" stop-opacity=".9"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="gC"><stop offset="0" stop-color="${COLD}" stop-opacity=".7"/><stop offset="1" stop-color="${COLD}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="vig" cx=".5" cy=".5" r=".72"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>` +
    `<filter id="redGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `<filter id="softGlow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `<filter id="yelGlow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
    `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="77"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .06 0"/></filter>` +
    `<filter id="wobble"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter></defs>`;

  // bộ vẽ dùng chung cho thumbnail
  window.KIT = { fig, shadowFig, flame, glow, txt, stand, slump, sitChair, whisperPose, cap, skateboard, rider, riderPose, park, tape, doorFrame, hallway, kidFig, sitGround, flip, DEFS, MONO, C: { W, BG, MUTED, ORANGE, CORE, RED, YEL, SKIN, COLD } };
  window.DURATION = DUR;
  for (const w of WH) if (w[0] >= FLASH_A) w[0] += FLASH_LEN;
  window.WHISPERS = WH;
  const SHAKES = [[49.4, 0.4, 9], [130.6, 0.7, 16]];
  window.frame = function (T) {
    const FB = T >= FLASH_A && T < FLASH_A + FLASH_LEN, t = T >= FLASH_A + FLASH_LEN ? T - FLASH_LEN : T; // t = thời gian phim gốc
    let body = '';
    ENEMY = null;
    CLIPN = 0;
    const seed = Math.floor(T * 8) % 9; // nét rung vẽ lại mỗi 3 khung
    const defs = DEFS.replace('seed="4"', `seed="${seed + 1}"`).replace('seed="77"', `seed="${seed + 30}"`);
    if (FB) {
      const { s: fs, io } = flashback(T);
      CAM = { x: 560, y: 432, k: 2.4 * (1 + 0.06 * clamp((T - FLASH_A) / FLASH_LEN)) };
      body += `<g opacity="${io}"><g transform="translate(640,360) scale(${CAM.k}) translate(${-CAM.x},${-CAM.y})">${fs}</g></g>` +
        `<rect width="1280" height="720" fill="url(#vig)" opacity="${0.9 * io}"/>`;
    }
    for (const sc of FB ? [] : S) {
      if (t < sc.a || t >= sc.b) continue;
      const o = Math.min(clamp((t - sc.a) / sc.fi), clamp((sc.b - t) / sc.fo));
      const c0 = typeof sc.cam === 'function' ? sc.cam(t) : (sc.cam || { x: 640, y: 360, k: 1 });
      const push = sc.nopush ? 1 : 1 + 0.08 * clamp((t - sc.a) / (sc.b - sc.a)); // camera không bao giờ ngủ
      let sx = 0, sy = 0;
      for (const [ts, dur, amp] of SHAKES) if (t >= ts && t < ts + dur) { const e = 1 - (t - ts) / dur; sx += Math.sin(t * 97) * amp * e; sy += Math.cos(t * 83) * amp * e; }
      const ZOOM = 0.8; // nhân vật hiển thị nhỏ đi 20%, mặt đất giữ nguyên chỗ trên màn hình
      const cy = 560 - (560 - c0.y) / ZOOM;
      CAM = { x: c0.x + sx / (c0.k * ZOOM * push), y: cy + sy / (c0.k * ZOOM * push), k: c0.k * ZOOM * push };
      body += `<g opacity="${o}"><g transform="translate(640,360) scale(${CAM.k}) translate(${-CAM.x},${-CAM.y})">${sc.fn(t)}</g></g>`;
    }
    body += whispers(T);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1280 720">${defs}<rect width="1280" height="720" fill="${BG}"/>${body}<rect width="1280" height="720" filter="url(#grain)" opacity=".5"/>` +
      `<rect width="1280" height="720" fill="url(#vig)"/><rect width="1280" height="36" fill="#000"/><rect y="684" width="1280" height="36" fill="#000"/></svg>`;
  };
})();
