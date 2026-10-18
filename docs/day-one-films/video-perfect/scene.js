// PERFECT — vẽ khung hình tại thời điểm t (giây). Chạy trong trình duyệt: window.frame(t) → chuỗi SVG. Bộ nhân vật lấy từ SCROLL.
(function () {
  const W = '#f4f1ea', BG = '#0d0a09', MUTED = '#8d8a84', GREY = '#55534f';
  const ORANGE = '#ff8a1f', CORE = '#ffd166', EMBER = '#7a4a22', SMOKE = '#3a3a3a', COLD = '#bcd7ff';
  const DUR = 161;

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
  const room = (g = 560) => ground(-200, 1500, g, 0.6);
  const dark = (o) => o > 0 ? `<rect x="-400" y="-300" width="2200" height="1400" fill="#000" opacity="${o}"/>` : '';

  // ================= PERFECT =================
  const GRAPH = '#3a3632', CRAY = ['#e8853a', '#d9b23c', '#5b8fd6', '#6aa860'], PINC = '#c9a24a', ERASER = '#e6e2ec';
  // ---------- tranh: mỗi bức kể một điều. Toạ độ trong khung 100×70 ----------
  const BIRD = [ // ước mơ của Spark: con chim dang cánh
    'M30,42 Q50,31 70,39 Q55,50 30,42Z', 'M80,34 A6,6 0 1,1 79.9,33.9', 'M80,33 L89,35 L80,37',
    'M44,38 Q38,12 18,6 Q34,22 54,36', 'M54,37 Q62,16 80,12 Q68,27 60,38', 'M30,42 L15,35 M30,42 L14,43 M30,42 L18,50', 'M75,32 l.6,0',
  ];
  const SUN = ['M64,35 A14,14 0 1,1 63.9,34.9', ...Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `M${50 + Math.cos(a) * 19},${35 + Math.sin(a) * 19} L${50 + Math.cos(a) * 29},${35 + Math.sin(a) * 29}`; }), 'M44,38 Q50,44 56,38', 'M45,31 l.6,0 M55,31 l.6,0'];
  const KITE = ['M66,6 L78,20 L66,36 L54,20Z', 'M66,6 L66,36 M54,20 L78,20', 'M66,36 Q60,46 66,54 Q72,60 64,66', 'M64,44 l-4,-3 l0,6z M66,54 l4,-3 l0,6z', 'M66,36 L24,50',
    'M24,46 A5,5 0 1,1 23.9,45.9', 'M24,55 L24,66 M24,58 L30,52 M24,66 L20,70 M24,66 L28,70', 'M18,44 q-4,4 -2,8 M30,44 q4,4 2,8'];
  const FLOWER = ['M50,68 Q48,50 50,34', 'M50,56 Q40,50 36,54 Q42,58 50,56 M50,50 Q60,44 64,48 Q58,52 50,50',
    ...Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3, cx = 50 + Math.cos(a) * 9, cy = 26 + Math.sin(a) * 9; return `M${cx + 6},${cy} A6,6 0 1,1 ${cx + 5.9},${cy - 0.1}`; }), 'M54,26 A4,4 0 1,1 53.9,25.9'];
  const WINBIRD = ['M8,18 L44,18 L44,66 L8,66Z', 'M26,18 L26,66 M8,42 L44,42', 'M44,18 Q50,30 44,40', // khung cửa sổ, rèm bay
    ...BIRD.map(p => p.replace(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g, (m, x, y) => `${(+x * 0.6 + 40).toFixed(1)},${(+y * 0.6 + 2).toFixed(1)}`))];
  const ART = { bird: BIRD, sun: SUN, kite: KITE, flower: FLOWER, winbird: WINBIRD };
  // vẽ tranh: p 0..1 = hiện dần từng nét; ghost = vết tẩy mờ; col = màu nét (chì / sáp màu); w = độ dày
  function art(name, x, y, k, p = 1, o = {}) {
    const P = ART[name], n = P.length;
    let s = `<g transform="translate(${x},${y}) scale(${k})" fill="none" stroke-linecap="round" stroke-linejoin="round">`;
    if (o.ghost) s += `<g opacity="${o.ghost}" stroke="#8a8478" stroke-width="${(o.w || 1.6) * 2.2}">` + P.map(d => `<path d="${d}"/>`).join('') + '</g>';
    P.forEach((d, i) => {
      const q = clamp(p * n - i); if (q <= 0) return;
      const c = Array.isArray(o.col) ? o.col[i % o.col.length] : (o.col || GRAPH);
      s += `<path d="${d}" stroke="${c}" stroke-width="${o.w || 1.6}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${1 - q}"/>`;
    });
    return s + '</g>';
  }
  // bảng vẽ dựng nghiêng trên bàn, mặt quay ra camera
  function board(x, y, inner, o = {}) {
    const w = 132, h = 96;
    let s = ln([x + w * 0.5, y + h], [x + w * 0.5 + 18, y + h + 26], WOOD, 4);
    s += `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="3" fill="#6a5038"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#efe7d6"/>`;
    if (o.smudge) for (let i = 0; i < Math.round(o.smudge * 14); i++) s += `<ellipse cx="${x + 20 + rnd(i) * (w - 40)}" cy="${y + 16 + rnd(i + 7) * (h - 32)}" rx="${8 + 10 * rnd(i + 3)}" ry="${4 + 5 * rnd(i + 5)}" fill="#8a8478" opacity="${0.08 + 0.1 * o.smudge}"/>`;
    if (o.hole) s += `<path d="M${x + 76},${y + 30} l8,4 l-2,8 l6,6 l-8,4 l-6,-6 l-6,2Z" fill="#2a2420" opacity="${o.hole}"/>`;
    return s + `<g clip-path="none">${inner}</g>`;
  }
  const B0 = [690, 330]; // góc trái trên của bảng trên bàn
  const onBoard = (name, p, o = {}) => art(name, B0[0] + 16, B0[1] + 12, 1.0, p, { w: 2.8, ...o });
  // đầu bút/tẩy trên bảng theo tiến độ nét vẽ (xấp xỉ vị trí nét đang vẽ)
  const tipAt = (p, t) => [B0[0] + 30 + 60 * ((p * 7) % 1) + 4 * Math.sin(t * 20), B0[1] + 30 + 30 * Math.abs(Math.sin(p * 9))];
  function pencilIn(J, tip, kind = 'pencil') {
    const h = J.lh, d = unitv(h, tip), back = addv(h, d, -8);
    if (kind === 'eraser') return `<g transform="rotate(${Math.atan2(d[1], d[0]) * 180 / Math.PI} ${h[0]} ${h[1]})"><rect x="${h[0] - 4}" y="${h[1] - 7}" width="26" height="14" rx="3" fill="${ERASER}" stroke="#8a8aa0" stroke-width="1.5"/><rect x="${h[0] + 6}" y="${h[1] - 7}" width="7" height="14" fill="#5b7fc0"/></g>` + handDot(h);
    return ln(back, tip, '#e8b04a', 5) + ln(addv(tip, d, -6), tip, GRAPH, 3) + handDot(h);
  }
  // Spark ngồi bàn vẽ; act: 'draw' | 'erase' | 'rest'
  function deskScene(t, o = {}) {
    let s = (o.window ? windowView(430, 220, o.window, t) : '') + room() + desk(760, 560) + chair(640, 560) + lamp(470, 560, o.lampOff ? 0 : 1);
    s += board(B0[0], B0[1], o.inner || '', { smudge: o.smudge || 0, hole: o.hole || 0 });
    if (o.crumbs) s += crumbs(780, 428, o.crumbs);
    if (o.bin !== undefined) s += bin(560, 560, o.bin);
    const J = sitChair(640, 560, { look: 10 });
    const tip = o.tip || tipAt(o.p || 0, t);
    if (o.act === 'draw' || o.act === 'erase') { const d = unitv(tip, [647, 410]); J.lh = addv(tip, d, o.act === 'erase' ? 16 : 26); J.le = [662, 448]; }
    else { J.lh = [690, 426]; J.le = [664, 446]; }
    if (o.slump) { J.head = [652, 404]; J.neck = [646, 418]; J.lh = [684, 428]; J.le = [668, 440]; }
    fixArms(J);
    s += fig(J, { flame: o.flame, t, mood: o.mood || 'neutral', blink: o.blink });
    if (o.act === 'draw') s += pencilIn(J, tip);
    if (o.act === 'erase') s += pencilIn(J, tip, 'eraser') + (Math.sin(t * 30) > 0 ? `<circle cx="${tip[0] + 6}" cy="${tip[1] + 10}" r="2" fill="#b9a8b0"/>` : '');
    return { s, J };
  }
  function crumbs(x, y, n) { let s = ''; const m = Math.min(90, n); for (let i = 0; i < m; i++) { const r = Math.sqrt(i / m); s += `<circle cx="${x + (rnd(i) - 0.5) * 70 * r}" cy="${y - 2 - (1 - Math.abs(rnd(i) - 0.5) * 2) * 10 * (m / 90) * rnd(i + 3)}" r="1.8" fill="#b9a8b0"/>`; } return s; }
  function bin(x, g, n) {
    let s = `<path d="M${x - 24},${g - 52} L${x + 24},${g - 52} L${x + 18},${g} L${x - 18},${g}Z" fill="#2a2a30" stroke="#55555e" stroke-width="2"/>`;
    for (let i = 0; i < Math.min(14, n); i++) s += `<circle cx="${x - 16 + (i % 5) * 8 + 2 * rnd(i)}" cy="${g - 54 - Math.floor(i / 5) * 9}" r="7" fill="${PAPER}" stroke="#8a7d68" stroke-width="1"/>`;
    return s;
  }
  // cửa sổ trong phòng nhìn sang cửa sổ nhà Pip
  function windowView(x, y, n, t) {
    let s = `<rect x="${x}" y="${y}" width="150" height="120" fill="#141a26" stroke="#6b6760" stroke-width="3"/>`;
    s += `<rect x="${x + 70}" y="${y + 30}" width="64" height="60" fill="#3a2a1a"/>` + glow(x + 102, y + 60, 40, 0.3);
    for (let i = 0; i < Math.min(12, n); i++) s += `<rect x="${x + 73 + (i % 4) * 15}" y="${y + 33 + Math.floor(i / 4) * 18}" width="12" height="14" fill="${PAPER}" opacity=".9"/><circle cx="${x + 79 + (i % 4) * 15}" cy="${y + 40 + Math.floor(i / 4) * 18}" r="3" fill="${CRAY[i % 4]}"/>`;
    return s + ln([x + 75, y], [x + 75, y + 120], '#6b6760', 2.5);
  }
  // Pip: bé con, hai búi tóc
  function pip(J, k = 0.68, o = {}) {
    const c = J.head;
    const buns = `<circle cx="${c[0] - 26}" cy="${c[1] - 22}" r="11" fill="#8a5a3a"/><circle cx="${c[0] + 26}" cy="${c[1] - 22}" r="11" fill="#8a5a3a"/>`;
    return `<g transform="translate(${J.hip[0]},${o.g || 560}) scale(${k}) translate(${-J.hip[0]},${-(o.g || 560)})">` + buns + fig(J, { c: '#efe2cf', mood: o.mood || 'happy' }) + '</g>';
  }
  // mặt tiền hai nhà đối diện: cửa sổ Spark (trái) · cửa sổ Pip (phải)
  function facade(t, o = {}) {
    let s = `<rect x="-200" y="80" width="1700" height="600" fill="${o.day ? '#3a4a66' : '#0e1220'}"/>`;
    s += `<rect x="-200" y="120" width="660" height="560" fill="#2a2420"/><rect x="820" y="120" width="660" height="560" fill="#2c2622"/>`;
    s += `<rect x="460" y="560" width="360" height="120" fill="#16141a"/>` + ln([460, 560], [820, 560], '#3a3640', 3);
    // cửa sổ nhà Spark
    s += `<rect x="200" y="230" width="200" height="190" fill="${o.sparkLit ? '#4a3420' : '#1a1a22'}" stroke="#6b6760" stroke-width="5"/>` + (o.sparkLit ? glow(300, 330, 140, 0.35) : '');
    // cửa sổ nhà Pip
    s += `<rect x="880" y="230" width="200" height="190" fill="#4a3420" stroke="#6b6760" stroke-width="5"/>` + glow(980, 330, 160, 0.4);
    const pipN = o.pipN || 0;
    for (let i = 0; i < pipN; i++) { const px = 890 + (i % 6) * 32, py = 240 + Math.floor(i / 6) * 34; s += `<g transform="rotate(${(rnd(i) - 0.5) * 12} ${px + 14} ${py + 14})"><rect x="${px}" y="${py}" width="28" height="28" fill="${PAPER}"/>` + art(['sun', 'flower', 'kite', 'sun'][i % 4], px + 1, py + 4, 0.26, 1, { col: CRAY[i % 4], w: 6 }) + '</g>'; }
    if (o.pipBird) s += `<rect x="1010" y="${240 + 34 * 0}" width="60" height="44" fill="${PAPER}"/>` + art('bird', 1012, 242, 0.56, 1, { col: CRAY, w: 3.4 });
    const sparkN = o.sparkN || 0;
    for (let i = 0; i < sparkN; i++) { const px = 210 + (i % 6) * 31, py = 240 + Math.floor(i / 6) * 34; s += `<g transform="rotate(${(rnd(i + 40) - 0.5) * 8} ${px + 14} ${py + 14})"><rect x="${px}" y="${py}" width="28" height="28" fill="${PAPER}"/>` + art(['sun', 'flower', 'kite', 'bird'][i % 4], px + 1, py + 4, 0.26, 1, { w: 3.5 }) + '</g>'; }
    if (o.sparkSun) s += `<rect x="${o.sparkSun[0]}" y="${o.sparkSun[1]}" width="60" height="46" fill="${PAPER}"/>` + art('sun', o.sparkSun[0] + 2, o.sparkSun[1] + 2, 0.56, 1, { w: 2.6 });
    // người trong cửa sổ (nửa thân)
    if (o.spark) { const J = stand(300, 470, { look: 8 }); if (o.sparkWave) { J.le = [326, 340]; J.lh = [344, 312 + 8 * Math.sin(t * 8)]; } s += `<svg x="200" y="230" width="200" height="190" overflow="hidden"><g transform="translate(-200,-230)">` + fig(J, { flame: o.sparkFlame ?? 0.3, t, mood: o.sparkMood || 'neutral' }) + '</g></svg>'; }
    if (o.pip) { const J = stand(980, 500, { look: -8 }); J.face = -1; if (o.pipWave) { J.le = [956, 380]; J.lh = [940, 352 + 8 * Math.sin(t * 8)]; } if (o.pipTape) { J.le = [960, 400]; J.lh = [944, 372]; } s += `<svg x="880" y="230" width="200" height="190" overflow="hidden"><g transform="translate(-880,-230)">` + pip(J, 1.0, { g: 500 }) + '</g></svg>'; }
    return s;
  }
  // bảng tin công viên "SHOW YOUR ART"
  function corkBoard(t, o = {}) {
    let s = ln([600, 450], [600, 560], WOOD, 8) + ln([900, 450], [900, 560], WOOD, 8);
    s += `<rect x="580" y="230" width="340" height="230" rx="6" fill="#8a6440" stroke="#5a3e26" stroke-width="5"/>` + txt(750, 262, 'SHOW YOUR ART', { size: 18, c: '#f4ead8', w: 900, ls: 3 });
    [[600, 280, 'sun', 0], [600, 370, 'flower', 1], [830, 280, 'kite', 2], [830, 370, 'bird', 3]].forEach(([x, y, a, i]) => { s += `<rect x="${x}" y="${y}" width="72" height="56" fill="${PAPER}" transform="rotate(${(rnd(i) - 0.5) * 6} ${x + 36} ${y + 28})"/>` + art(a, x + 2, y + 4, 0.68, 1, { col: CRAY[i], w: 3 }) + `<circle cx="${x + 36}" cy="${y + 4}" r="3.5" fill="${PINC}"/>`; });
    return s;
  }
  const SPOT = [688, 290]; // chỗ tranh của Spark trên bảng
  function hudP(fire, right, o = 1) {
    if (o <= 0) return '';
    const c = fire > 8 ? ORANGE : '#7b7872';
    let s = `<text x="48" y="70" fill="${c}" fill-opacity="${o}" font-family="${MONO}" font-size="16" font-weight="700" letter-spacing="3" filter="url(#softGlow)">FIRE <tspan font-size="24" letter-spacing="0">${fire}%</tspan></text>`;
    if (right && right.done !== undefined) s += `<text x="1232" y="72" fill="${YEL}" fill-opacity="${o}" filter="url(#yelGlow)" font-family="${MONO}" font-size="18" font-weight="700" letter-spacing="2" text-anchor="end">DONE · <tspan font-size="24">${right.done}</tspan></text>`;
    else if (right) s += `<text x="1232" y="72" fill="#8d8a84" fill-opacity="${o}" font-family="${MONO}" font-size="18" font-weight="700" letter-spacing="3" text-anchor="end">ERASED ×<tspan font-size="24" fill="#cfcbc2">${right.erased}</tspan></text>` +
      `<text x="1232" y="98" fill="#6f6c66" fill-opacity="${o}" font-family="${MONO}" font-size="13" letter-spacing="3" text-anchor="end">FINISHED 0</text>`;
    return ui(s);
  }
  // cận cảnh trang giấy (chèn): tay từ dưới phải, cầm bút hoặc tẩy
  function insertPage(t, name, p, o = {}) {
    let s = `<rect x="-400" y="-300" width="2200" height="1400" fill="#1a1612"/>` + glow(640, 330, 520, 0.35);
    s += `<g transform="rotate(-3 640 360)"><rect x="300" y="120" width="680" height="480" fill="#efe7d6" stroke="#b9ab98" stroke-width="2"/>`;
    for (let i = 0; i < Math.round((o.smudge || 0) * 26); i++) s += `<ellipse cx="${360 + rnd(i) * 560}" cy="${170 + rnd(i + 7) * 380}" rx="${30 + 40 * rnd(i + 3)}" ry="${14 + 18 * rnd(i + 5)}" fill="#8a8478" opacity="${0.07 + 0.08 * o.smudge}"/>`;
    s += art(name, 340, 150, 6, p, { ghost: o.ghost, w: 1.6, col: o.col });
    if (o.hole) s += `<path d="M640,230 l40,20 l-10,40 l30,30 l-40,20 l-30,-30 l-30,10Z" fill="#1a1612" opacity="${o.hole}"/>`;
    if (o.tear) s += `<path d="M560,120 L585,250 L560,360 L600,470 L575,600" fill="none" stroke="#1a1612" stroke-width="${10 * o.tear}"/>`;
    s += (o.extra || '') + '</g>';
    if (o.tip) {
      const tip = o.tip, base = [tip[0] + 260, 760];
      s += `<line x1="${base[0]}" y1="${base[1]}" x2="${tip[0] + 40}" y2="${tip[1] + 50}" stroke="${SKIN_LINE}" stroke-width="58" stroke-linecap="round"/><line x1="${base[0]}" y1="${base[1]}" x2="${tip[0] + 40}" y2="${tip[1] + 50}" stroke="${SKIN}" stroke-width="52" stroke-linecap="round"/>`;
      if (o.tool === 'eraser') s += `<g transform="rotate(-35 ${tip[0]} ${tip[1]})"><rect x="${tip[0] - 20}" y="${tip[1] - 30}" width="44" height="80" rx="8" fill="${ERASER}" stroke="#8a8aa0" stroke-width="3"/><rect x="${tip[0] - 20}" y="${tip[1] + 6}" width="44" height="26" fill="#5b7fc0"/></g>`;
      else s += ln([tip[0] + 70, tip[1] + 80], tip, '#e8b04a', 16) + ln([tip[0] + 14, tip[1] + 16], tip, GRAPH, 8);
      s += `<circle cx="${tip[0] + 44}" cy="${tip[1] + 54}" r="30" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="3"/>`;
      if (o.tool === 'eraser') for (let i = 0; i < 10; i++) { const k = ((t * 2 + i / 10) % 1); s += `<circle cx="${tip[0] - 20 + 50 * rnd(i)}" cy="${tip[1] + 30 + 140 * k}" r="${4 * (1 - k) + 1}" fill="#b9a8b0" opacity="${1 - k}"/>`; }
    }
    return s;
  }
  const PT = (name, p) => { // điểm đầu bút trên trang chèn theo tiến độ
    const P = ART[name], i = Math.min(P.length - 1, Math.floor(p * P.length)), m = P[i].match(/-?\d+\.?\d*/g).map(Number);
    const q = clamp(p * P.length - i), j = Math.min(m.length - 2, 2 * Math.floor(q * (m.length / 2 - 1)));
    return [340 + m[j] * 6, 150 + m[j + 1] * 6];
  };
  // số lần tẩy theo thời gian (bộ đếm tăng dần)
  const ERASED = t => Math.round(t < 7.8 ? 0 : t < 9.4 ? 1 : t < 14 ? lerp(1, 4, ramp(t, 9.4, 13.5)) : t < 42 ? lerp(4, 214, ramp(t, 14, 41)) : lerp(214, 312, ramp(t, 42, 56.4)));
  const FIREP = t => Math.round(t < 9 ? 70 : t < 14 ? 66 : t < 42 ? lerp(64, 30, ramp(t, 14, 41)) : t < 58 ? lerp(30, 10, ramp(t, 42, 57)) : 4);

  // ================= 1. Vết thương (0–14) =================
  scene(0, 7, t => {
    if (t < 1.6) return ui(txt(640, 370, '10:40 PM', { size: 30, c: '#77746e', w: 600, ls: 6, op: fade(t, 0.2, 1.6, 0.5, 0.3) }));
    const p = lerp(0, 0.62, ramp(t, 1.8, 4.6));
    const D = deskScene(t, { inner: onBoard('bird', p), act: t < 4.8 ? 'draw' : 'rest', p, flame: 0.62, mood: t > 5.6 ? 'sad' : 'happy' });
    let s = D.s;
    // bóng bàn tay trên trang giấy → kẻ thù mọc từ đó
    const born = ramp(t, 4.6, 6.0);
    if (t < 6) s += `<ellipse cx="${D.J.lh[0] + 30}" cy="${D.J.lh[1] - 4}" rx="16" ry="9" fill="#000" opacity="${0.35 * (1 - born)}"/>`;
    if (born > 0) { const E = whisperPose(900, 560, -1); E.lh = mix(E.lh, [836, 380], ramp(t, 6.0, 6.5)); E.le = [866, 410]; s = shadowFig(E, { k: 0.2 + 0.8 * born, op: born, ax: lerp(740, 900, born), ay: lerp(380, 560, born) }) + s; }
    return s + hudP(70, { erased: 0 }, ramp(t, 1.8, 2.4));
  }, { cam: STAND(760) });
  scene(7, 9.6, t => {
    const er = ramp(t, 7.4, 9.0);
    const tip = [520 + 60 * Math.sin(t * 22), 230 + 20 * Math.cos(t * 17)];
    return insertPage(t, 'bird', 0.62 * (1 - er * 0.45), { ghost: 0.15 * er, smudge: 0.3 * er, tip, tool: 'eraser' }) + hudP(t < 8.6 ? 70 : 67, { erased: ERASED(t) });
  }, { cam: { x: 640, y: 360, k: 1 } });
  scene(9.6, 14, t => {
    const ph = (t - 9.6) % 2.2, drawing = ph < 1.3, p = drawing ? 0.2 + 0.35 * (ph / 1.3) : 0.55 * (1 - (ph - 1.3) / 0.9);
    const D = deskScene(t, { inner: onBoard('bird', p, { ghost: 0.18 }), smudge: 0.3, act: drawing ? 'draw' : 'erase', p, flame: 0.56, mood: 'sad', crumbs: 8 + (t - 9.6) * 4 });
    let s = shadowFig(whisperPose(900, 560, -1), { k: 1 }) + D.s;
    return s + hudP(FIREP(t), { erased: ERASED(t) });
  }, { cam: STAND(760) });

  // ================= 2. Cái giá: montage (14–42) =================
  scene(14, 17.5, t => {
    const ph = (t - 14) % 0.9, drawing = ph < 0.5, p = drawing ? 0.6 * ph / 0.5 : 0.6 * (1 - (ph - 0.5) / 0.4);
    return insertPage(t, 'bird', p, { ghost: 0.22, smudge: 0.5, tip: drawing ? PT('bird', p) : [560 + 50 * Math.sin(t * 22), 240], tool: drawing ? 'pencil' : 'eraser' }) + hudP(FIREP(t), { erased: ERASED(t) });
  }, { cam: { x: 640, y: 360, k: 1 } });
  scene(17.5, 21, t => {
    let s = facade(t, { pipN: 1, pip: true, pipTape: t < 19, pipWave: t > 19.4, spark: true, sparkMood: 'sad', sparkFlame: 0.45 });
    const shake = t > 19.6 && t < 20.6 ? Math.sin((t - 19.6) * 18) * 6 : 0;
    return s.replace('translate(-200,-230)', `translate(${-200 + shake},-230)`) + hudP(FIREP(t), { erased: ERASED(t) });
  }, { cam: { x: 640, y: 330, k: 1.15 } });
  scene(21, 24.5, t => {
    let s = room() + corkBoard(t);
    const x = lerp(380, 1000, ramp(t, 21, 24.5)), J = walk(x, 560, t * 6);
    J.le = [x - 20, 476]; J.lh = [x - 30, 496]; fixArms(J);
    J.head = [J.head[0], J.head[1] + 8];
    s += `<rect x="${x - 50}" y="474" width="34" height="44" rx="3" fill="#4a5a7a" stroke="#2a3448" stroke-width="2"/>` + fig(J, { flame: 0.42, t, mood: 'sad' });
    return s + hudP(FIREP(t), { erased: ERASED(t) });
  }, { cam: STAND(720, 1.4) });
  scene(24.5, 28, t => {
    const p = t < 26.4 ? lerp(0.6, 0.95, ramp(t, 24.5, 26)) : 0.95 * (1 - ramp(t, 26.6, 27.9));
    const D = deskScene(t, { inner: onBoard('bird', p, { ghost: 0.25 }), smudge: 0.6, act: t < 26.2 ? 'draw' : t > 26.6 ? 'erase' : 'rest', p, flame: 0.46, mood: 'sad', crumbs: 40 });
    const E = whisperPose(900, 560, -1); E.lh = [846, 368]; E.le = [870, 404];
    return shadowFig(E, { k: 1, op: ramp(t, 24.6, 25.0) }) + D.s + hudP(FIREP(t), { erased: ERASED(t) });
  }, { cam: STAND(760) });
  scene(28, 31.5, t => insertPage(t, 'bird', 0.3, { ghost: 0.35, smudge: 1, hole: ramp(t, 28.6, 29.6), tip: [600 + 40 * Math.sin(t * 24), 260], tool: t < 29.8 ? 'eraser' : null }) + hudP(FIREP(t), { erased: ERASED(t) }), { cam: { x: 640, y: 360, k: 1 } });
  scene(31.5, 35, t => {
    const rip = ramp(t, 31.8, 32.4), toss = ramp(t, 32.8, 33.6);
    const D = deskScene(t, { inner: rip < 1 ? onBoard('bird', 0.3, { ghost: 0.3 }) : '', smudge: rip < 1 ? 0.8 : 0, act: 'rest', flame: 0.38, mood: 'fierce', crumbs: 60, bin: 12 + (toss >= 1 ? 1 : 0) });
    let s = shadowFig(whisperPose(900, 560, -1), { k: 1 }) + D.s;
    if (rip > 0 && toss < 1) { const q = [lerp(720, 560, toss), lerp(380, 500, toss) - 80 * Math.sin(toss * Math.PI)]; s += `<circle cx="${q[0]}" cy="${q[1]}" r="9" fill="${PAPER}" stroke="#8a7d68"/>`; }
    return s + hudP(FIREP(t), { erased: ERASED(t) });
  }, { cam: STAND(720) });
  scene(35, 42, t => {
    // 2:10 AM: đống vụn tẩy như đồi cát; bày thước, ba cây bút, kính lúp
    const tools = ramp(t, 38.6, 40.4);
    const D = deskScene(t, { inner: '', act: 'rest', flame: 0.34, mood: t > 38.6 ? 'fierce' : 'tired', crumbs: 90, bin: 14 });
    let s = D.s + `<path d="M740,430 Q780,404 830,430Z" fill="#b9a8b0"/>`;
    if (tools > 0) s += `<g opacity="${tools}"><rect x="690" y="${lerp(450, 410, tools)}" width="120" height="8" fill="#c9b07a" stroke="#7a6a40"/>` + ln([700, 424], [744, 418], '#e8b04a', 5) + ln([706, 428], [752, 424], '#e8b04a', 5) + ln([712, 432], [756, 430], '#e8b04a', 5) + `<circle cx="840" cy="414" r="12" fill="#9fc0e0" opacity=".5" stroke="#555" stroke-width="3"/>` + ln([848, 422], [862, 430], '#555', 4) + '</g>';
    return s + hudP(FIREP(t), { erased: ERASED(t) }) + clock(1170, 140, '2:10 AM');
  }, { cam: STAND(760) });

  // ================= 3. Cày (42–58): con chim "hoàn hảo" bằng thước — nét cuối lệch, tẩy đến rách =================
  const CRAM = t => {
    const p = t < 54.6 ? lerp(0, 1, ramp(t, 42.4, 53.6)) : 1 - ramp(t, 54.8, 56.4) * 0.7;
    const erasing = t > 54.8 && t < 56.4, tear = ramp(t, 56.4, 56.8);
    const wobble = t > 53.2 && t < 54.6 ? `<path d="M545,195 q12,-30 30,-6" fill="none" stroke="${GRAPH}" stroke-width="10" stroke-linecap="round"/>` : '';
    const tip = erasing ? [560 + 60 * Math.sin(t * 30), 220 + 20 * Math.cos(t * 23)] : t < 54.6 ? PT('bird', p) : null;
    const tremble = t > 53 && t < 54.6 ? [Math.sin(t * 60) * 4, Math.cos(t * 53) * 4] : [0, 0];
    let s = insertPage(t, 'bird', p, { ghost: 0.3, smudge: 0.9 + 0.3 * ramp(t, 54.8, 56.4), tear, tip: tip ? [tip[0] + tremble[0], tip[1] + tremble[1]] : null, tool: erasing ? 'eraser' : 'pencil',
      extra: (t < 54.6 ? `<rect x="330" y="${470 - 2}" width="520" height="22" fill="#c9b07a" opacity=".85" stroke="#7a6a40" stroke-width="2"/>` : '') + wobble });
    if (t > 50 && t < 57.6) s += `<g opacity="${fade(t, 50, 57.6, 0.4, 0.4)}">` + `<circle cx="160" cy="610" r="90" fill="#000" opacity=".0"/></g>`;
    return s + hudP(FIREP(t), { erased: ERASED(t) }) + clock(1170, 140, t < 50 ? '3:05 AM' : '4:40 AM');
  };
  const CRAMCAM = { cam: t => ({ x: 640, y: 360, k: 1 + 0.12 * ramp(t, 52.5, 54.4) }) };
  scene(42, 49.2, CRAM, CRAMCAM);
  scene(51.4, 58, CRAM, CRAMCAM);
  // kẻ thù trong đoạn cày (chèn rộng ngắn để lời thì thầm có chỗ)
  scene(49.2, 51.4, t => {
    const D = deskScene(t, { inner: onBoard('bird', 0.66, { ghost: 0.3 }), smudge: 0.9, act: 'draw', p: 0.66, flame: 0.28, mood: 'fierce', crumbs: 90, bin: 14 });
    return shadowFig(whisperPose(900, 560, -1), { k: 1.05 }) + D.s + hudP(FIREP(t), { erased: ERASED(t) });
  }, { cam: STAND(760) });

  // ================= 4. Đáy (58–72) =================
  scene(58, 63, t => {
    const D = deskScene(t, { inner: '', act: 'rest', slump: true, flame: 0.06, mood: 'tired', crumbs: 90, bin: 14, window: 30 });
    return shadowFig(whisperPose(900, 560, -1), { k: 1.05, op: ramp(t, 58.4, 59.0) }) + D.s + hudP(4, { erased: 312 });
  }, { cam: STAND(700) });
  scene(63, 72, t => facade(t, { pipN: 30 + (t > 68 ? 1 : 0), pip: true, pipTape: t > 66 && t < 68.4, spark: true, sparkMood: 'sad', sparkFlame: 0.06 }) + hudP(4, { erased: 312 }),
    { cam: t => ({ x: lerp(640, 900, ramp(t, 63.4, 67)), y: lerp(330, 320, ramp(t, 63.4, 67)), k: lerp(1.0, 1.9, ramp(t, 63.4, 67)) }) });

  // ================= 5. Bước ngoặt (72–86) =================
  scene(72, 81.4, t => {
    const thrown = t > 75.8, fly = ramp(t, 75.8, 76.5);
    const D = deskScene(t, { inner: '', act: 'rest', flame: thrown ? lerp(0.06, 0.12, ramp(t, 76.5, 77.4)) : 0.06, mood: t > 75.4 ? 'fierce' : 'sad', crumbs: 90, bin: 14, window: 31 });
    let s = D.s;
    // tay cầm cục tẩy, nhìn nó
    const J = D.J;
    const hold = [690, 400];
    if (!thrown) s += `<g transform="rotate(-20 ${hold[0]} ${hold[1]})"><rect x="${hold[0] - 8}" y="${hold[1] - 12}" width="30" height="16" rx="3" fill="${ERASER}" stroke="#8a8aa0" stroke-width="1.5"/><rect x="${hold[0] + 4}" y="${hold[1] - 12}" width="8" height="16" fill="#5b7fc0"/></g>`;
    else if (fly < 1) { const q = [lerp(690, 560, fly), lerp(400, 500, fly) - 120 * Math.sin(fly * Math.PI)]; s += `<rect x="${q[0] - 10}" y="${q[1] - 6}" width="20" height="12" rx="3" fill="${ERASER}" transform="rotate(${fly * 540} ${q[0]} ${q[1]})"/>`; }
    // kẻ thù đặt tay lên cục tẩy
    const gone = ramp(t, 76.0, 77.0);
    if (gone < 1) { const E = whisperPose(800, 560, -1); E.lh = mix(E.lh, [712, 402], ramp(t, 74.4, 75.2)); E.le = [736, 432]; if (thrown) E.lh = [760, 380]; s += shadowFig(E, { k: 1.05, op: ramp(t, 72.4, 73.0) * (1 - gone), jitter: thrown ? 5 : 0 }); }
    if (t > 76.5 && t < 77.6) { const q = (t - 76.5) / 1.1; s += `<text x="${J.head[0] + 70}" y="${J.head[1] + 20 - 26 * q}" fill="${ORANGE}" fill-opacity="${1 - q}" filter="url(#softGlow)" font-family="${MONO}" font-size="15" font-weight="700">+4%</text>`; }
    // từ khoá: PERFECT (xám) vỡ thành vụn tẩy → DONE (vàng) → bay vào góc
    if (t > 77.4) {
      const o = fade(t, 77.4, 81.4, 0.3, 0.01), crumble = ramp(t, 78.4, 79.4), done = ramp(t, 79.3, 79.9), fly2 = ramp(t, 80.4, 81.2);
      let k = '';
      'PERFECT'.split('').forEach((ch, i) => { const d = clamp(crumble * 1.5 - i * 0.08); k += `<text x="${700 + i * 58}" y="${190 + 300 * d * d}" fill="#9a968e" fill-opacity="${1 - d}" font-family="Inter" font-size="72" font-weight="900" text-anchor="middle">${ch}</text>`; for (let j = 0; j < 4; j++) if (d > 0 && d < 1) k += `<circle cx="${700 + i * 58 + (rnd(i * 4 + j) - 0.5) * 50}" cy="${190 + 330 * d * d + rnd(j) * 30}" r="3" fill="#b9a8b0" opacity="${1 - d}"/>`; });
      const cx = lerp(874, 1180, fly2), cy = lerp(190, 66, fly2), fs = lerp(84, 22, fly2);
      if (done > 0) k += `<text x="${cx}" y="${cy}" fill="${YEL}" fill-opacity="${done}" filter="url(#yelGlow)" font-family="Inter" font-size="${fs}" font-weight="900" letter-spacing="${lerp(10, 2, fly2)}" text-anchor="middle">DONE</text>`;
      s += ui(`<g opacity="${o}">${k}</g>`);
    }
    return s + hudP(thrown ? 8 : 4, t < 81 ? { erased: 312 } : { done: 0 });
  }, { cam: STAND(700) });
  // vẽ một mặt trời đơn giản, nét méo để nguyên — rồi dán lên cửa sổ, Pip vẫy tay
  scene(81.4, 84.2, t => {
    const p = ramp(t, 81.5, 83.8);
    return insertPage(t, 'sun', p, { tip: p < 1 ? PT('sun', p) : null }) + hudP(t < 83.8 ? 8 : 12, { done: t < 83.8 ? 0 : 1 });
  }, { cam: { x: 640, y: 360, k: 1 } });
  scene(84.2, 86, t => facade(t, { pipN: 31, pip: true, pipWave: t > 84.8, spark: true, sparkMood: 'happy', sparkFlame: 0.3, sparkSun: [320, 250] }) + hudP(18, { done: 1 }), { cam: { x: 640, y: 330, k: 1.15 } });

  // ================= 6. Montage DONE (86–118) =================
  scene(86, 92.4, t => {
    const p = ramp(t, 86.4, 91.0), sign = ramp(t, 91.2, 92.0);
    const D = deskScene(t, { inner: onBoard('flower', p) + (sign > 0 ? `<path d="M${B0[0] + 92},${B0[1] + 84} q6,-8 10,0 t10,0" fill="none" stroke="${YEL}" stroke-width="2.5" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${1 - sign}" filter="url(#yelGlow)"/>` : ''), act: p < 1 ? 'draw' : 'rest', p, flame: 0.45, mood: 'neutral' });
    return D.s + timer(870, 414, 1200 - (t - 86) * 190) + hudP(26, { done: 3 });
  }, { cam: STAND(760) });
  scene(92.4, 98.8, t => {
    const p = ramp(t, 92.6, 97.6);
    const D = deskScene(t, { inner: onBoard('kite', p), act: p < 1 ? 'draw' : 'rest', p, flame: 0.58, mood: 'happy', blink: (t % 3) < 0.12 });
    return shadowFig(whisperPose(900, 560, -1), { k: lerp(0.6, 0.05, ramp(t, 94, 96.6)), op: fade(t, 92.8, 96.8, 0.3, 0.4), ax: 900, ay: 560 }) + D.s + hudP(40, { done: 9 });
  }, { cam: STAND(760) });
  scene(98.8, 105.2, t => {
    const D = deskScene(t, { inner: onBoard('kite', 1), act: 'rest', flame: 0.7, mood: 'happy' });
    const E = stand(880, 560, { look: -8 }); E.face = -1;
    if (t > 100.2) { E.le = [858, 436]; E.lh = [846, 404]; }
    fixArms(E);
    return D.s + fig(E, { c: '#d9cfc0', mood: 'happy' }) + cap(E) + (t > 100.2 ? `<rect x="838" y="388" width="10" height="16" rx="4" fill="#d9cfc0" stroke="${SKIN_LINE}" stroke-width="2"/>` : '') + hudP(55, { done: 17 });
  }, { cam: STAND(780) });
  scene(105.2, 111.6, t => facade(t, { day: 1, pipN: 31, pip: true, pipWave: true, spark: true, sparkWave: true, sparkMood: 'happy', sparkFlame: 0.75, sparkN: 18 }) + hudP(70, { done: 28 }), { cam: t => ({ x: 640, y: 330, k: lerp(1.25, 1.05, ramp(t, 105.2, 111.6)) }) });
  scene(111.6, 118, t => {
    const p = ramp(t, 111.8, 115.4), roll = ramp(t, 116.2, 117.2);
    const D = deskScene(t, { inner: roll < 1 ? onBoard('winbird', p) : '', act: p < 1 ? 'draw' : 'rest', p, flame: 0.85, mood: t > 115.4 ? 'happy' : 'fierce' });
    let s = shadowFig(whisperPose(900, 560, -1), { k: lerp(0.5, 0.0, ramp(t, 112.6, 114.4)), op: fade(t, 112, 114.6, 0.3, 0.3), ax: 900, ay: 560 }) + D.s;
    if (roll > 0) s += `<rect x="${lerp(690, 700, roll)}" y="${lerp(330, 404, roll)}" width="${lerp(132, 20, roll)}" height="${lerp(96, 20, roll)}" rx="${10 * roll}" fill="#efe7d6" stroke="#b9ab98" stroke-width="2"/>`;
    return s + hudP(85, { done: 40 });
  }, { cam: STAND(760) });

  // ================= 7. Trận cuối (118–134): bảng SHOW YOUR ART — bút đỏ khoanh 7 vòng · Spark ký tên · ghim =================
  const FLAWS = [[22, 8, 9], [60, 18, 8], [86, 34, 6], [30, 46, 8], [12, 40, 7], [50, 56, 9], [76, 52, 7]]; // vị trí "lỗi" trong khung 100×70 (cx, cy, r)
  const ART_XY = [SPOT[0], SPOT[1]], ART_K = 1.12;
  const aPt = (lx, ly) => [ART_XY[0] + 6 + lx * ART_K, ART_XY[1] + 6 + ly * ART_K];
  scene(118, 134, t => {
    let s = `<rect x="-400" y="-300" width="2200" height="860" fill="#1c2430"/>` + `<rect x="-400" y="560" width="2200" height="400" fill="#1a2018"/>` + ln([-400, 560], [1800, 560], '#2e3a28', 3);
    s += corkBoard(t);
    // tranh của Spark: con chim bay ra khỏi cửa sổ
    const broke = t >= 130.6, shatter = ramp(t, 130.6, 131.8);
    s += `<rect x="${ART_XY[0]}" y="${ART_XY[1]}" width="124" height="90" fill="#efe7d6" stroke="#b9ab98" stroke-width="2"/>` + art('winbird', ART_XY[0] + 6, ART_XY[1] + 6, ART_K, 1);
    // chữ ký vàng
    const sign = ramp(t, 127.0, 128.8), cid = `sig${CLIPN++}`;
    if (sign > 0) s += `<clipPath id="${cid}"><rect x="${ART_XY[0] + 74}" y="${ART_XY[1] + 66}" width="${46 * sign}" height="22"/></clipPath><text clip-path="url(#${cid})" x="${ART_XY[0] + 76}" y="${ART_XY[1] + 84}" fill="${YEL}" filter="url(#yelGlow)" font-family="Inter" font-size="15" font-weight="700" font-style="italic">Spark</text>`;
    if (broke) s += `<circle cx="${ART_XY[0] + 62}" cy="${ART_XY[1] + 2}" r="4" fill="${PINC}"/>`;
    // vòng bút đỏ của kẻ thù
    FLAWS.forEach(([cx, cy, r], i) => {
      const q = ramp(t, 121.2 + i * 0.55, 121.6 + i * 0.55); if (q <= 0) return;
      const c = aPt(cx, cy);
      if (!broke) s += `<g filter="url(#redGlow)"><circle cx="${c[0]}" cy="${c[1]}" r="${r * ART_K}" fill="none" stroke="${RED}" stroke-width="2.4" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="${1 - q}"/></g>`;
      else if (shatter < 1) for (let j = 0; j < 5; j++) { const a = j * 1.3 + i; s += `<line x1="${c[0] + Math.cos(a) * 30 * shatter}" y1="${c[1] + Math.sin(a) * 30 * shatter + 40 * shatter * shatter}" x2="${c[0] + Math.cos(a) * (30 * shatter + 5)}" y2="${c[1] + Math.sin(a) * (30 * shatter + 5) + 40 * shatter * shatter}" stroke="${RED}" stroke-width="2" opacity="${1 - shatter}"/>`; }
    });
    // kẻ thù mọc từ bóng tấm bảng, cầm bút đỏ
    const born = ramp(t, 119.6, 121.0);
    if (born > 0 && shatter < 1) {
      const E = whisperPose(980, 560, -1), K = 1.4, ax = 980;
      const ci = Math.min(6, Math.max(0, Math.floor((t - 121.2) / 0.55))), tgt = t < 121.2 ? aPt(100, 30) : t < 125.2 ? aPt(FLAWS[ci][0] + FLAWS[ci][2], FLAWS[ci][1]) : aPt(110, 20);
      E.lh = [ax + (tgt[0] - ax) / K, 560 + (tgt[1] - 560) / K]; E.le = [ax - 40, 430];
      s += shadowFig(E, { k: 0.2 + (K - 0.2) * born, op: born * (broke ? 1 - shatter : 1), ax, ay: 560, jitter: broke ? 30 * (1 - shatter) : 0 });
      if (!broke) { const h = fixArms(E).lh, hp = [ax + (h[0] - ax) * K, 560 + (h[1] - 560) * K]; s += ln(hp, [hp[0] - 14, hp[1] - 4], RED, 4); }
    }
    // Spark: giữ tranh, run → thở ra → ký tên → ghim
    const J = stand(600, 560, { look: 10 });
    const signing = t > 126.8 && t < 129;
    const pen = signing ? [ART_XY[0] + 78 + 44 * sign, ART_XY[1] + 80 + 2 * Math.sin(t * 30)] : null;
    J.lh = signing ? pen : t >= 130.2 ? [ART_XY[0] + 62, ART_XY[1] + 8] : [ART_XY[0] + 4, ART_XY[1] + 50 + (t < 126 ? Math.sin(t * 40) * 1.5 : 0)];
    J.le = [624, 452];
    fixArms(J);
    let fl = 0.85; fl = lerp(fl, 0.4, ramp(t, 121, 125.4)); fl = lerp(fl, 0.6, ramp(t, 126, 127)); fl = lerp(fl, 0.75, sign); fl = lerp(fl, 1.3, shatter);
    const mood = t > 125.6 && t < 126.6 ? 'tired' : t > 126.6 ? 'fierce' : 'sad';
    s += fig(J, { flame: fl, t, mood });
    if (signing) s += ln(addv(J.lh, unitv(J.lh, [600, 420]), 2), [J.lh[0] + 14, J.lh[1] + 12], '#e8b04a', 4) + handDot(J.lh);
    else s += handDot(J.lh) + (t > 129 && t < 130.6 ? `<circle cx="${J.lh[0]}" cy="${J.lh[1] - 2}" r="4" fill="${PINC}"/>` : '');
    if (broke) s += `<circle cx="${ART_XY[0] + 62}" cy="${ART_XY[1] + 45}" r="${60 + 1100 * shatter}" fill="none" ${st(YEL, 8, 0.7 * (1 - shatter))}/>`;
    if (t > 130.6 && t < 130.8) s += ui(`<rect width="1280" height="720" fill="#fff" opacity=".8"/>`);
    return s;
  }, { nopush: true, cam: t => {
    const face = ramp(t, 125.4, 125.9) * (1 - ramp(t, 126.6, 126.9)), sig = ramp(t, 126.8, 127.2) * (1 - ramp(t, 129.4, 129.8));
    let c = { x: 720, y: 400, k: 1.5 };
    if (face > 0) c = { x: lerp(c.x, 630, face), y: lerp(c.y, 370, face), k: lerp(c.k, 2.6, face) };
    if (sig > 0) c = { x: lerp(c.x, ART_XY[0] + 70, sig), y: lerp(c.y, ART_XY[1] + 50, sig), k: lerp(c.k, 3.2, sig) };
    if (t > 130.4) c = { x: 720, y: 390, k: lerp(1.5, 1.3, ramp(t, 130.6, 133)) };
    return c;
  } });

  // ================= 8. Phần thưởng (134–150) =================
  scene(134, 142, t => {
    let s = `<rect x="-400" y="-300" width="2200" height="860" fill="#33445c"/>` + `<rect x="-400" y="560" width="2200" height="400" fill="#243020"/>` + ln([-400, 560], [1800, 560], '#3a4a30', 3);
    s += corkBoard(t) + `<rect x="${ART_XY[0]}" y="${ART_XY[1]}" width="124" height="90" fill="#efe7d6" stroke="#b9ab98" stroke-width="2"/>` + art('winbird', ART_XY[0] + 6, ART_XY[1] + 6, ART_K, 1) + `<text x="${ART_XY[0] + 76}" y="${ART_XY[1] + 84}" fill="${YEL}" font-family="Inter" font-size="15" font-weight="700" font-style="italic">Spark</text><circle cx="${ART_XY[0] + 62}" cy="${ART_XY[1] + 2}" r="4" fill="${PINC}"/>`;
    // người qua đường dừng lại
    [[360, '#b9b5ad', 134.2], [1180, '#a9a59d', 135]].forEach(([x0, c, ts]) => { const x = lerp(x0 < 640 ? 200 : 1300, x0, ramp(t, ts, ts + 2.4)); const J = t < ts + 2.4 ? walk(x, 560, t * 6) : stand(x, 560, { look: x0 < 640 ? 10 : -10 }); if (x0 > 640) J.face = -1; s += x0 > 640 && t < ts + 2.4 ? flip(x, fig(walk(x, 560, t * 6), { c })) : fig(J, { c, mood: 'happy' }); });
    // Pip kéo tay mẹ, chỉ vào tranh
    const px = lerp(1240, 880, ramp(t, 136, 138.6));
    const M = stand(px + 60, 560, { look: -8 }); M.face = -1;
    s += `<path d="M${M.head[0] - 4},${M.head[1] - 36} a12,12 0 1,1 0.1,0" fill="#5a3a2a"/>` + fig(M, { c: '#c9b9a5', mood: 'happy' });
    const P = stand(px, 560, { look: -8 }); P.face = -1; if (t > 138.6) { P.le = [px - 24, 470]; P.lh = [px - 52, 440]; }
    s += pip(P, 0.68);
    s += fig(stand(470, 560, { look: 10 }), { flame: 1.0, t, mood: 'happy', blink: (t % 3.4) < 0.12 });
    return s + hudP(92, { done: 41 });
  }, { cam: STAND(720, 1.25) });
  scene(142, 150, t => facade(t, { day: 1, pipN: 31, pipBird: true, pip: true, pipWave: t > 144, spark: true, sparkWave: t > 145, sparkMood: 'happy', sparkFlame: 1.0, sparkN: 18 }) + hudP(100, { done: 41 }),
    { cam: t => ({ x: lerp(1000, 640, ramp(t, 144.4, 148)), y: lerp(300, 330, ramp(t, 144.4, 148)), k: lerp(2.4, 1.1, ramp(t, 144.4, 148)) }) });

  // ================= 9. Tấm gương + tên phim (150–161) =================
  scene(150, 155.6, t => {
    let s = room() + desk(760, 560) + board(B0[0], B0[1], onBoard('flower', 1)) + bin(560, 560, 14) + `<rect x="548" y="496" width="20" height="12" rx="3" fill="${ERASER}"/>` + `<path d="M820,140 L1000,140 L900,560 L640,560Z" fill="#ffd9a0" opacity=".06"/>`;
    s += ui(txt(640, 140, 'Perfect never comes.', { size: 42, w: 600, op: fade(t, 150.5, 155.4, 0.8, 0.6) }) +
      `<text x="640" y="610" fill="${YEL}" fill-opacity="${fade(t, 152.6, 155.4, 0.6, 0.6)}" filter="url(#yelGlow)" font-family="Inter" font-size="52" font-weight="800" text-anchor="middle">Finish anyway.</text>`);
    return s;
  }, { fo: 0.6, cam: { x: 700, y: 430, k: 1.7 } });
  scene(155.6, 161, t => {
    let s = `<text x="640" y="360" fill="${YEL}" fill-opacity="${fade(t, 156.0, 160.4, 0.8, 0.8)}" filter="url(#yelGlow)" font-family="Inter" font-size="92" font-weight="800" letter-spacing="22" text-anchor="middle">PERFECT</text>`;
    s += txt(640, 410, 'an animated short film', { size: 22, c: MUTED, ls: 6, op: fade(t, 156.6, 160.4, 0.8, 0.8) });
    s += flame(640, 520, 0.32, t, fade(t, 157.0, 160.4, 0.6, 0.8)) + txt(640, 572, 'Keep the fire.', { size: 20, c: ORANGE, w: 600, ls: 4, op: fade(t, 157.4, 160.4, 0.6, 0.8) });
    return s;
  }, { fo: 0.01 });

  // ---------- lời thì thầm: [giây, câu, thời lượng] ----------
  const WH = [
    [6.2, 'not good enough.', 2.3],
    [10.4, 'start over'],
    [25.0, 'the lines are crooked', 2.3],
    [32.0, 'fix it first'],
    [49.6, 'one more try', 1.6],
    [59.2, 'why even show it?', 2.6],
    [73.0, 'not good enough.', 2.0],
    [93.2, 'fix it first', 1.8],
    [112.4, 'not good enough', 1.6],
    [121.4, 'everyone will see', 2.2], [122.6, "it's not ready", 2.0], [123.8, 'fix it first', 1.8], [124.8, 'not good enough.', 1.6],
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
  window.KIT = { fig, shadowFig, flame, glow, txt, stand, slump, sitChair, whisperPose, cap, art, board, insertPage, facade, corkBoard, deskScene, pip, DEFS, MONO, C: { W, BG, MUTED, ORANGE, CORE, RED, YEL, SKIN, COLD } };
  window.DURATION = DUR;
  window.WHISPERS = WH;
  const SHAKES = [[56.4, 0.3, 7], [130.6, 0.7, 16]];
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
      const push = sc.nopush ? 1 : 1 + 0.08 * clamp((t - sc.a) / (sc.b - sc.a)); // camera không bao giờ ngủ
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
