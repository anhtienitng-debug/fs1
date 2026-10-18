// TOMORROW — vẽ khung hình tại thời điểm t (giây). Chạy trong trình duyệt: window.frame(t) → chuỗi SVG. Bộ nhân vật lấy từ SCROLL.
(function () {
  const W = '#f4f1ea', BG = '#0d0a09', MUTED = '#8d8a84', GREY = '#55534f';
  const ORANGE = '#ff8a1f', CORE = '#ffd166', EMBER = '#7a4a22', SMOKE = '#3a3a3a', COLD = '#bcd7ff';
  const DUR = 165;

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
    const e = Math.hypot(e1[0] - hint[0], e1[1] - hint[1]) <= Math.hypot(e2[0] - hint[0], e2[1] - hint[1]) ? e1 : e2;
    return [e, h];
  }
  function fixArms(J) {
    const u = unitv(J.neck, J.hip), sh = addv(J.neck, u, 22);
    [J.le, J.lh] = ikArm(sh, J.lh, J.le);
    [J.re, J.rh] = ikArm(sh, J.rh, J.re);
    return J;
  }
  // thân + tay chân; fill/line = màu ruột/viền, e = độ dày viền
  function bodyShapes(J, fill, line, e, legFill) {
    fixArms(J);
    const u = unitv(J.neck, J.hip);
    const top = addv(J.neck, u, 12), bot = J.hip;
    const L = (p, q, w, c) => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    const PL = (pts, w, c) => `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
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
  const scene = (a, b, fn, fx = {}) => S.push({ a, b, fn, fi: 0.1, fo: fx.fo ?? 0.03, cam: fx.cam });

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
    const u = unitv(J.neck, J.hip), sh = addv(J.neck, u, 22), pts = [sh, J.le, J.lh].map(p => p.join(',')).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${SKIN_LINE}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="${fill}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`;
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
  function hudT(fire, right, o = 1) {
    if (o <= 0) return '';
    const c = fire > 8 ? ORANGE : '#7b7872';
    let s = `<text x="48" y="70" fill="${c}" fill-opacity="${o}" font-family="${MONO}" font-size="16" font-weight="700" letter-spacing="3" filter="url(#softGlow)">FIRE <tspan font-size="24" letter-spacing="0">${fire}%</tspan></text>`;
    if (right && right.today !== undefined) s += `<text x="1232" y="72" fill="${YEL}" fill-opacity="${o}" filter="url(#yelGlow)" font-family="${MONO}" font-size="18" font-weight="700" letter-spacing="2" text-anchor="end">TODAY · DAY <tspan font-size="24">${right.today}</tspan></text>`;
    else if (right) s += `<text x="1232" y="72" fill="#8d8a84" fill-opacity="${o}" font-family="${MONO}" font-size="18" font-weight="700" letter-spacing="3" text-anchor="end">DAYS LEFT <tspan font-size="24" fill="#cfcbc2">${right.left}</tspan></text>`;
    return ui(s);
  }
  const room = (g = 560) => ground(-200, 1500, g, 0.6);
  const dark = (o) => o > 0 ? `<rect x="-400" y="-300" width="2200" height="1400" fill="#000" opacity="${o}"/>` : '';

  // ================= 1. Vết thương (0–14) =================
  const CAL1 = [214, 300];
  scene(0, 14, t => {
    let s = '';
    if (t < 1.6) return ui(txt(640, 370, '11:58 PM', { size: 30, c: '#77746e', w: 600, ls: 6, op: fade(t, 0.2, 1.6, 0.5, 0.3) }));
    const on = t < 12.4 ? 1 : 0;
    s += room() + lamp(820, 560, on) + bed(500, 490) + poster(700, 238, 'NOV 30');
    const write = ramp(t, 8.4, 9.8), trapped = ramp(t, 10.0, 10.8);
    s += calendar(CAL1[0], CAL1[1], 1, { note: write, ember: trapped });
    // bóng Spark + đàn trên tường (đèn bên phải) → kẻ thù mọc từ đó
    const born = ramp(t, 4.4, 6.0);
    s += `<g opacity="${0.5 * (1 - born) * on}"><ellipse cx="470" cy="400" rx="34" ry="70" fill="#000"/><circle cx="478" cy="315" r="30" fill="#000"/><circle cx="520" cy="430" r="30" fill="#000"/></g>`;
    let lay = ramp(t, 10.9, 11.8);
    const strumOn = t < 3.4 ? Math.abs(Math.sin(t * 5)) : 0;
    const P = playing(600, 560, { flame: lerp(0.62, 0.55, trapped), t, mood: t > 3.0 ? (t > 6 ? 'tired' : 'sad') : 'neutral', strum: strumOn, lean: t > 6.3 ? 6 : 0 });
    if (lay <= 0) s += P.s;
    else {
      // dựng đàn vào tường: tay sau kéo cần đàn theo
      const J = sitChair(600, 560, { look: 8 });
      const gx = lerp(620, 740, lay), gy = lerp(456, 490, lay), ga = lerp(-22, -78, lay);
      const neckP = gpt(gx, gy, ga, 80);
      if (lay < 1) { J.rh = neckP; J.re = [640, 440]; }
      fixArms(J);
      s += fig(J, { flame: 0.55, t, mood: 'tired' }) + guitar(gx, gy, ga) + (lay < 1 ? handDot(J.rh) : '');
    }
    // sợi lửa từ ngực bay vào tờ lịch
    const fp = flamePos(P.J);
    if (t > 9.9 && t < 10.9) s += thread(fp, [CAL1[0] + 78, CAL1[1] + 40], t, fade(t, 9.9, 10.9, 0.2, 0.3));
    // kẻ thù: mọc từ bóng, thì thầm, rồi quay sang viết lên lịch
    if (born > 0) {
      const writing = t > 8.0 && t < 10.4, ex = lerp(440, 330, ramp(t, 7.7, 8.2)) + lerp(0, 110, ramp(t, 10.4, 10.9));
      let E = writing ? whisperPose(ex, 560, -1) : whisperPose(ex, 560, 1);
      if (writing) { E.lh = [lerp(240, 300, write), 394 + 2 * Math.sin(t * 30)]; E.le = [ex - 20, 420]; }
      s = shadowFig(E, { k: 0.2 + 0.8 * born, op: born, ax: lerp(480, 440, born), ay: 560 }) + s;
    }
    s += dark(t > 12.4 ? 0.55 : 0);
    s += hudT(trapped > 0.5 ? 67 : 70, { left: 30 }, ramp(t, 1.8, 2.4));
    return s;
  }, { cam: STAND(560) });

  // ================= 2. Cái giá: montage DAYS LEFT 27 → 4 (14–42) =================
  const M2 = [[14, 27, 66], [17.5, 24, 61], [21, 19, 55], [24.5, 14, 47], [28, 9, 40], [31.5, 6, 34], [35, 4, 28], [38.5, 3, 24]];
  // 27: nằm lướt điện thoại, đàn dựng góc tường
  scene(14, 17.5, t => {
    const by = 470;
    let s = room(540) + bed(640, by) + guitar(980, 470, -78) + calendar(800, 236, 4, { note: 1, ember: 1 });
    const J = fixArms(lieBed(660, by)), pp = [J.rh[0] + 6, J.rh[1] - 26];
    const [fk] = flicks(t, 14.4, 1.0);
    s += phone(pp[0], pp[1], 160, 0.8 + 0.2 * fk) + fig(J, { flame: 0.5, t, mood: 'tired' });
    s = shadowFig(whisperPose(450, 540, 1), { k: 0.85, op: ramp(t, 14.2, 14.8) }) + s;
    return s + hudT(66, { left: 27 });
  }, { cam: { x: 640, y: 345, k: 1.6 } });
  // 24: Ember gõ cửa rủ tập, Spark lắc đầu, đóng cửa
  scene(17.5, 21, t => {
    let s = room();
    const close = ramp(t, 20.0, 20.6);
    s += `<rect x="760" y="300" width="120" height="260" fill="#1a1712" stroke="#5a5048" stroke-width="4"/>`;
    // Ember ngoài cửa (đội mũ vàng, cầm dùi trống)
    const E = stand(830, 560, { look: -8 }); E.face = -1;
    const wave = Math.sin(t * 6) * 10;
    E.le = [804, 470]; E.lh = [784, 440 + wave];
    fixArms(E);
    if (close < 1) s += `<g opacity="${1 - close}">` + fig(E, { c: '#d9cfc0', mood: 'happy' }) + cap(E) + ln(E.lh, [E.lh[0] - 30, E.lh[1] - 26], WOOD, 4) + ln([E.lh[0] + 4, E.lh[1]], [E.lh[0] - 22, E.lh[1] - 32], WOOD, 4) + '</g>';
    // cánh cửa đóng lại
    s += `<rect x="${lerp(880, 760, close)}" y="300" width="${120 * close}" height="260" fill="#3a2a1e" stroke="#5a4030" stroke-width="3"/>`;
    const J = stand(660, 560, { look: 8 });
    if (t > 18.6 && t < 19.8) { const sh = Math.sin((t - 18.6) * 16) * 8; J.head = [J.head[0] + sh, J.head[1]]; }
    if (t > 19.8) { J.le = [690, 470]; J.lh = [720, 456]; }
    fixArms(J);
    s += fig(J, { flame: 0.47, t, mood: 'tired' });
    return s + hudT(61, { left: 24 });
  }, { cam: STAND(720) });
  // 19: dọn phòng thay vì tập
  scene(21, 24.5, t => {
    let s = room() + guitar(900, 470, -78) + calendar(760, 250, 11, { note: 1, ember: 1 }) + books(380, 560);
    const sw = Math.sin(t * 7);
    const J = stand(600, 560, { look: 8 });
    J.lh = [640 + 14 * sw, 500]; J.le = [626, 452]; J.rh = [630 + 14 * sw, 470]; J.re = [622, 440];
    fixArms(J);
    const bTop = [J.rh[0] - 4, J.rh[1] - 30], bBot = [J.lh[0] + 40 + 10 * sw, 556];
    s += fig(J, { flame: 0.42, t, mood: 'neutral' }) + ln(bTop, bBot, WOOD, 5) + `<path d="M${bBot[0] - 18},560 L${bBot[0] + 18},560 L${bBot[0] + 8},${bBot[1] - 18} L${bBot[0] - 8},${bBot[1] - 18}Z" fill="#c9a86a"/>` + handDot(J.rh) + frontArm(J);
    for (let i = 0; i < 6; i++) { const k = ((t * 1.3 + i / 6) % 1); s += `<circle cx="${bBot[0] + 20 + 50 * k}" cy="${556 - 30 * k}" r="${3 * (1 - k)}" fill="#6a6058" opacity="${1 - k}"/>`; }
    s = shadowFig(whisperPose(440, 560, 1), { k: 0.85, op: ramp(t, 21.2, 21.8) }) + s;
    return s + hudT(55, { left: 19 });
  }, { cam: STAND(640) });
  // 14: xem người khác chơi đàn trên điện thoại, co người lại
  scene(24.5, 28, t => {
    let s = room() + bed(560, 490) + guitar(900, 470, -78);
    const J = sitChair(620, 560, { hand: [676, 452], hand2: [682, 450], look: 12 });
    J.head = [J.head[0] + 8, J.head[1] + 14]; J.neck = [J.neck[0] + 4, J.neck[1] + 6];
    s += phone(684, 432, 12, 1) + fig(J, { flame: 0.36, t, mood: 'sad' });
    // ảnh chèn màn hình: người khác chơi đàn dưới đèn, tim bay
    const ins = ramp(t, 25.0, 25.4);
    if (ins > 0) {
      let m = `<rect x="740" y="250" width="150" height="190" rx="14" fill="#14181e" stroke="#bcd7ff" stroke-width="2"/>` + glow(815, 320, 90, 0.4, 'gO');
      m += `<g transform="translate(815,425) scale(.42) translate(-815,-560)">` + playing(800, 560, { t, mood: 'happy', strum: Math.abs(Math.sin(t * 6)) }).s.replace(new RegExp(SKIN, 'g'), '#b9b5ad') + '</g>';
      for (let i = 0; i < 4; i++) { const k = ((t * 0.8 + i / 4) % 1); m += `<path d="M${870 - 10 * i},${420 - 120 * k} c-4,-6 -12,0 0,8 c12,-8 4,-14 0,-8z" fill="#fe2c55" opacity="${1 - k}"/>`; }
      s += `<g opacity="${ins}">${m}</g>`;
    }
    s = shadowFig(whisperPose(520, 560, 1), { k: 0.9, op: ramp(t, 24.7, 25.3) }) + s;
    return s + hudT(47, { left: 14 });
  }, { cam: STAND(680) });
  // 9: cất đàn xuống gầm giường
  scene(28, 31.5, t => {
    let s = room() + calendar(300, 250, 21, { note: 1, ember: 1 });
    const push = ramp(t, 28.6, 30.6);
    const gx = lerp(800, 600, push);
    s += guitar(gx, 540, 180, 0.95);
    s += bed(500, 490);
    const J = slump(gx + 84, 560); J.lh = [gx + 30, 536]; J.le = [gx + 62, 500]; J.rh = [gx + 24, 546]; J.re = [gx + 58, 504];
    J.head = [J.head[0] - 30, J.head[1] + 30]; J.neck = [J.neck[0] - 16, J.neck[1] + 18]; J.face = -1; J.look = -8;
    fixArms(J);
    s += fig(J, { flame: 0.33, t, mood: 'sad' });
    return s + hudT(40, { left: 9 });
  }, { cam: STAND(700) });
  // 6: đống tờ lịch xé, mỗi tờ nhốt một đốm lửa; Spark ngủ phía sau
  scene(31.5, 35, t => {
    let s = room() + bed(760, 490) + calendar(500, 300, 24, { note: 1, ember: 1 });
    const J = lieBed(780, 490); J.lh = [700, 470]; J.le = [690, 452]; J.rh = [712, 474]; J.re = [700, 458]; fixArms(J);
    s += fig(J, { flame: 0.3, t, mood: 'tired' });
    s += pile(560, 560, 22, 1, t);
    return s + hudT(34, { left: 6 });
  }, { cam: { x: 600, y: 420, k: 2.0 } });
  // 4: cận cảnh tờ lịch lật nhanh 25 → 27, mỗi tờ "tomorrow" + đốm lửa bị nhốt
  scene(35, 38.5, t => {
    const i = Math.min(2, Math.floor((t - 35) / 1.15)), p = ((t - 35) % 1.15) / 1.15;
    let s = calendar(594, 304, 25 + i, { note: ramp(p, 0.1, 0.6), ember: ramp(p, 0.65, 0.9) });
    if (p > 0.9) s += `<rect x="590" y="300" width="100" height="120" fill="#000" opacity="${(p - 0.9) * 6}"/>`;
    // tay kẻ thù viết
    const hx = lerp(608, 676, ramp(p, 0.1, 0.6));
    s += `<g filter="url(#redGlow)"><line x1="${hx}" y1="398" x2="${hx + 70}" y2="470" stroke="${RED}" stroke-width="15" stroke-linecap="round"/></g><line x1="${hx}" y1="398" x2="${hx + 70}" y2="470" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>`;
    return s + hudT(28, { left: 4 });
  }, { cam: { x: 640, y: 366, k: 2.6 } });
  // 3: giật mình tỉnh dậy, nhìn poster NOV 30
  scene(38.5, 42, t => {
    let s = room() + bed(560, 490) + poster(760, 230, 'NOV 30', { circle: 1 }) + calendar(330, 250, 27, { note: 1, ember: 1 });
    const up = ramp(t, 39.3, 40.0);
    const A = lieBed(580, 490), B = sitChair(640, 560, { look: 10 });
    const J = {}; for (const k in B) J[k] = Array.isArray(B[k]) ? mix(A[k], B[k], up) : B[k];
    fixArms(J);
    s += fig(J, { flame: 0.3, t, mood: up > 0.5 ? 'fierce' : 'tired' });
    if (t > 39.3 && t < 40.2) s += txt(J.head[0] + 30, J.head[1] - 50, '!', { size: 34, c: W, w: 900, op: fade(t, 39.3, 40.2, 0.05, 0.3) });
    return s + hudT(24, { left: 3 }) + clock(1170, 140, '2:47 AM');
  }, { cam: STAND(640) });

  // ================= 3. Cày (42–58): tập dồn, dây đứt =================
  scene(42, 58, t => {
    const left = t < 46.5 ? 3 : t < 51 ? 2 : 1;
    let s = room() + bed(560, 490) + poster(790, 262, 'NOV 30', { circle: 1 }) + calendar(330, 250, 30 - left, { note: 1, ember: 1 });
    const snap = t >= 54.5, sk = ramp(t, 54.5, 55.0);
    const strum = snap ? 0 : Math.abs(Math.sin(t * 11));
    const P = playing(640, 560, { flame: lerp(0.3, 0.18, ramp(t, 42, 56)), t, mood: snap ? 'sad' : 'fierce', strum, band: true, broken: snap ? 1 - sk * 0.5 : 0, fret: 0.5 + 0.4 * Math.sin(t * 3), lean: snap ? -10 * (1 - ramp(t, 55, 56)) : 0 });
    s += P.s;
    if (t > 54.5 && t < 55.3) s += txt(760, 380, '!', { size: 34, c: W, w: 900, op: 1 - (t - 54.5) / 0.8 });
    if (t > 55.0) s = shadowFig(whisperPose(556, 560, 1), { k: 0.95 * ramp(t, 55.0, 55.8) + 0.05, op: ramp(t, 55.0, 55.6), ax: 560, ay: 560 }) + s;
    const fire = t < 46.5 ? 22 : t < 51 ? 18 : t < 54.5 ? 15 : 12;
    return s + hudT(fire, { left }) + clock(1170, 140, t < 46.5 ? '2:47 AM' : t < 51 ? '3:30 AM' : '4:12 AM');
  }, { cam: STAND(640) });

  // ================= 4. Đáy (58–72): ngoài cửa kính quán, đêm mưa =================
  scene(58, 72, t => {
    let s = `<rect x="-400" y="-300" width="2200" height="860" fill="#0a0c12"/>` + `<rect x="-400" y="560" width="2200" height="400" fill="#101218"/>` + ln([-400, 560], [1800, 560], '#2a2e38', 3);
    // quán: cửa kính ấm
    s += `<rect x="660" y="250" width="440" height="290" fill="#3a2416" stroke="#5a4030" stroke-width="5"/>` + glow(880, 420, 300, 0.45);
    s += `<text x="880" y="290" fill="#ffb070" filter="url(#softGlow)" font-family="Inter" font-size="26" font-weight="900" letter-spacing="6" text-anchor="middle">OPEN MIC</text>`;
    s += `<g opacity=".9">` + `<path d="M840,250 L790,520 L970,520 L920,250Z" fill="#ffd9a0" opacity=".12"/>` + `<g transform="translate(880,520) scale(.62) translate(-880,-560)">` + playing(860, 560, { t, mood: 'happy', strum: Math.abs(Math.sin(t * 6)) }).s.replace(new RegExp(SKIN, 'g'), '#b9a58a') + '</g>';
    for (let i = 0; i < 7; i++) s += `<circle cx="${700 + i * 58}" cy="${528 + 3 * Math.sin(t * 3 + i)}" r="16" fill="#1a120c"/>`;
    s += '</g>' + `<rect x="660" y="250" width="440" height="290" fill="#9ab" opacity=".06"/>` + ln([880, 250], [880, 540], '#5a4030', 4);
    // ánh đèn hắt ra vỉa hè, không chạm tới Spark
    s += `<path d="M660,540 L1100,540 L1180,640 L700,640Z" fill="#ffb070" opacity=".08"/>`;
    // bóng Spark phản chiếu trên kính → kẻ thù mọc từ đó
    const leave = ramp(t, 67.6, 71.8), x = lerp(520, 300, leave);
    const born = ramp(t, 63.4, 64.6);
    s += `<g opacity="${0.22 * (1 - born)}">` + flip(700, fig(stand(700, 560, { look: 8 }), { c: '#556' })) + '</g>';
    if (born > 0 && t < 70) s += shadowFig(whisperPose(700, 560, -1), { k: 0.9 + 0.1 * born, op: born * (1 - ramp(t, 68.5, 69.5)) });
    let J;
    if (leave <= 0) { J = stand(520, 560, { look: 8 }); J.head = [J.head[0] + 4, J.head[1] + 6]; s += fig(J, { flame: lerp(0.16, 0.05, ramp(t, 64.6, 66.8)), t, mood: 'sad' }); }
    else { J = walk(x, 560, t * 4); s += flip(x, fig(J, { flame: 0.05, t, mood: 'sad' })); }
    s += `<rect x="-400" y="-300" width="1060" height="1400" fill="#203050" opacity=".18"/>` + rain(t, 100, 1300, 120, 640);
    return s + hudT(t < 66.8 ? 12 : 5, { left: 0 });
  }, { cam: t => ({ ...STAND(700), x: 700 - 60 * ramp(t, 67.6, 71.8) }) });

  // ================= 5. Bước ngoặt (72–86) =================
  const CAL5 = [358, 292], PEN = [430, 388];
  scene(72, 82.4, t => {
    let s = room() + dark(0) + bed(640, 490) + poster(820, 220, 'NOV 30', { circle: 1, op: 0.6 });
    const torn = t > 74.4, tearK = ramp(t, 73.6, 74.4);
    s += calendar(CAL5[0], CAL5[1], torn ? 1 : 30, { month: torn ? 'DEC' : 'NOV', note: torn ? 0 : 1 });
    if (!torn) s += `<rect x="${CAL5[0]}" y="${CAL5[1]}" width="92" height="112" fill="#000" opacity="${0.15 * tearK}"/>`;
    // tờ NOV 30 rơi xuống đống
    if (t > 74.4 && t < 76) { const k = ramp(t, 74.4, 76); s += `<g transform="translate(${CAL5[0] + 46 - 60 * k},${CAL5[1] + 56 + 200 * k}) rotate(${-200 * k})"><rect x="-30" y="-36" width="60" height="72" fill="${PAPER}" stroke="#8a7d68"/></g>`; }
    s += pile(300, 560, 30, 1, t);
    // Spark: bước tới, xé lịch, rồi giành cây bút
    const step = ramp(t, 76.6, 77.2), sx = lerp(300, 362, step);
    const J = stand(sx, 560, { look: 8 });
    if (t < 74.8) { const k = ramp(t, 73.0, 73.6); J.lh = mix(J.lh, [CAL5[0] + 10, CAL5[1] + 100 + 30 * tearK], k); J.le = mix(J.le, [sx + 30, 450], k); }
    const grab = ramp(t, 77.0, 77.5);
    if (grab > 0) { J.lh = mix(J.lh, PEN, grab); J.le = mix(J.le, [sx + 36, 440], grab); }
    fixArms(J);
    const has = t > 77.6;
    // kẻ thù mọc từ đống lịch, cầm bút định viết
    const born = ramp(t, 75.0, 76.4), gone = ramp(t, 77.8, 78.8);
    let E = null;
    if (born > 0 && gone < 1) {
      E = whisperPose(510, 560, -1);
      const reach = ramp(t, 76.2, 76.9);
      E.lh = mix(E.lh, PEN, reach); E.le = mix(E.le, [470, 420], reach);
      if (has) { E.lh = mix(PEN, [500, 420], ramp(t, 77.6, 78.2)); }
      s += shadowFig(E, { k: 0.15 + 0.85 * born, op: born * (1 - gone), ax: lerp(320, 510, born), ay: 560, jitter: has ? 6 * (1 - gone) : 0 });
    }
    const penAt = has ? J.lh : (E && born > 0.9 ? fixArms(E).lh : null);
    const fire = t < 77.6 ? 5 : 8;
    s += fig(J, { flame: lerp(0.05, 0.12, ramp(t, 77.6, 78.4)), t, mood: t > 76.4 ? 'fierce' : 'sad' });
    if (penAt) s += ln(penAt, [penAt[0] + 20, penAt[1] - 22], '#d8d0c0', 4) + ln(penAt, [penAt[0] - 4, penAt[1] + 5], INKP, 4) + (has ? handDot(J.lh) : '');
    if (t > 77.6 && t < 78.7) { const q = (t - 77.6) / 1.1; s += `<text x="${J.head[0] + 70}" y="${J.head[1] + 20 - 26 * q}" fill="${ORANGE}" fill-opacity="${1 - q}" filter="url(#softGlow)" font-family="${MONO}" font-size="15" font-weight="700">+3%</text>`; }
    // từ khoá: TOMORROW (xám) → MORROW rơi → DAY vàng trượt vào → TODAY bay vào góc phải
    if (t > 78.4) {
      const o = fade(t, 78.4, 82.4, 0.3, 0.01), fall = ramp(t, 79.4, 80.4), slide = ramp(t, 80.4, 81.0), fly = ramp(t, 81.5, 82.3);
      const cx = lerp(880, 1150, fly), cy = lerp(300, 66, fly), fs = lerp(64, 22, fly);
      let k = `<text x="${cx - (slide > 0 ? 0 : 0)}" y="${cy}" fill="${slide > 0.5 ? YEL : '#9a968e'}" ${slide > 0.5 ? 'filter="url(#yelGlow)"' : ''} font-family="Inter" font-size="${fs}" font-weight="900" letter-spacing="${lerp(8, 2, fly)}" text-anchor="end">TO</text>`;
      'MORROW'.split('').forEach((ch, i) => { const d = clamp(fall * 1.6 - i * 0.12); k += `<text x="${cx + 8 + i * fs * 0.78}" y="${cy + 260 * d * d}" fill="#9a968e" fill-opacity="${(1 - d) * (1 - fly)}" font-family="Inter" font-size="${fs}" font-weight="900" transform="rotate(${40 * d} ${cx + 8 + i * fs * 0.78} ${cy})">${ch}</text>`; });
      if (slide > 0) k += `<text x="${cx + 8 + 260 * (1 - slide)}" y="${cy}" fill="${YEL}" fill-opacity="${slide}" filter="url(#yelGlow)" font-family="Inter" font-size="${fs}" font-weight="900" letter-spacing="${lerp(8, 2, fly)}">DAY</text>`;
      s += ui(`<g opacity="${o}">${k}</g>`);
    }
    return s + hudT(fire, t < 82 ? { left: 0 } : { today: 1 }, 1);
  }, { cam: t => ({ ...STAND(440), k: 1.6 + 0.3 * ramp(t, 76.4, 77.6) * (1 - ramp(t, 78.2, 78.8)) }) });
  // lôi đàn ra, một hợp âm đúng; những đốm lửa bị nhốt bay về ngực
  scene(82.4, 86, t => {
    let s = room() + bed(560, 490) + calendar(330, 250, 1, { month: 'DEC' }) + pile(300, 560, 30, 1 - ramp(t, 84.6, 85.6), t);
    const strum = t > 84.4 && t < 84.8 ? (t - 84.4) / 0.4 : t >= 84.8 ? 1 : 0;
    const fl = lerp(0.12, 0.36, ramp(t, 84.5, 85.8));
    const P = playing(640, 560, { flame: fl, t, mood: t > 84.5 ? 'happy' : 'fierce', strum, broken: 0 });
    s += P.s;
    const fp = flamePos(P.J);
    if (t > 84.6) PILE_PTS(300, 560, 30).forEach((p, i) => { const k = clamp((t - 84.6 - i * 0.025) / 0.9); if (k > 0 && k < 1) { const q = mix(p, fp, k * k); s += `<circle cx="${q[0]}" cy="${q[1] - 60 * Math.sin(k * Math.PI)}" r="3" fill="${CORE}" opacity="${1 - k * 0.4}"/>`; } });
    if (t > 84.5 && t < 86) s += glow(fp[0], fp[1], 80 + 160 * ramp(t, 84.5, 85.2), 0.35 * (1 - ramp(t, 85.2, 86)));
    return s + hudT(t < 84.5 ? 8 : t < 85.6 ? 12 : 18, { today: 1 });
  }, { cam: STAND(560) });

  // ================= 6. Montage TODAY (86–118) =================
  scene(86, 90.5, t => {
    let s = room() + bed(560, 490) + calendar(330, 250, 1, { month: 'DEC', tick: ramp(t, 86.4, 87) }) + timer(760, 476, 900 - (t - 86) * 3);
    const beat = ((t - 86) % 1.1) / 1.1;
    s += playing(640, 560, { flame: 0.42, t, mood: 'neutral', strum: beat < 0.3 ? beat / 0.3 : 1 }).s;
    return s + hudT(22, { today: 1 });
  }, { cam: STAND(600) });
  scene(90.5, 95, t => {
    let s = room() + bed(560, 490);
    s += playing(640, 560, { flame: 0.5, t, mood: 'fierce', strum: Math.abs(Math.sin(t * 6)), band: true, fret: 0.3 + 0.3 * Math.sin(t * 2) }).s;
    s = shadowFig(whisperPose(500, 560, 1), { k: lerp(0.7, 0.3, ramp(t, 92.6, 94.2)), op: fade(t, 90.8, 94.4, 0.4, 0.5), ax: 500, ay: 560 }) + s;
    return s + hudT(34, { today: 6 });
  }, { cam: { x: 690, y: 430, k: 2.4 } });
  scene(95, 100, t => {
    let s = room() + bed(460, 490);
    s += playing(560, 560, { flame: 0.62, t, mood: 'happy', strum: Math.abs(Math.sin(t * 6.5)) }).s;
    // Ember gõ thùng nhựa
    const hit = Math.abs(Math.sin(t * 6.5));
    const E = sitChair(840, 560, { look: 8 }); E.face = 1;
    E.lh = [880, 470 + 20 * hit]; E.rh = [890, 476 + 20 * (1 - hit)]; E.le = [866, 452]; E.re = [872, 456];
    fixArms(E);
    let em = stool(840, 560) + `<path d="M900,560 L906,504 L954,504 L960,560Z" fill="#3b5bd6" stroke="#22388a" stroke-width="3"/>` + fig(E, { c: '#d9cfc0', mood: 'happy' }) + cap(E);
    em += ln(E.lh, [E.lh[0] + 28, E.lh[1] + 26 - 22 * hit], WOOD, 4) + ln(E.rh, [E.rh[0] + 26, E.rh[1] + 26 - 22 * (1 - hit)], WOOD, 4);
    s += flip(900, em.replace(/translate\(/, 'translate('));
    return s + hudT(48, { today: 13 });
  }, { cam: STAND(720) });
  scene(100, 105, t => {
    let s = room() + bed(560, 490) + calendar(330, 250, 24, { month: 'DEC', tick: 1 });
    s += playing(640, 560, { flame: 0.74, t, mood: 'fierce', strum: Math.abs(Math.sin(t * 8)), fret: Math.floor((t - 100) * 2) % 3 / 2 }).s;
    s = shadowFig(whisperPose(470, 560, 1), { k: lerp(0.5, 0.05, ramp(t, 102, 104.4)), op: fade(t, 100.3, 104.6, 0.3, 0.4), ax: 470, ay: 560 }) + s;
    return s + hudT(60, { today: 24 });
  }, { cam: STAND(600) });
  scene(105, 111, t => {
    let s = `<defs><linearGradient id="skyBal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a2e"/><stop offset=".6" stop-color="#b8603a"/><stop offset="1" stop-color="#f0a860"/></linearGradient></defs>`;
    s += `<rect x="-400" y="-200" width="2200" height="760" fill="url(#skyBal)"/>` + glow(980, 470, 300, 0.5) + `<circle cx="980" cy="470" r="40" fill="#ffd9a0"/>`;
    for (let i = 0; i < 16; i++) { const bx = -100 + i * 110, bh = 80 + 120 * rnd(i + 2); s += `<rect x="${bx}" y="${560 - bh}" width="90" height="${bh}" fill="#3a2028" opacity=".8"/>`; }
    s += `<rect x="-400" y="560" width="2200" height="300" fill="#1c1418"/>` + ln([-400, 500], [780, 500], '#5a4a48', 5);
    for (let i = 0; i < 24; i++) s += ln([-200 + i * 40, 500], [-200 + i * 40, 560], '#5a4a48', 3);
    s += stool(600, 560) + playing(600, 560, { flame: 0.86, t, mood: 'happy', strum: Math.abs(Math.sin(t * 6.5)), hy: 80 }).s;
    // em bé nhà bên gật gù
    s += ln([860, 500], [1200, 500], '#5a4a48', 5) + ln([830, 380], [830, 560], '#2a1e22', 6);
    const K = stand(960, 560, { look: -8 }); K.face = -1; K.head = [K.head[0], K.head[1] + 6 * Math.sin(t * 6.5)];
    s += `<g transform="translate(960,560) scale(.68) translate(-960,-560)">` + fig(K, { c: '#d9cfc0', mood: 'happy' }) + '</g>';
    for (let i = 0; i < 3; i++) { const k = ((t * 0.5 + i / 3) % 1); s += `<path d="M${700 + 120 * k},${400 - 90 * k} q6,-10 10,0 v-18" fill="none" stroke="#f4e8d0" stroke-width="2.5" opacity="${1 - k}"/>`; }
    return s + hudT(75, { today: 38 });
  }, { cam: STAND(740, 1.45) });
  scene(111, 118, t => {
    let s = room() + `<rect x="560" y="200" width="420" height="300" fill="#2a2420" stroke="#5a4a40" stroke-width="5"/>`;
    s += poster(600, 240, 'JAN 15') + `<rect x="760" y="236" width="150" height="200" fill="${PAPER}" stroke="#8a7d68" stroke-width="2" transform="rotate(2 835 336)"/>` + txt(835, 262, 'SIGN UP', { size: 15, c: INKP, w: 900, ls: 2 });
    const names = ['Mia', 'J. Tran', 'Leo'];
    names.forEach((n, i) => { s += ln([776, 290 + i * 30], [896, 290 + i * 30], '#b9ab98', 1.5) + `<text x="784" y="${286 + i * 30}" fill="#3a3a5a" font-family="Inter" font-size="15" font-style="italic">${n}</text>`; });
    s += ln([776, 380], [896, 380], '#b9ab98', 1.5);
    const w = ramp(t, 113.0, 115.2), id = `sgn${CLIPN++}`;
    s += `<clipPath id="${id}"><rect x="780" y="356" width="${110 * w}" height="30"/></clipPath><text clip-path="url(#${id})" x="784" y="376" fill="${INKP}" font-family="Inter" font-size="17" font-weight="700" font-style="italic">Spark</text>`;
    const J = stand(700, 560, { look: 10 });
    const pen = [lerp(788, 840, w) + 2 * Math.sin(t * 25) * (w > 0 && w < 1 ? 1 : 0), 372];
    J.lh = pen; J.le = [722, 424];
    fixArms(J);
    s += guitar(560, 520, -100, 0.95) + fig(J, { flame: 0.94, t, mood: t > 115.4 ? 'happy' : 'fierce' });
    s += ln(pen, [pen[0] + 20, pen[1] - 22], '#d8d0c0', 4) + handDot(J.lh);
    return s + hudT(85, { today: 45 });
  }, { cam: STAND(760) });

  // ================= 7. Trận cuối (118–132): hậu trường JAN 15 =================
  // Không lao qua bóng. Kẻ thù chắn lối ra sân khấu; Spark nhắm mắt, ngón tay tự bấm hợp âm đã tập;
  // rồi bước đều từng bước — mỗi bước là một ngày đã luyện (DAY 1, 6, 13, 24, 38) sáng lên dưới chân và làm bóng nứt thêm;
  // lặng một nhịp, bước cuối DAY 45 → bóng vỡ.
  const STEPS = [[127.4, 1], [128.2, 6], [129.0, 13], [129.8, 24], [130.6, 38], [131.3, 45]]; // bước 30 px: 520 → 700
  const stepsDone = t => STEPS.reduce((n, [ts]) => n + ramp(t, ts, ts + 0.45), 0);
  const XB = t => 520 + 30 * stepsDone(t);
  const CRACKS = [
    [[0, -150], [-14, -120], [6, -96], [-8, -70]], [[18, -60], [4, -30], [22, -6], [10, 24]], [[-20, -10], [-4, 14], [-24, 40], [-10, 70]],
    [[30, -200], [10, -176], [26, -150]], [[-30, -186], [-10, -160], [-26, -130], [-6, -110]], [[0, 40], [16, 70], [0, 100], [14, 130]],
  ];
  scene(118, 132, t => {
    let s = `<rect x="-400" y="-300" width="2200" height="860" fill="#0c0a10"/>` + ground(-400, 1800, 560, 0.8);
    // màn sân khấu + ánh đèn từ phải
    s += `<rect x="800" y="120" width="60" height="440" fill="#2a1830"/>` + `<path d="M860,120 L1500,120 L1500,560 L860,560Z" fill="#f0d8a8" opacity=".22"/>` + glow(1120, 360, 420, 0.4);
    s += txt(640, 230, 'JAN 15', { size: 16, c: '#6a6460', w: 700, ls: 3 });
    const rise = ramp(t, 121.5, 123), broke = t >= 131.8, shatter = ramp(t, 131.8, 133);
    const x = XB(t), n = stepsDone(t);
    // bóng Spark trên tường do đèn sân khấu → kẻ thù mọc từ đó rồi ra chắn lối đi
    s += `<g opacity="${0.5 * (1 - rise)}">` + `<g transform="translate(${x - 150},560) scale(1.3,1.15) translate(${-(x - 150)},-560)">` + bodyShapes(stand(x - 150, 560), '#000', '#000', 0, '#000') + '</g></g>';
    // tan vào bóng tối rồi trồi lên lại trước ánh đèn (không trượt xuyên qua Spark)
    const front = t >= 123.3, ex = front ? 830 : 380, edir = front ? -1 : 1;
    const ek = front ? lerp(0.3, 1.5, ramp(t, 123.4, 124.2)) : lerp(0.9, 1.5, rise);
    const eop = front ? ramp(t, 123.4, 123.9) : 1 - ramp(t, 122.9, 123.3);
    const shake = STEPS.some(([ts]) => t > ts + 0.35 && t < ts + 0.6) ? 4 : 0;
    if (t < 133) {
      s += shadowFig(whisperPose(ex, 560, edir), { k: ek, op: eop * (broke ? 1 - shatter : 1) * ramp(t, 121.4, 122.2), jitter: broke ? 30 * (1 - shatter) : shake, ax: ex, ay: 560 });
      // vết nứt vàng trên thân bóng, thêm một vết mỗi bước
      for (let i = 0; i < Math.min(CRACKS.length, Math.floor(n + 0.05)); i++) {
        const pts = CRACKS[i].map(([dx, dy]) => [ex + dx * ek * 0.8, 560 + (dy - 180) * ek * 0.55 + 80 * ek * 0.55].join(',')).join(' ');
        s += `<polyline points="${pts}" fill="none" stroke="${YEL}" stroke-width="${3 + i * 0.4}" stroke-linecap="round" stroke-linejoin="round" filter="url(#yelGlow)" opacity="${broke ? 1 - shatter : 0.9}"/>`;
      }
    }
    // những ngày đã luyện tập sáng lên dưới chân
    STEPS.forEach(([ts, day], i) => {
      const o = ramp(t, ts + 0.35, ts + 0.55); if (o <= 0) return;
      const fx = 520 + 30 * (i + 1) + 18;
      s += `<ellipse cx="${fx}" cy="561" rx="15" ry="4" fill="${YEL}" opacity="${0.8 * o}" filter="url(#yelGlow)"/>`;
      s += `<text x="${fx}" y="${582 + (i % 2) * 14}" fill="${YEL}" fill-opacity="${o}" font-family="${MONO}" font-size="10" font-weight="700" text-anchor="middle">DAY ${day}</text>`;
    });
    let fl = 0.95; fl = lerp(fl, 0.4, ramp(t, 122, 125.6)); fl = lerp(fl, 0.55, ramp(t, 125.8, 127.2)); fl += 0.16 * n;
    const tremble = t < 125.8 ? Math.sin(t * 40) * 2 : 0;
    const walking = STEPS.some(([ts]) => t > ts && t < ts + 0.45);
    let J = walking ? walk(x, 560, Math.PI * n) : stand(x, 560, { look: 10 });
    J.lh = [J.hip[0] + 28 + tremble, 451]; J.le = [J.hip[0] + 22, 480];
    // nhắm mắt, ngón tay tự bấm các thế hợp âm đã tập
    const practice = t > 125.8 && t < 127.3;
    if (practice) J.lh = [J.hip[0] + 28, 451 - 8 * (Math.floor((t - 125.8) * 3) % 3)];
    fixArms(J);
    const gp = [J.lh[0] + 12, J.lh[1] + 70];
    const mood = practice ? 'tired' : t > 127.3 ? 'fierce' : 'sad';
    s += guitar(gp[0], gp[1], -100) + fig(J, { flame: fl, t, mood }) + handDot(J.lh) + frontArm(J);
    if (broke) { const w = shatter; s += `<circle cx="${x + 60}" cy="440" r="${60 + 1100 * w}" fill="none" ${st(YEL, 8, 0.7 * (1 - w))}/>`; for (let i = 0; i < 14; i++) { const a = i * 0.45; s += `<rect x="${ex + Math.cos(a) * 260 * w}" y="${430 + Math.sin(a) * 200 * w + 120 * w * w}" width="${14 * (1 - w)}" height="${10 * (1 - w)}" fill="${INK}" stroke="${RED}" stroke-width="1.5" transform="rotate(${200 * w * (i % 2 ? 1 : -1)} ${ex} 430)"/>`; } }
    if (t > 131.8 && t < 132) s += ui(`<rect width="1280" height="720" fill="#fff" opacity=".85"/>`);
    return s;
  }, { fo: 0.01, cam: t => {
    const wide = ramp(t, 121.5, 124) * (1 - ramp(t, 125.6, 126)), face = ramp(t, 125.8, 126.4) * (1 - ramp(t, 127.1, 127.4));
    let k = 1.6 - 0.35 * wide, x = lerp(560, 640, wide), y = 560 - 250 / k;
    if (face > 0) { k = lerp(k, 2.6, face); x = lerp(x, XB(t) + 20, face); y = lerp(560 - 250 / k, 400, face); }
    if (t > 127.4) { k = 1.45; x = lerp(XB(t), 830, 0.4); y = 560 - 250 / k; }
    return { x, y, k };
  } });

  // ================= 7b + 8. Sân khấu: bước ra, ngồi, chơi (132–152) =================
  scene(132, 152, t => {
    let s = `<rect x="-400" y="-300" width="2200" height="1200" fill="#0b0910"/>` + `<rect x="160" y="540" width="960" height="40" fill="#2a2024"/>`;
    s += `<path d="M560,60 L720,60 L900,560 L380,560Z" fill="#f0d8a8" opacity="${0.16 + 0.06 * ramp(t, 140, 141)}"/>` + glow(640, 480, 320, 0.35);
    s += stool(640, 540);
    const walkK = ramp(t, 132.2, 135.8), sit = ramp(t, 135.8, 136.8);
    let fl = lerp(1.1, 0.8, ramp(t, 132, 134)); if (t > 140) fl = lerp(0.8, 1.3, ramp(t, 140, 146));
    if (sit <= 0) {
      const x = lerp(380, 600, walkK), J = walkK < 1 ? walk(x, 540, t * 6) : stand(x, 540, { look: 10 });
      J.lh = [J.hip[0] + 28, 431]; J.le = [J.hip[0] + 22, 460]; fixArms(J);
      s += guitar(J.lh[0] + 12, J.lh[1] + 70, -100) + fig(J, { flame: fl, t, mood: 'fierce' }) + handDot(J.lh) + frontArm(J);
    } else {
      const playOn = t > 140, beat = (t - 140) * 2;
      s += playing(640, 540, { flame: fl, t, mood: t > 139 ? 'happy' : 'fierce', strum: playOn ? Math.abs(Math.sin(beat * Math.PI)) : 0, hy: 80, blink: (t % 3.7) < 0.12 }).s;
    }
    // khán giả (tiền cảnh) — Ember mũ vàng hàng đầu
    for (let i = 0; i < 9; i++) {
      const hx = 200 + i * 112, bob = t > 140 ? 5 * Math.sin((t - 140) * 2 * Math.PI + i) : 0, isE = i === 4;
      const hy = 612 + bob - (isE && t > 149.6 ? 30 * ramp(t, 149.6, 150.2) : 0);
      s += `<circle cx="${hx}" cy="${hy}" r="34" fill="${isE ? '#3a3430' : '#18141a'}"/>` + `<rect x="${hx - 40}" y="${hy + 24}" width="80" height="80" rx="30" fill="${isE ? '#3a3430' : '#18141a'}"/>`;
      if (isE) s += `<path d="M${hx - 33},${hy - 8} Q${hx},${hy - 50} ${hx + 33},${hy - 8}Z" fill="${GOLD}"/>`;
    }
    if (t > 149.6) for (let i = 0; i < 10; i++) { const k = ((t - 149.6) * 0.8 + i / 10) % 1; s += `<circle cx="${300 + i * 70}" cy="${600 - 140 * k}" r="${2.5 * (1 - k)}" fill="${CORE}" opacity="${1 - k}"/>`; }
    return s;
  }, { cam: t => ({ x: 640, y: 405, k: lerp(1.12, 1.32, ramp(t, 138, 152)) }) });

  // ================= 9. Tấm gương + tên phim (152–165) =================
  scene(152, 159.6, t => {
    let s = `<rect x="-400" y="-300" width="2200" height="1200" fill="#14100c"/>` + `<path d="M900,120 L1100,120 L860,600 L560,600Z" fill="#ffd9a0" opacity=".06"/>`;
    s += calendar(594, 292, 16, { month: 'JAN' }) + ln([686, 300], [712, 390], '#8a7d68', 1.5) + ln([712, 390], [722, 412], '#d8d0c0', 4);
    s += ui(txt(640, 150, 'Tomorrow is where dreams wait.', { size: 40, w: 600, op: fade(t, 152.6, 159.4, 0.8, 0.6) }) +
      `<text x="640" y="600" fill="${YEL}" fill-opacity="${fade(t, 155.6, 159.4, 0.6, 0.6)}" filter="url(#yelGlow)" font-family="Inter" font-size="48" font-weight="800" text-anchor="middle">Today is where they live.</text>`);
    return s;
  }, { fo: 0.8, cam: t => ({ x: 640, y: 348, k: lerp(1.9, 2.1, ramp(t, 152, 159.6)) }) });
  scene(159.6, 165, t => {
    let s = `<text x="640" y="360" fill="${YEL}" fill-opacity="${fade(t, 160.0, 164.4, 0.8, 0.8)}" filter="url(#yelGlow)" font-family="Inter" font-size="88" font-weight="800" letter-spacing="18" text-anchor="middle">TOMORROW</text>`;
    s += txt(640, 410, 'an animated short film', { size: 22, c: MUTED, ls: 6, op: fade(t, 160.6, 164.4, 0.8, 0.8) });
    s += flame(640, 520, 0.32, t, fade(t, 161.0, 164.4, 0.6, 0.8)) + txt(640, 572, 'Keep the fire.', { size: 20, c: ORANGE, w: 600, ls: 4, op: fade(t, 161.4, 164.4, 0.6, 0.8) });
    return s;
  }, { fo: 0.01 });

  // ---------- lời thì thầm: [giây, câu, thời lượng] ----------
  const WH = [
    [6.0, 'tomorrow.', 2.3],
    [14.4, "you'll feel it tomorrow"],
    [21.4, 'first, clean up'],
    [25.0, "they're just born talented", 2.3],
    [55.6, 'too late now.'],
    [65.2, "there's always tomorrow.", 2.6],
    [91.0, 'skip today', 1.8],
    [100.6, "tomorrow's fine", 1.8],
    [122.4, "you'll freeze", 2.2], [123.4, 'go home', 2.0], [124.4, 'next time', 1.8], [125.3, 'tomorrow.', 1.6],
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
  window.KIT = { fig, shadowFig, flame, glow, txt, stand, slump, sitChair, whisperPose, playing, guitar, calendar, poster, pile, rain, cap, DEFS, MONO, C: { W, BG, MUTED, ORANGE, CORE, RED, YEL, SKIN, COLD } };
  window.DURATION = DUR;
  window.WHISPERS = WH;
  const SHAKES = [[54.5, 0.3, 6], [131.8, 0.7, 16]];
  window.frame = function (t) {
    let body = '';
    ENEMY = null;
    CLIPN = 0;
    const seed = Math.floor(t * 8) % 9; // nét rung vẽ lại mỗi 3 khung
    const defs = DEFS.replace('seed="4"', `seed="${seed + 1}"`).replace('seed="77"', `seed="${seed + 30}"`);
    for (const sc of S) {
      if (t < sc.a || t >= sc.b) continue;
      const o = Math.min(clamp((t - sc.a) / sc.fi), clamp((sc.b - t) / sc.fo));
      const c0 = typeof sc.cam === 'function' ? sc.cam(t) : (sc.cam || { x: 640, y: 360, k: 1 });
      const push = sc.a === 118 || sc.a === 72 ? 1 : 1 + 0.08 * clamp((t - sc.a) / (sc.b - sc.a)); // camera không bao giờ ngủ
      let sx = 0, sy = 0;
      for (const [ts, dur, amp] of SHAKES) if (t >= ts && t < ts + dur) { const e = 1 - (t - ts) / dur; sx += Math.sin(t * 97) * amp * e; sy += Math.cos(t * 83) * amp * e; }
      CAM = { x: c0.x + sx / (c0.k * push), y: c0.y + sy / (c0.k * push), k: c0.k * push };
      body += `<g opacity="${o}"><g transform="translate(640,360) scale(${CAM.k}) translate(${-CAM.x},${-CAM.y})">${sc.fn(t)}</g></g>`;
    }
    body += whispers(t);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1280 720">${defs}<rect width="1280" height="720" fill="${BG}"/>${body}<rect width="1280" height="720" filter="url(#grain)" opacity=".5"/>` +
      `<rect width="1280" height="720" fill="url(#vig)"/><rect width="1280" height="36" fill="#000"/><rect y="684" width="1280" height="36" fill="#000"/></svg>`;
  };
})();
