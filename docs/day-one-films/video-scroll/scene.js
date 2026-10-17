// SCROLL — vẽ khung hình tại thời điểm t (giây). Chạy trong trình duyệt: window.frame(t) → chuỗi SVG.
(function () {
  const W = '#f4f1ea', BG = '#0d0a09', MUTED = '#8d8a84', GREY = '#55534f';
  const ORANGE = '#ff8a1f', CORE = '#ffd166', EMBER = '#7a4a22', SMOKE = '#3a3a3a', COLD = '#bcd7ff';
  const DUR = 150;

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
    const d = dirOf(J), ch = mix(J.neck, J.hip, 0.35);
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
  const scene = (a, b, fn, fx = {}) => S.push({ a, b, fn, fi: 0.1, fo: fx.fo === 0.01 ? 0.01 : 0.03, cam: fx.cam });

  // 1. Mở đầu: đồng hồ + cận cảnh điện thoại
  scene(0, 7, t => {
    let s = txt(640, 370, '11:47 PM', { size: 30, c: '#77746e', w: 600, ls: 6, op: fade(t, 0.4, 2.4, 0.6, 0.5) });
    const o = ramp(t, 2.2, 3.0);
    if (o <= 0) return s;
    const [fk, n] = flicks(t, 2.8, 0.9);
    const off = n * 150;
    s += `<g opacity="${o}">` + glow(640, 360, 380, 0.25, 'gC');
    s += `<rect x="510" y="110" width="260" height="500" rx="30" fill="#0e1014" ${st(W, 4)}/>`;
    s += `<clipPath id="scr"><rect x="522" y="140" width="236" height="440" rx="12"/></clipPath><g clip-path="url(#scr)">`;
    s += `<rect x="522" y="140" width="236" height="440" fill="#1b2027"/>`;
    for (let i = -1; i < 9; i++) {
      const idx = i + Math.floor(off / 150);
      const y = 150 + i * 150 - (off % 150);
      s += `<rect x="534" y="${y}" width="212" height="130" rx="10" fill="#2a313a"/>`;
      s += `<rect x="546" y="${y + 12}" width="${80 + 60 * rnd(idx)}" height="10" rx="5" fill="#4a5562"/><rect x="546" y="${y + 30}" width="188" height="70" rx="6" fill="#36404b"/>`;
      s += `<circle cx="${560 + 40 * rnd(idx + 3)}" cy="${y + 112}" r="6" fill="#4a5562"/>`;
    }
    s += '</g>';
    // ngón cái
    const ty = 560 - fk * 120;
    s += `<path d="M720,${ty + 160} L716,${ty + 20} Q716,${ty} 738,${ty} Q760,${ty} 760,${ty + 20} L764,${ty + 160}" fill="${BG}" ${st(W, 5)}/>`;
    // đốm lửa bay từ dưới vào màn hình
    for (let i = 0; i < 6; i++) {
      const k = (t * 0.6 + i / 6) % 1;
      s += `<circle cx="${620 + 60 * Math.sin(i * 2 + t)}" cy="${720 - k * 260}" r="${4 * (1 - k) + 1}" fill="${ORANGE}" opacity="${(1 - k) * 0.9 * ramp(t, 3, 4)}"/>`;
    }
    return s + '</g>';
  }, { fi: 0.01 });

  // 2. Nằm trên giường lướt
  function bedScene(t, a, flameAmt, demonK, line, clockStr, period = 1.2) {
    const by = 470;
    let s = ground(140, 1140, 540, 0.4) + bed(640, by);
    const J = fixArms(lieBed(660, by));
    const ph = J.rh, pp = [ph[0] + 6, ph[1] - 26];
    const [fk] = flicks(t, a + 0.6, period);
    s += phone(pp[0], pp[1], 160, 0.8 + 0.2 * fk);
    s += fig(J, { flame: flameAmt, t, mood: 'tired' });
    s += thread(flamePos(J), pp, t, 0.25 + 0.75 * fk);
    if (clockStr) s += clock(1080, 140, clockStr);
    if (demonK) {
      const born = a === 7 ? ramp(t, 7.6, 9.2) : 1; // lần đầu: mọc lên từ ánh điện thoại
      s = shadowFig(whisperPose(410, 540, 1), { k: demonK * (0.15 + 0.85 * born), op: born * ramp(t, a + 0.1, a + 0.6), ax: lerp(pp[0], 410, born), ay: lerp(pp[1], 540, born) }) + s;
    }
    return s;
  }
  scene(7, 14, t => bedScene(t, 7, 0.55, 0.8), { cam: { x: 600, y: 345, k: 1.6 } });

  // 3. Trượt dốc
  scene(14, 20, t => hud(12, '2h 10m') + bedScene(t, 14, 0.45, 0.9, '', '2:14 AM', 1.0), { fi: 0.15, fo: 0.15, cam: { x: 600, y: 345, k: 1.6 } });
  scene(20, 26, t => {
    let s = hud(45, '3h 48m') + ground(140, 1140, 560) + desk(760, 560) + chair(560, 560) + books(700, 430) + books(820, 430);
    const J = sitChair(560, 560, { hand: [610, 470], hand2: [616, 468], look: 10 });
    const [fk] = flicks(t, 20.5, 1.0);
    s += phone(616, 448, 10, 0.8 + 0.2 * fk) + fig(J, { flame: 0.35, t, mood: 'tired' });
    s += thread(flamePos(J), [616, 448], t, 0.3 + 0.7 * fk);
    return shadowFig(whisperPose(440, 560, 1), { k: 1.0, op: ramp(t, 20.4, 21.4) }) + s;
  }, { fi: 0.15, fo: 0.15, cam: STAND(540) });
  scene(26, 32, t => {
    let s = hud(88, '5h 02m') + ground(140, 1140, 560) + ln([400, 470], [880, 470], '#5a5a5a', 5) + ln([440, 470], [440, 560], '#3a3a3a', 4) + ln([840, 470], [840, 560], '#3a3a3a', 4);
    const fo = lerp(1, 0.12, ramp(t, 27, 31));
    const L = stand(300, 560, { look: 8 }), R = stand(880, 560, { look: -8 });
    const wave = Math.sin(t * 5) * 14;
    L.re = [326, 430 + wave]; L.rh = [354, 410 + wave]; R.le = [854, 428 - wave]; R.lh = [826, 412 - wave];
    s += fig(L, { op: fo, c: '#b9b5ad' }) + fig(R, { op: fo, c: '#b9b5ad' });
    s += shadowFig(whisperPose(520, 560, 1), { k: 1.05, op: ramp(t, 26.4, 27.4) });
    const J = standPhone(632, 560);
    const [fk] = flicks(t, 26.6, 1.1);
    s += phone(682, 432, 15, 0.8 + 0.2 * fk) + fig(J, { flame: 0.25, t, mood: 'tired' });
    return s + thread(flamePos(J), [682, 432], t, 0.3 + 0.7 * fk);
  }, { fi: 0.15, fo: 0.15, cam: STAND(600) });
  scene(32, 38, t => {
    let s = hud(140, '6h 31m');
    for (let i = 0; i < 9; i++) { const x = ((i * 170 - t * 120) % 1530 + 1530) % 1530 - 120; s += ln([x, 560], [x + 60, 560], '#2a2a2a', 3); }
    s += ln([0, 560], [1280, 560], '#1d1d1f', 2);
    const J = walk(620, 560, t * 6, { phone: true });
    const [fk] = flicks(t, 32.5, 1.0);
    s += phone(668, 430, 15, 0.8 + 0.2 * fk) + fig(J, { flame: 0.16, t, mood: 'tired' });
    s += thread(flamePos(J), [668, 430], t, 0.3 + 0.7 * fk);
    const D = walk(745, 560, t * 6 + 0.4); D.head = [D.head[0] - 22, D.head[1] + 6]; D.neck = [D.neck[0] - 10, D.neck[1]]; D.face = -1;
    return shadowFig(D, { k: 0.95, op: ramp(t, 32.4, 33.4) }) + s;
  }, { fi: 0.15, fo: 0.15, cam: STAND(660) });
  scene(38, 44, t => hud(201, '8h 57m') + bedScene(t, 38, 0.06, 1.1, '', '3:12 AM', 0.9), { fi: 0.15, fo: 0.15, cam: { x: 600, y: 345, k: 1.6 } });
  // điện thoại sập nguồn, màn hình đen phản chiếu
  scene(44, 50, t => {
    let s = hud(201, '9h 14m');
    const on = t < 46.2;
    s += glow(640, 360, 380, on ? 0.25 : 0.05, 'gC');
    s += `<rect x="470" y="70" width="340" height="590" rx="36" fill="${on ? '#1b2027' : '#060607'}" ${st(W, 4)}/>`;
    if (on) {
      s += `<rect x="500" y="110" width="280" height="510" rx="14" fill="#1b2027"/>`;
      const blink = Math.sin(t * 8) > 0;
      s += `<rect x="590" y="330" width="90" height="44" rx="6" fill="none" ${st(W, 4)}/><rect x="680" y="344" width="8" height="16" fill="${W}"/>`;
      if (blink) s += `<rect x="596" y="336" width="8" height="32" fill="${ORANGE}"/>`;
      s += txt(640, 410, '1%', { size: 24, c: ORANGE, w: 700 });
    } else {
      const r = ramp(t, 46.6, 48.2);
      s += `<g opacity="${0.55 * r}" transform="translate(632,600) scale(2.1) translate(-632,-600)">`;
      const J = slump(632, 600);
      s += shadowFig(whisperPose(560, 600, 1), { k: 1.0, op: 0.9 }) + fig(J, { c: '#8a8a8a', flame: 0.05, t });
      s += '</g>';
      const beat = Math.pow(Math.max(0, Math.sin((t - 46) * Math.PI / 0.9)), 8);
      s += glow(645, 340, 60 + 50 * beat, 0.3 * r * beat);
      s += `<path d="M500,120 L560,120 L520,250Z" fill="#ffffff" opacity="${0.04 * r}"/>`;
    }
    return s;
  }, { fi: 0.15, fo: 0.5 });

  // 4. Bước ngoặt: điện thoại đã tắt → không còn sợi lửa bị hút → FIRE % tự nhích 1→2→3 (tiếng tick) → Spark nhìn từ máy sang đốm lửa ·
  // kẻ thù mọc từ màn hình đen: "plug it in" → Spark đặt máy úp xuống bên giường → FIRE nhảy 5→8→12 → khum tay giữ lửa → đứng dậy → FOCUS vàng bay vào góc.
  const TURN_FIRE = t => t < 52.8 ? 1 : t < 53.8 ? 2 : t < 56.9 ? 3 : t < 57.4 ? 5 : t < 57.9 ? 8 : t < 58.6 ? 12 : 15;
  scene(50, 62, t => {
    let s = ground(140, 1140, 560) + bed(560, 490);
    s += ui(hudRaw(201, '', 1, TURN_FIRE(t)));
    const up = ramp(t, 58.8, 59.8);
    let J = sitChair(640, 560, { hand: [700, 448], hand2: [706, 446], look: 8 });
    J.hip = [640, 466]; J.lk = [690, 462]; J.rk = [696, 466]; J.lf = [694, 560]; J.rf = [700, 560];
    // nhìn máy (đầu cúi) → nhìn đốm lửa (ngẩng lên, quay sang)
    const look = ramp(t, 53.0, 53.8);
    J.head = mix([J.head[0], J.head[1] + 6], [J.head[0] + 4, J.head[1] - 4], look);
    const down = ramp(t, 56.3, 56.9);
    if (down > 0) { J.rh = mix(J.rh, [736, 476], down); J.re = mix(J.re, [714, 470], down); }
    const cup = ramp(t, 57.9, 58.5);
    if (cup > 0) { const fp0 = flamePos(J); J.lh = mix(J.lh, [fp0[0] - 6, fp0[1] + 14], cup); }
    if (up > 0) { const B = stand(660, 560, { look: 10 }); const fpB = flamePos(B); B.lh = [fpB[0] - 6, fpB[1] + 14]; const A = J; J = {}; for (const k in B) J[k] = Array.isArray(B[k]) ? mix(A[k], B[k], up) : B[k]; }
    fixArms(J);
    // điện thoại: tắt, trong tay → úp xuống mép giường
    if (t < 56.9) s += phone(J.rh[0] + 4, J.rh[1] - 14, 10, 0, 1);
    else s += `<rect x="726" y="474" width="34" height="8" rx="3" fill="#1b1e25"/>`;
    // kẻ thù mọc từ màn hình đen, thì thầm, rồi tan khi máy bị úp
    const born = ramp(t, 54.2, 55.4), gone = ramp(t, 56.9, 57.8);
    if (born > 0 && gone < 1) s = shadowFig(whisperPose(560, 560, 1), { k: 0.2 + 0.85 * born, op: born * (1 - gone), ax: lerp(706, 560, born), ay: lerp(440, 560, born) }) + s;
    const f = TURN_FIRE(t) / 100;
    s += fig(J, { flame: 0.05 + f * 1.6, t, mood: t > 57.4 ? 'fierce' : (t > 53.4 ? 'neutral' : 'sad') });
    const fp = flamePos(J);
    // tia nhỏ bung ra mỗi lần FIRE nhích
    // nhãn +% nổi lên cạnh đốm lửa mỗi lần FIRE nhích: thấy rõ "máy tắt → lửa tự hồi"
    for (const [tk, lb] of [[52.8, '+1%'], [53.8, '+1%'], [56.9, '+2%'], [57.4, '+3%'], [57.9, '+4%'], [58.6, '+3%']]) if (t > tk && t < tk + 1.1) {
      const q = (t - tk) / 1.1;
      s += `<text x="${fp[0] + 22}" y="${fp[1] - 24 - 26 * q}" fill="${ORANGE}" fill-opacity="${1 - q}" filter="url(#softGlow)" font-family="${MONO}" font-size="15" font-weight="700">${lb}</text>`;
    }
    for (const tk of [52.8, 53.8, 56.9, 57.4, 57.9, 58.6]) if (t > tk && t < tk + 0.5) { const q = (t - tk) / 0.5; for (let i = 0; i < 6; i++) s += `<circle cx="${fp[0] + Math.cos(i) * 26 * q}" cy="${fp[1] - 10 + Math.sin(i * 1.7) * 26 * q}" r="${2.2 * (1 - q)}" fill="${CORE}"/>`; }
    const fly = ramp(t, 60.8, 61.8);
    const fx = lerp(560, 1150, fly), fy = lerp(160, 72, fly), fs = lerp(84, 22, fly);
    s += ui(`<text x="${fx}" y="${fy}" fill="${YEL}" fill-opacity="${fade(t, 59.6, 62.2, 0.4, 0.01)}" filter="url(#yelGlow)" font-family="Inter" font-size="${fs}" font-weight="900" letter-spacing="${lerp(12, 3, fly)}" text-anchor="middle">FOCUS</text>`);
    return s;
  }, { cam: STAND(600) });

  // 5. Montage
  scene(62, 71, t => {
    let s = hud(1, '9h 14m', ramp(t, 66, 66.8)) + ground(140, 1140, 560);
    // tủ có ngăn kéo
    const dOpen = 1 - ramp(t, 65.0, 65.5);
    s += `<rect x="760" y="420" width="200" height="140" fill="#121214" ${st('#5a5a5a', 4)}/>`;
    s += `<rect x="${770 - 0}" y="${432}" width="180" height="50" fill="#18181a" ${st('#777', 3)} transform="translate(${-70 * dOpen},0)"/>`;
    s += ln([845 - 70 * dOpen, 457], [875 - 70 * dOpen, 457], '#999', 4);
    // Spark
    const k = ramp(t, 62.6, 64.6);
    const J = stand(690, 560, { look: 8 });
    const rest = [[712, 448], [718, 482]], reach = [[738, 462], [762, 456]];
    J.re = mix(rest[0], reach[0], k); J.rh = mix(rest[1], reach[1], k);
    if (t > 65.6) { const m = ramp(t, 65.6, 66.4); J.re = mix(reach[0], rest[0], m); J.rh = mix(reach[1], rest[1], m); }
    if (t > 67.2) { const m = ramp(t, 67.2, 68.0); J.le = mix(J.le, [700, 452], m); J.lh = mix(J.lh, [690, 476], m); }
    fixArms(J);
    const fl = t < 68 ? 0.05 : lerp(0.05, 0.28, ramp(t, 68, 69));
    if (t < 65.2) s += phone(J.rh[0] + 4, J.rh[1] - 18, 0, 0.5, 1 - ramp(t, 64.6, 65.0));
    s += fig(J, { flame: fl, t, mood: t > 68 ? 'fierce' : 'neutral' });
    if (t > 68 && t < 69.5) { const k2 = ramp(t, 68, 69.5); for (let i = 0; i < 10; i++) s += `<circle cx="${690 + Math.cos(i) * 70 * k2}" cy="${484 + Math.sin(i * 1.3) * 70 * k2}" r="${3 * (1 - k2)}" fill="${CORE}"/>`; }
    s = shadowFig(whisperPose(905, 560, -1), { k: lerp(1, 0.6, ramp(t, 67.5, 69)), op: fade(t, 62.6, 69.2, 0.6, 1.2) }) + s;
    return s;
  }, { cam: STAND(760) });
  scene(71, 79, t => {
    let s = hud(4, '6h 20m') + ground(140, 1140, 560) + chair(560, 560);
    s += `<path d="M700,250 L640,250 L560,420 L780,420Z" fill="${CORE}" opacity=".05"/>` + ln([700, 250], [700, 560], '#3a3a3a', 4) + `<path d="M660,250 L740,250 L726,226 L674,226Z" fill="#2a2a2c" ${st('#555', 3)}/>`;
    const J = sitChair(560, 560, { hand: [620, 440], hand2: [636, 438], look: 8 });
    s += fig(J, { flame: 0.36, t, mood: 'neutral', blink: (t % 3.3) < 0.12 });
    s += books(628, 440, 1);
    const flip = ((t - 71) % 3) / 3;
    if (flip < 0.25) { const k = flip / 0.25; s += `<path d="M628,446 Q${628 + 46 * Math.cos(k * Math.PI)},${412 - 20 * Math.sin(k * Math.PI)} ${628 + 46 * Math.cos(k * Math.PI)},${412}" fill="none" ${st(W, 2)}/>`; }
    return s;
  }, { cam: STAND(610) });
  scene(79, 87, t => {
    let s = hud(11, '4h 05m');
    s += `<defs><linearGradient id="dawnRun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1210"/><stop offset=".75" stop-color="#5a3420"/><stop offset="1" stop-color="#8a5228"/></linearGradient></defs>`;
    s += `<rect x="-200" y="100" width="1700" height="460" fill="url(#dawnRun)"/>`;
    // nhà xa (chậm), nhà gần (nhanh) — trôi sang trái
    const row = (speed, base, hgt, col, win, seed) => {
      let r = '';
      for (let i = 0; i < 14; i++) {
        const w = 70 + 40 * rnd(i + seed), h = hgt * (0.55 + 0.45 * rnd(i * 3 + seed));
        const x = (((i * 120 - t * speed) % 1680) + 1680) % 1680 - 300;
        r += `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${col}" stroke="#2a201b" stroke-width="2"/>`;
        for (let j = 0; j < 4; j++) if (rnd(i * 7 + j + seed) > 0.45) r += `<rect x="${x + 12 + (j % 2) * (w / 2 - 6)}" y="${base - h + 18 + Math.floor(j / 2) * 34}" width="${w / 2 - 22}" height="14" fill="${win}" opacity=".85"/>`;
      }
      return r;
    };
    s += row(40, 560, 300, '#2b2320', '#d6a25c', 11) + row(110, 560, 210, '#221b19', '#e8b468', 37);
    s += `<rect x="-200" y="560" width="1700" height="160" fill="#14100e"/>` + ln([-200, 560], [1500, 560], '#3a2c22', 3);
    // vệt vàng kéo theo sau bước chạy
    s += `<rect x="-200" y="557" width="${200 + 548}" height="5" rx="2.5" fill="${YEL}" opacity=".85" filter="url(#yelGlow)"/>`;
    for (let i = 0; i < 8; i++) { const x = 548 - (((t * 110) + i * 70) % 560); s += `<ellipse cx="${x}" cy="559" rx="12" ry="3.5" fill="${YEL}" opacity="${0.5 * (1 - (548 - x) / 560)}" filter="url(#yelGlow)"/>`; }
    return s + fig(run(560, 560, t * 10), { flame: 0.5, t, mood: 'happy' });
  }, { cam: STAND(600) });
  scene(87, 95, t => {
    let s = hud(23, '2h 40m') + ground(140, 1140, 560) + desk(760, 560) + chair(560, 560);
    const buzz = [88.5, 91.0, 93.5].some(b => t > b && t < b + 0.6);
    const jx = buzz ? Math.sin(t * 90) * 3 : 0;
    s += phone(780 + jx, 418, 90, buzz ? 1 : 0.3, 1, 22, 40);
    if (t > 88.5) s += `<rect x="788" y="392" width="40" height="20" rx="10" fill="#d0d0d0"/>` + txt(808, 407, '99+', { size: 13, c: BG, w: 800 });
    const J = sitChair(560, 560, { hand: [650 + Math.sin(t * 9) * 8, 428], hand2: [640, 430], look: 10 });
    s = shadowFig(whisperPose(860, 560, -1), { k: 0.75, op: 0.85 * fade(t, 88.4, 93.6, 0.6, 1.4) }) + s;
    s += `<rect x="610" y="424" width="90" height="6" fill="${W}" opacity=".85"/>`;
    s += fig(J, { flame: 0.62, t, mood: 'fierce' });
    return s;
  }, { cam: STAND(690) });
  scene(95, 103, t => {
    let s = hud(37, '1h 30m') + `<path d="M140,560 Q640,520 1140,560" fill="none" ${st('#2a2a2a', 3)}/>`;
    const L = stand(520, 556, { look: 8 }), R = stand(760, 556, { look: -8 });
    const wave = Math.sin(t * 4) * 16;
    L.re = [546, 426 + wave]; L.rh = [576, 400 + wave]; R.le = [734, 424 - wave]; R.lh = [706, 404 - wave];
    s += fig(L, { c: '#b9b5ad' }) + fig(R, { c: '#b9b5ad' });
    const J = stand(640, 548);
    J.le = [612, 440]; J.lh = [596, 410 + Math.sin(t * 4 + 1) * 10];
    return s + fig(J, { flame: 0.78, t, mood: 'happy' });
  }, { cam: STAND(640) });
  scene(103, 112, t => {
    let s = hud(60, '1h 05m') + ground(140, 1140, 560);
    s += ln([800, 300], [760, 560], '#5a5a5a', 4) + ln([800, 300], [850, 560], '#5a5a5a', 4) + ln([800, 300], [800, 560], '#3a3a3a', 3);
    s += `<rect x="720" y="300" width="170" height="130" fill="#141416" ${st(W, 3)}/>`;
    const p = ramp(t, 103.5, 111);
    const strokes = [[735, 400, 780, 340], [760, 410, 830, 330], [790, 400, 875, 350], [740, 330, 875, 320], [745, 415, 870, 415]];
    strokes.forEach(([x1, y1, x2, y2], i) => { const k = clamp(p * strokes.length - i); if (k > 0) s += ln([x1, y1], [lerp(x1, x2, k), lerp(y1, y2, k)], i % 2 ? ORANGE : W, 4); });
    const J = stand(660, 560, { look: 10 });
    J.re = [690, 440]; J.rh = [lerp(712, 726, (Math.sin(t * 3) + 1) / 2), 400 + 18 * Math.sin(t * 2.1)];
    fixArms(J);
    const tip = [J.rh[0] + 30, J.rh[1] - 10];
    s += fig(J, { flame: 0.9, t, mood: 'fierce' });
    return s + ln(J.rh, tip, WOOD, 4) + `<circle cx="${tip[0]}" cy="${tip[1]}" r="4" fill="${ORANGE}"/>`;
  }, { cam: STAND(720) });

  // 6. Trận cuối: 112–116 đứng im, chỉ nhịp tim; kẻ thù mọc từ ánh điện thoại · 116–121 thì thầm dồn dập, lửa teo ·
  // 121–122.2 dừng nghĩ (đẩy vào mặt) · 122.2–122.8 lao · 122.8–124.2 bị đẩy lùi · 124.2–125.4 nhích dần, nhanh dần · 125.4 vỡ (chớp + rung)
  const XPOS = t => { let x = 470; x = lerp(x, 560, ramp(t, 122.2, 122.8)); x = lerp(x, 500, ramp(t, 122.8, 123.6)); x = lerp(x, 640, Math.pow(clamp((t - 124.2) / 1.2), 1.8)); return x; };
  scene(112, 130, t => {
    let s = ground(-200, 1500, 560);
    const grow = ramp(t, 113, 118), broke = t >= 125.4, shatter = ramp(t, 125.4, 126.6);
    if (t < 126.6) s += shadowFig(whisperPose(790, 560, -1), { k: 0.3 + 1.5 * grow, op: (broke ? 1 - shatter : 1) * ramp(t, 112.6, 113.4), jitter: broke ? 30 * (1 - shatter) : (t > 122.8 && t < 123.6 ? 4 : 0), ax: lerp(800, 790, grow), ay: 560 });
    if (!broke) s += phone(800, 552, 90, 1, 1, 26, 48);
    else s += `<rect x="776" y="548" width="48" height="10" rx="3" fill="#1b1e25"/>`;
    if (!broke) for (let i = 0; i < 6; i++) {
      const tp = 112.3 + i * 0.5; if (t < tp) continue;
      const k = clamp((t - tp) / 0.4), fadeO = 1 - ramp(t, 120.5, 121.5);
      s += `<rect x="${850 + (i % 2) * 24}" y="${500 - i * 30 - 8 * k}" width="110" height="22" rx="11" fill="#252a31" opacity="${k * fadeO}"/><circle cx="${866 + (i % 2) * 24}" cy="${511 - i * 30 - 8 * k}" r="5" fill="#59626e" opacity="${k * fadeO}"/>`;
    }
    let fl = 0.9; fl = lerp(fl, 0.4, ramp(t, 116, 121)); fl = lerp(fl, 0.7, ramp(t, 121.2, 122.2)); fl = lerp(fl, 0.45, ramp(t, 122.8, 123.4)); fl = lerp(fl, 1.3, ramp(t, 124.2, 125.4));
    const x = XPOS(t);
    let J = t < 121 ? slump(x, 560) : (t < 122.2 ? stand(x, 560, { look: 10 }) : run(x, 560, t * (t > 124.2 ? 14 : 9)));
    if (t > 122.8 && t < 124.2) { J = stand(x, 560, { lean: -10, look: 10 }); J.le = [x + 20, 470]; J.lh = [x + 46, 452]; J.re = [x + 24, 474]; J.rh = [x + 50, 460]; }
    if (t >= 125.4) { J = armsUp(x, 560, ramp(t, 125.4, 126)); J.look = 10; }
    s += fig(J, { flame: fl, t, mood: t > 121 ? 'fierce' : 'sad' });
    // vệt tốc độ khi lao
    if (t > 122.2 && t < 122.8 || t > 124.6 && t < 125.4) for (let i = 0; i < 5; i++) s += ln([x - 60 - i * 6, 420 + i * 22], [x - 140 - i * 10, 420 + i * 22], '#cfc6b8', 2, 0.5);
    if (broke) { const w = shatter; s += `<circle cx="${x + 40}" cy="440" r="${60 + 1100 * w}" fill="none" ${st(YEL, 8, 0.7 * (1 - w))}/>`; }
    if (t > 125.4 && t < 125.62) s += ui(`<rect width="1280" height="720" fill="#fff" opacity="${0.85 * (1 - (t - 125.4) / 0.22)}"/>`);
    return s;
  }, { cam: t => {
    const wide = ramp(t, 113, 117.5) * (1 - ramp(t, 121, 121.6)), face = ramp(t, 121, 121.6) * (1 - ramp(t, 122.1, 122.3));
    const after = ramp(t, 125.4, 128.5);
    let k = 1.6 - 0.45 * wide + 1.0 * face, x = lerp(lerp(560, 640, wide), XPOS(t) + 10, face), y = 560 - 250 / k;
    if (face > 0) y = lerp(y, 380, face);
    if (t > 122.2) { k = lerp(1.35, 1.7, after); x = lerp(640, XPOS(t), after); y = 560 - 250 / k; }
    return { x, y, k };
  } });

  // 7. Kết
  scene(130, 144, t => {
    const sun = ramp(t, 130, 138);
    let s = `<defs><linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BG}"/><stop offset=".7" stop-color="#1a1209"/><stop offset="1" stop-color="#3a2410"/></linearGradient></defs>`;
    s += ui(`<rect width="1280" height="720" fill="url(#dawn)" opacity="${0.4 + 0.6 * sun}"/>`);
    s += `<circle cx="770" cy="${600 - 60 * sun}" r="40" fill="${CORE}" opacity="${0.55 * sun}"/>` + glow(770, 600 - 60 * sun, 150, 0.35 * sun);
    s += `<path d="M-20,600 Q500,500 1300,600 L1300,720 L-20,720Z" fill="${BG}" ${st('#3a2a1a', 3)}/>`;
    s += fig(sitGround(700, 554), { c: '#b9b5ad' });
    s += fig(sitGround(545, 556), { flame: 1.0, t, mood: 'happy', blink: (t % 4) < 0.12 });
    s += ui(txt(640, 120, 'Your attention is your fire.', { size: 44, w: 600, op: fade(t, 132.4, 138.6, 0.8, 0.6) }) + `<text x="640" y="120" fill="${YEL}" fill-opacity="${fade(t, 139.2, 143.6, 0.6, 0.6)}" filter="url(#yelGlow)" font-family="Inter" font-size="52" font-weight="800" text-anchor="middle">Guard it.</text>`);
    return s;
  }, { fi: 0.8, fo: 0.8, cam: { x: 640, y: 556 - 250 / 1.6, k: 1.6 } });
  scene(144, 150, t => {
    let s = `<text x="640" y="360" fill="${YEL}" fill-opacity="${fade(t, 144.6, 149.2, 0.8, 0.8)}" filter="url(#yelGlow)" font-family="Inter" font-size="92" font-weight="800" letter-spacing="22" text-anchor="middle">SCROLL</text>`;
    for (let i = 0; i < 4; i++) s += `<rect x="${560 + i * 44}" y="384" width="28" height="4" fill="${YEL}" opacity="${fade(t, 145.0 + i * 0.15, 149.2, 0.3, 0.8)}"/>`;
    s += txt(640, 410, 'an animated short film', { size: 22, c: MUTED, ls: 6, op: fade(t, 145.4, 149.2, 0.8, 0.8) });
    s += flame(640, 520, 0.32, t, fade(t, 146.0, 149.2, 0.6, 0.8)) + txt(640, 572, 'Keep the fire.', { size: 20, c: ORANGE, w: 600, ls: 4, op: fade(t, 146.4, 149.2, 0.6, 0.8) });
    return s;
  }, { fi: 0.6, fo: 0.01 });


  // ---------- lời thì thầm của cái bóng: [giây bắt đầu, câu, x, y, thời lượng] ----------
  const WH = [
    [8.4, 'just one more'], [11.4, 'sleep later'],
    [15.2, 'one more video'],
    [21.0, 'study tomorrow'], [23.6, 'you deserve a break'],
    [28.0, "they're boring"],
    [34.0, 'everyone does it'],
    [39.2, "you're too tired"], [41.8, 'why even try?'],
    [47.4, 'this is who you are', 2.3],
    [55.0, 'plug it in', 1.8],
    [63.0, 'just check once'], [64.9, "you'll be back"], [66.6, "you can't last a day"],
    [89.0, 'it might be important'], [91.6, 'someone texted you'],
    [116.0, "you're missing out", 6.0], [117.0, "everyone's online", 5.0], [118.0, 'just one', 4.0],
    [118.9, 'you deserve it', 3.1], [119.8, "you'll fail again", 2.2], [120.6, 'you need me', 1.4],
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
      x = Math.min(1236, Math.max(44, x)); y = Math.min(650, Math.max(70, y));
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

  window.DURATION = DUR;
  window.WHISPERS = WH;
  const SHAKES = [[65.5, 0.25, 5], [125.4, 0.7, 16], [122.8, 0.3, 6]];
  window.frame = function (t) {
    let body = '';
    ENEMY = null;
    const seed = Math.floor(t * 8) % 9; // nét rung vẽ lại mỗi 3 khung
    const defs = DEFS.replace('seed="4"', `seed="${seed + 1}"`).replace('seed="77"', `seed="${seed + 30}"`);
    for (const sc of S) {
      if (t < sc.a || t >= sc.b) continue;
      const o = Math.min(clamp((t - sc.a) / sc.fi), clamp((sc.b - t) / sc.fo));
      const c0 = typeof sc.cam === 'function' ? sc.cam(t) : (sc.cam || { x: 640, y: 360, k: 1 });
      const push = sc.a === 112 ? 1 : 1 + 0.08 * clamp((t - sc.a) / (sc.b - sc.a)); // camera không bao giờ ngủ
      let sx = 0, sy = 0;
      for (const [ts, dur, amp] of SHAKES) if (t >= ts && t < ts + dur) { const e = 1 - (t - ts) / dur; sx += Math.sin(t * 97) * amp * e; sy += Math.cos(t * 83) * amp * e; }
      CAM = { x: c0.x + sx / (c0.k * push), y: c0.y + sy / (c0.k * push), k: c0.k * push };
      HUD_FOCUS = sc.a >= 62 && sc.a < 112;
      body += `<g opacity="${o}"><g transform="translate(640,360) scale(${CAM.k}) translate(${-CAM.x},${-CAM.y})">${sc.fn(t)}</g></g>`;
    }
    body += whispers(t);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1280 720">${defs}<rect width="1280" height="720" fill="${BG}"/>${body}<rect width="1280" height="720" filter="url(#grain)" opacity=".5"/>` +
      `<rect width="1280" height="720" fill="url(#vig)"/><rect width="1280" height="36" fill="#000"/><rect y="684" width="1280" height="36" fill="#000"/></svg>`;
  };
})();
