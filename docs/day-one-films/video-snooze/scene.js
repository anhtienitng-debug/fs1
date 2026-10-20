// SNOOZE — vẽ khung hình tại thời điểm t (giây). Chạy trong trình duyệt: window.frame(t) → chuỗi SVG. Bộ nhân vật lấy từ SCROLL.
(function () {
  const W = '#f4f1ea', BG = '#0d0a09', MUTED = '#8d8a84', GREY = '#55534f';
  const ORANGE = '#ff8a1f', CORE = '#ffd166', EMBER = '#7a4a22', SMOKE = '#3a3a3a', COLD = '#bcd7ff';
  const DUR = 143.8;

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
    if (mood === 'asleep') { // ngủ say: mắt nhắm cong, mày giãn, miệng hé tròn
      return s + `<path d="M${ex - 5},${ey} Q${ex},${ey + 4.5} ${ex + 5},${ey}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>` + L([ex - 7 * d, ey - 12], [ex + 6 * d, ey - 12], 2.6) +
        `<ellipse cx="${x + 9 * d}" cy="${y + 14}" rx="2.6" ry="2.2" fill="${c}"/>`;
    }
    if (mood === 'drowsy') { // ngái ngủ: mắt lim dim nửa vành, mày giãn, miệng ngáp nhỏ
      return s + `<path d="M${ex - 4.5},${ey} Q${ex},${ey + 5.5} ${ex + 4.5},${ey}Z" fill="${c}"/>` + L([ex - 6, ey], [ex + 6, ey], 3.2) + L([ex - 7 * d, ey - 13], [ex + 6 * d, ey - 12], 2.6) +
        `<ellipse cx="${x + 9 * d}" cy="${y + 14}" rx="3" ry="3.6" fill="${c}"/>`;
    }
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
    if (Math.abs(J.hip[0] - J.neck[0]) > Math.abs(J.hip[1] - J.neck[1])) return [J.head[0] - 6, J.head[1] - 92]; // đang nằm: lửa cao trên con số ngày
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
      le: [x + 4 - 12 * a, g - 110], lh: [x + 22 - 18 * a, g - 92 + 6 * a], re: [x + 4 + 12 * a, g - 110], rh: [x + 22 + 18 * a, g - 92 - 6 * a],
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
  const SI = []; // cảnh của đoạn chèn (tính theo giờ thật)
  const scene = (a, b, fn, fx = {}) => (fx.ins ? SI : S).push({ a, b, fn, fi: 0.1, fo: fx.fo ?? 0.03, cam: fx.cam, nopush: fx.nopush });

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

  // ================= SNOOZE =================
  const GRAPH = '#3a3632', SUNC = '#f2b544', CAPC = '#3b6bd6', BEARD = '#f2eee6', GPA = '#d6cbbb';
  // bảng ghép: [từ, đến, chèn?] theo giờ phim gốc. Bỏ 42–58 (nhiều đồng hồ), 92–98 (kéo rèm), 116–132 (bóng giữ chân);
  // chèn 72–78 (cảnh {ins:true}: thấy số của ông ở đám tang)
  // v4: thêm gieo bà cụ (42–45, 45–48), sáng chủ nhật tự chọn (116–121.5), Spark một mình rót hai ly ca cao (122–128); bỏ 38.5–42 và 147.4–150.6
  const EDL = [[0, 35], [42, 45], [35, 38.5], [45, 48], [58, 72], [72, 78, 1], [72, 92], [98, 116], [116, 121.5], [132, 147.4], [122, 128], [150.6, 165]];
  const mapT = T => { let acc = 0; for (const [a, b, ins] of EDL) { if (T < acc + b - a) return { t: a + (T - acc), ins: !!ins }; acc += b - a; } return { t: 165, ins: false }; };
  const toReal = t => { let acc = 0; for (const [a, b, ins] of EDL) { if (!ins && t >= a && t < b) return acc + t - a; acc += b - a; } return null; };
  // ---------- đạo cụ ----------
  // đồng hồ báo thức chuông cơ: (x,g) = đáy; ring 0..1 = đang reo (rung); time = chuỗi giờ
  function alarm(x, g, ring = 0, t = 0, k = 1) {
    const jx = ring ? Math.sin(t * 70) * 3 * ring : 0;
    let s = `<g transform="translate(${x + jx},${g}) scale(${k})">`;
    s += ln([-12, 0], [-16, 8], '#8a8478', 3) + ln([12, 0], [16, 8], '#8a8478', 3);
    s += `<circle cx="-14" cy="-34" r="9" fill="#c9c2b4" stroke="#6a6458" stroke-width="2"/><circle cx="14" cy="-34" r="9" fill="#c9c2b4" stroke="#6a6458" stroke-width="2"/>`;
    s += `<circle cx="0" cy="-16" r="18" fill="#e8e2d4" stroke="#6a6458" stroke-width="3"/><circle cx="0" cy="-16" r="2" fill="${GRAPH}"/>` + ln([0, -16], [0, -28], GRAPH, 2.4) + ln([0, -16], [8, -12], GRAPH, 2.4);
    s += `<rect x="-4" y="-46" width="8" height="5" rx="2" fill="#6a6458"/>`;
    if (ring) for (let i = 0; i < 3; i++) s += `<path d="M${-30 - i * 7},${-40 + i * 2} q-6,8 0,16 M${30 + i * 7},${-40 + i * 2} q6,8 0,16" fill="none" stroke="#e8e2d4" stroke-width="2" opacity="${ring * (0.8 - i * 0.2)}"/>`;
    return s + '</g>';
  }
  const sunIcon = (x, y, r, o = 1, c = SUNC) => `<g opacity="${o}">` + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return ln([x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35], [x + Math.cos(a) * r * 1.8, y + Math.sin(a) * r * 1.8], c, Math.max(1, r * 0.3)); }).join('') + `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/></g>`;
  // lọ "MISSED": n mặt trời nhỏ bị nhốt; open 0..1 = nắp mở
  function jar(x, g, n, t = 0, o = {}) {
    let s = `<rect x="${x - 26}" y="${g - 70}" width="52" height="70" rx="10" fill="#9fc0d8" opacity=".18" stroke="#c8dce8" stroke-width="2.5"/>`;
    for (let i = 0; i < Math.min(n, 24); i++) { const px = x - 16 + (i % 4) * 10.5 + 2 * Math.sin(t * 2 + i), py = g - 8 - Math.floor(i / 4) * 10 + 1.5 * Math.cos(t * 3 + i); s += sunIcon(px, py, 2.6, 0.55 + 0.35 * Math.sin(t * 2 + i * 1.7)); }
    s += `<rect x="${x - 20}" y="${g - 44}" width="40" height="16" fill="${PAPER}" opacity=".9"/>` + txt(x, g - 32, 'MISSED', { size: 8, c: GRAPH, w: 800, ls: 1 });
    const op = o.open || 0;
    if (op >= 1) s += `<rect x="${x + 30}" y="${g - 10}" width="56" height="10" rx="3" fill="#8a7a60" stroke="#5a4a30" stroke-width="1.5"/>`; // nắp nằm trên kệ
    else s += `<g transform="rotate(${110 * op} ${x + 26} ${g - 72})"><rect x="${x - 28}" y="${g - 80}" width="56" height="10" rx="3" fill="#8a7a60" stroke="#5a4a30" stroke-width="1.5"/></g>`;
    return s;
  }
  // cửa sổ có rèm (bên phải phòng); sky: 0 tối → 1 bình minh; curtain 0 = đóng kín · 1 = mở hết
  function windowR(x, y, sky, curtain = 0.25) {
    const w = 150, h = 130;
    let s = `<defs><linearGradient id="dawnW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky > 0.5 ? '#6a7ab0' : '#141a2e'}"/><stop offset="1" stop-color="${sky > 0.5 ? '#f4c890' : '#2a2a48'}"/></linearGradient></defs>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#dawnW)" stroke="#6b6760" stroke-width="4"/>`;
    if (sky > 0) s += `<circle cx="${x + 100}" cy="${y + h - 10}" r="${14 * sky}" fill="#ffd9a0" opacity="${sky}"/>`;
    s += ln([x + w / 2, y], [x + w / 2, y + h], '#6b6760', 3) + ln([x, y + h / 2], [x + w, y + h / 2], '#6b6760', 3);
    const cw = (w / 2 + 10) * (1 - curtain);
    s += `<path d="M${x - 10},${y - 10} L${x - 10 + cw},${y - 10} L${x - 14 + cw},${y + h + 16} L${x - 10},${y + h + 16}Z" fill="#3a3a5a" stroke="#2a2a44" stroke-width="2"/>`;
    s += `<path d="M${x + w + 10},${y - 10} L${x + w + 10 - cw},${y - 10} L${x + w + 14 - cw},${y + h + 16} L${x + w + 10},${y + h + 16}Z" fill="#3a3a5a" stroke="#2a2a44" stroke-width="2"/>`;
    return s + ln([x - 20, y - 12], [x + w + 20, y - 12], '#5a5048', 4);
  }
  // ông nội: râu bạc, mũ len xanh có quả bông, lưng hơi còng
  function gpa(J, o = {}) {
    const d = dirOf(J), [hx, hy] = J.head;
    return fig(J, { c: GPA, mood: o.mood || 'happy', flame: o.flame, t: o.t }) +
      `<ellipse cx="${hx + 8 * d}" cy="${hy + 20}" rx="17" ry="13" fill="${BEARD}" stroke="#c8c0b0" stroke-width="1.5"/>` +
      `<path d="M${hx - 31},${hy - 4} Q${hx},${hy - 50} ${hx + 31},${hy - 4}Z" fill="${CAPC}" stroke="#22388a" stroke-width="2"/><circle cx="${hx}" cy="${hy - 38}" r="7" fill="#e8e8f0"/>`;
  }
  const bentPose = (x, g, d = 1) => { const J = stand(x, g, { look: 8 * d }); J.head = [x + 20 * d, g - 186]; J.neck = [x + 12 * d, g - 152]; if (d < 0) J.face = -1; return J; };
  const rod = (h, tip, waterY) => ln(h, tip, '#6a5038', 3) + `<path d="M${tip[0]},${tip[1]} Q${tip[0] + 14},${(tip[1] + waterY) / 2} ${tip[0] + 22},${waterY}" fill="none" stroke="#d8d0c0" stroke-width="1"/>`;
  function nightstand(x, g) { return `<rect x="${x - 34}" y="${g - 70}" width="68" height="70" fill="#2a2420" stroke="#4a4036" stroke-width="2"/>` + ln([x - 34, g - 40], [x + 34, g - 40], '#4a4036', 2); }
  function shelf(x, y, w = 160) { return `<rect x="${x - w / 2}" y="${y}" width="${w}" height="8" fill="#6a5038"/>` + ln([x - w / 2 + 14, y + 8], [x - w / 2 + 24, y + 22], '#4a3a28', 3) + ln([x + w / 2 - 14, y + 8], [x + w / 2 - 24, y + 22], '#4a3a28', 3); }
  const BEDX = 560, BEDY = 490, CLK = [300, 490], WIN = [800, 250], JAR = [600, 330];
  // phòng ngủ: giường, tủ đầu giường + đồng hồ, kệ + lọ, cửa sổ
  function bedroom(t, o = {}) {
    let s = `<rect x="-600" y="-400" width="2600" height="960" fill="${o.light ? '#2a2420' : '#0f0e14'}"/>` + room();
    s += windowR(WIN[0], WIN[1], o.sky ?? 0, o.curtain ?? 0.25);
    s += shelf(JAR[0], JAR[1]) + jar(JAR[0], JAR[1], o.jarN ?? 0, t, { open: o.jarOpen || 0 });
    if (o.photos) for (let i = 0; i < o.photos; i++) { const px = 120 + i * 46, py = 280 + (i % 2) * 22; s += `<rect x="${px}" y="${py}" width="38" height="28" fill="#f0e2c8" stroke="#8a7a60" stroke-width="1.5" transform="rotate(${(rnd(i) - 0.5) * 10} ${px + 19} ${py + 14})"/><rect x="${px + 3}" y="${py + 3}" width="32" height="15" fill="${o.photoLit ? '#e8a060' : '#6a5a48'}"/><circle cx="${px + 22}" cy="${py + 16}" r="4" fill="${o.photoLit ? '#ffe0a0' : '#8a7a60'}"/>`; }
    s += nightstand(CLK[0], 560) + (o.clock !== false ? alarm(CLK[0], CLK[1], o.ring || 0, t) : '') + bed(BEDX, BEDY);
    return s;
  }
  // Spark nằm; reach 0..1 = vươn tay tới nút báo lại
  function lying(t, reach = 0, o = {}) {
    const J = lieBed(580, BEDY);
    const btn = [CLK[0], CLK[1] - 48];
    if (reach > 0) { J.rh = mix([J.head[0] + 20, J.head[1] + 30], btn, reach); J.re = mix(J.re, [J.head[0] - 30, J.head[1] - 20], reach); J.lh = [J.hip[0] - 30, J.hip[1] - 6]; J.le = [J.hip[0] - 50, J.hip[1] - 16]; }
    else { J.lh = [J.hip[0] - 30, J.hip[1] - 6]; J.le = [J.hip[0] - 50, J.hip[1] - 16]; J.rh = [J.head[0] + 30, J.head[1] + 26]; J.re = [J.head[0] + 50, J.head[1] + 14]; }
    fixArms(J);
    const mood = o.mood || 'asleep';
    let s = fig(J, { flame: o.flame, t, mood, blink: o.blink });
    if (mood === 'asleep' && !o.cover) for (let i = 0; i < 3; i++) { const k = ((t * 0.45 + i / 3) % 1); s += `<text x="${J.head[0] - 62 - 22 * k}" y="${J.head[1] - 20 - 46 * k}" fill="#8d8a84" fill-opacity="${Math.sin(Math.PI * k) * 0.8}" font-family="Inter" font-size="${10 + 8 * k}" font-weight="800">z</text>`; }
    if (o.blanket !== false) s += `<path d="M${J.neck[0] + 10},${BEDY - 22} Q${BEDX + 60},${BEDY - 70 - (o.lump || 0)} ${BEDX + 190},${BEDY - 14} L${BEDX + 190},${BEDY + 6} L${J.neck[0] + 10},${BEDY + 6}Z" fill="#4a5a7a" stroke="#2a3448" stroke-width="2"/>`;
    if (o.cover) s += `<ellipse cx="${J.head[0]}" cy="${J.head[1] - 4}" rx="40" ry="34" fill="#4a5a7a" stroke="#2a3448" stroke-width="2" opacity="${o.cover}"/>`;
    if (reach > 0) s += handDot(J.rh);
    return { s, J };
  }
  // bến câu lúc bình minh
  function pier(t, o = {}) {
    const rise = o.rise ?? 0.6;
    let s = `<defs><linearGradient id="skyD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a50"/><stop offset=".6" stop-color="#b06a6a"/><stop offset="1" stop-color="#f4b878"/></linearGradient>` +
      `<linearGradient id="seaD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a5070"/><stop offset="1" stop-color="#1a1a30"/></linearGradient></defs>`;
    s += `<rect x="-600" y="-400" width="2600" height="880" fill="url(#skyD)"/>`;
    const sy = 480 - 70 * rise;
    s += glow(980, sy, 380, 0.5) + `<circle cx="980" cy="${sy}" r="40" fill="#ffd9a0"/>`;
    s += `<rect x="-600" y="478" width="2600" height="500" fill="url(#seaD)"/>`;
    for (let i = 0; i < 10; i++) { const w = 80 - i * 7; s += `<rect x="${980 - w / 2 + 8 * Math.sin(t * 1.3 + i)}" y="${486 + i * 9}" width="${w}" height="3" rx="1.5" fill="#ffd9a0" opacity="${0.7 - i * 0.06}"/>`; }
    for (let i = 0; i < 4; i++) { const bx = 300 + i * 70 + t * 12, by = 200 + 14 * i + 4 * Math.sin(t * 3 + i); s += `<path d="M${bx - 9},${by} q5,-6 9,0 q4,-6 9,0" fill="none" stroke="#3a2a34" stroke-width="2.2" stroke-linecap="round"/>`; }
    // cầu tàu gỗ
    const p0 = o.px0 ?? -700, pw = o.pw ?? 2600; // cầu tàu dài từ bờ, chạy hết khung hình
    s += `<rect x="${p0}" y="548" width="${pw}" height="14" fill="#6a4a30" stroke="#3a2a1a" stroke-width="2"/>`;
    for (let x = p0 + 20; x < p0 + pw; x += 90) s += ln([x, 562], [x, 680], '#3a2a1a', 8);
    for (let x = p0; x < p0 + pw; x += 30) s += ln([x, 549], [x, 561], '#4a3420', 1.2);
    return s;
  }
  function foldChair(x, g, open = 1) {
    if (open < 0.05) return `<rect x="${x - 6}" y="${g - 80}" width="12" height="80" rx="3" fill="#3b6bd6"/>`;
    return ln([x - 22 * open, g], [x + 22 * open, g - 60], '#8a8a96', 3) + ln([x + 22 * open, g], [x - 22 * open, g - 60], '#8a8a96', 3) + `<rect x="${x - 26 * open}" y="${g - 64}" width="${52 * open}" height="8" fill="#3b6bd6"/>` + ln([x - 24 * open, g - 64], [x - 28 * open, g - 120], '#8a8a96', 3) + `<rect x="${x - 30 * open}" y="${g - 118}" width="${8}" height="50" fill="#3b6bd6" opacity=".9"/>`;
  }
  function hudS(fire, m, o = 1) {
    if (o <= 0) return '';
    const c = fire > 8 ? ORANGE : '#7b7872';
    let s = `<text x="48" y="70" fill="${c}" fill-opacity="${o}" font-family="${MONO}" font-size="16" font-weight="700" letter-spacing="3" filter="url(#softGlow)">FIRE <tspan font-size="24" letter-spacing="0">${fire}%</tspan></text>`;
    if (m && m.rise !== undefined) s += `<text x="1232" y="72" fill="${YEL}" fill-opacity="${o}" filter="url(#yelGlow)" font-family="${MONO}" font-size="18" font-weight="700" letter-spacing="2" text-anchor="end">SUNRISES <tspan font-size="24">${m.rise}</tspan></text>` + sunIcon(1050, 64, 6, o, YEL);
    else if (m) s += `<text x="1232" y="72" fill="#8d8a84" fill-opacity="${o}" font-family="${MONO}" font-size="18" font-weight="700" letter-spacing="3" text-anchor="end">SNOOZE ×<tspan font-size="24" fill="#cfcbc2">${m.sn}</tspan></text>` +
      `<text x="1232" y="98" fill="#8d8a84" fill-opacity="${o}" font-family="${MONO}" font-size="13" letter-spacing="3" text-anchor="end">MISSED ${m.mi}</text>` + sunIcon(1128, 93, 4, o, '#b0905a');
    return ui(s);
  }
  const SN = t => Math.round(t < 7.2 ? 0 : t < 14 ? 1 : t < 42 ? lerp(2, 38, ramp(t, 14, 41)) : lerp(38, 52, ramp(t, 42, 57)));
  const MI = t => Math.round(t < 9.2 ? 0 : t < 14 ? 1 : t < 42 ? lerp(2, 21, ramp(t, 14, 41)) : 21);
  const FIRES = t => Math.round(t < 9 ? 70 : t < 14 ? 66 : t < 42 ? lerp(64, 30, ramp(t, 14, 41)) : t < 58 ? lerp(30, 10, ramp(t, 42, 57)) : 4);
  // mặt trời nhỏ bay từ cửa sổ vào lọ
  // ---------- số ngày còn sống trên đầu mỗi người ----------
  const SPARK0 = 21915, GPA0 = 60; // ngày 0: Spark 21,915 · ông 60
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  // J = tư thế; n = số; o.k = cỡ chữ; o.op; o.c = màu; o.dy = nâng thêm
  function life(J, n, o = {}) {
    const lyingP = Math.abs(J.hip[0] - J.neck[0]) > Math.abs(J.hip[1] - J.neck[1]);
    const x = lyingP ? J.head[0] - 6 : J.head[0], y = lyingP ? J.head[1] - 48 : J.head[1] - 56 - (o.dy || 0);
    const sz = 14 * (o.k || 1), op = o.op ?? 0.9;
    if (op <= 0) return '';
    return `<text x="${x}" y="${y}" fill="${o.c || '#e4ddcf'}" fill-opacity="${op}" font-family="${MONO}" font-size="${sz}" font-weight="700" text-anchor="middle" letter-spacing="1"${o.glow ? ' filter="url(#softGlow)"' : ''}>${typeof n === 'number' ? fmt(n) : n}</text>`;
  }
  const sparkN = d => SPARK0 - d, gpaN = d => GPA0 - d;
  // lời thì thầm khi KHÔNG vẽ cái bóng (lúc đang ngủ): neo chữ vào một điểm trong cảnh
  const anchor = (x, y, d = 1, r = 26) => { ENEMY = { x: 640 + (x - CAM.x) * CAM.k, y: 360 + (y - CAM.y) * CAM.k, r: r * CAM.k, d }; return ''; };
  const sunToJar = (t, a, b) => { const k = ramp(t, a, b); if (k <= 0 || k >= 1) return ''; const p = [lerp(WIN[0] + 100, JAR[0], k), lerp(WIN[1] + 110, JAR[1] - 30, k) - 80 * Math.sin(Math.PI * k)]; return sunIcon(p[0], p[1], 6, 1); };

  // ================= 1. Vết thương (0–14) =================
  scene(0, 14, t => {
    if (t < 1.6) return ui(`<circle cx="640" cy="352" r="120" fill="url(#gC)" opacity="${0.25 * fade(t, 0.1, 1.6, 0.5, 0.01)}"/><text x="640" y="380" fill="#e4ddcf" fill-opacity="${fade(t, 0.1, 1.6, 0.5, 0.01)}" filter="url(#softGlow)" font-family="${MONO}" font-size="${lerp(70, 76, t / 1.6)}" font-weight="700" text-anchor="middle">60</text>` +
      txt(640, 470, '5:55 AM', { size: 18, c: '#77746e', w: 600, ls: 6, op: fade(t, 0.5, 1.6, 0.4, 0.2) }));
    const ring = t > 1.6 && t < 7.2 ? 1 : 0;
    let s = bedroom(t, { ring, sky: 0.2, jarN: t > 9.2 ? 1 : 0 });
    // ông nội ngoài cửa sổ: gõ cửa, giơ hai cần câu
    const gIn = 1 - ramp(t, 11.4, 12.2);
    if (gIn > 0) {
      const G = bentPose(WIN[0] + 75, 480, -1);
      if (t > 2.6 && t < 3.6) { G.lh = [WIN[0] + 52, WIN[1] + 60 + 8 * Math.sin(t * 20)]; G.le = [WIN[0] + 62, WIN[1] + 90]; }
      else if (t < 9.6) { G.lh = [WIN[0] + 40, WIN[1] + 50]; G.le = [WIN[0] + 56, WIN[1] + 86]; G.rh = [WIN[0] + 110, WIN[1] + 52]; G.re = [WIN[0] + 98, WIN[1] + 88]; }
      fixArms(G);
      let g = gpa(G, { mood: t > 9.6 ? 'sad' : 'happy' });
      if (t > 3.6 && t < 9.6) g += ln(G.lh, [G.lh[0] - 10, G.lh[1] - 60], '#6a5038', 3) + ln(G.rh, [G.rh[0] + 10, G.rh[1] - 60], '#6a5038', 3);
      // vẽ đè lên rèm, cùng cỡ với lần gõ thứ hai, để thấy rõ ông
      s += `<svg x="${WIN[0]}" y="${WIN[1]}" width="150" height="130" overflow="hidden"><g transform="translate(${-WIN[0]},${-WIN[1]}) translate(${WIN[0] + 75},480) scale(.9) translate(${-(WIN[0] + 75)},-480)" opacity="${gIn}">${g}</g></svg>`;
      s += life({ ...G, head: [G.head[0], WIN[1] + 22] }, gpaN(0), { op: 0.9 * gIn, k: 1.3, glow: t < 3.2 }); // số của ông nổi trên khung cửa sổ
    }
    const reach = ramp(t, 6.4, 7.2) * (1 - ramp(t, 7.6, 8.2));
    const L = lying(t, reach, { flame: lerp(0.62, 0.55, ramp(t, 9, 9.4)), mood: (t > 5.0 && t < 9.0) || reach > 0.05 ? 'drowsy' : 'asleep' });
    // đang ngủ: không vẽ cái bóng, chỉ có lời thì thầm bên gối
    s += anchor(400, 360) + L.s + life(L.J, sparkN(0)) + sunToJar(t, 7.6, 9.2);
    return s + hudS(FIRES(t), { sn: SN(t), mi: MI(t) }, ramp(t, 1.6, 2.2));
  }, { cam: t => { const c = STAND(486), k = ramp(t, 1.9, 3.6); return { x: lerp(855, c.x, k), y: lerp(285, c.y, k), k: lerp(3.6, c.k, k) }; } });

  // ================= 2. Cái giá: montage (14–42) =================
  scene(14, 17.5, t => { // cận đồng hồ: bấm, bấm, bấm
    const n = Math.floor((t - 14) / 0.9), ph = ((t - 14) % 0.9) / 0.9;
    const times = ['5:55', '6:04', '6:13', '6:22'];
    let s = `<rect x="-400" y="-300" width="2200" height="1400" fill="#0f0e14"/>` + glow(640, 380, 360, 0.25, 'gC');
    s += alarm(640, 560, ph < 0.4 ? 1 : 0, t, 6);
    s += ui(`<rect x="560" y="610" width="160" height="44" rx="8" fill="#1a1a22" stroke="#4a4a52"/>` + txt(640, 642, times[Math.min(3, n)], { size: 28, c: '#e8e2d4', w: 700 }));
    const press = ph > 0.3 && ph < 0.55;
    s += `<line x1="${900}" y1="${100}" x2="${652}" y2="${press ? 286 : 250}" stroke="${SKIN_LINE}" stroke-width="58" stroke-linecap="round"/><line x1="900" y1="100" x2="${652}" y2="${press ? 286 : 250}" stroke="${SKIN}" stroke-width="52" stroke-linecap="round"/>`;
    return s + hudS(FIRES(t), { sn: SN(t), mi: MI(t) });
  }, { cam: { x: 640, y: 360, k: 1.25 } });
  scene(17.5, 21, t => { // bến câu: ông ngồi một mình, ghế bên cạnh trống
    let s = pier(t, { rise: 0.5 }) + foldChair(620, 548) + foldChair(500, 548);
    const G = sitChair(500, 548, { look: 8 }); G.head = [G.head[0] + 6, G.head[1] + 8]; G.rh = [560, 470]; G.re = [540, 486]; G.lh = [552, 474]; fixArms(G);
    s += gpa(G, { mood: 'sad' }) + rod(G.rh, [700, 400], 600) + handDot(G.rh) + numTick(G, gpaN(3), gpaN(4), t, 19.2);
    return s + hudS(FIRES(t), { sn: SN(t), mi: MI(t) });
  }, { cam: STAND(600) });
  scene(21, 24.5, t => { // ông gõ cửa lần nữa; Spark kéo chăn trùm đầu
    let s = bedroom(t, { sky: 0.3, jarN: 6 });
    const G = bentPose(WIN[0] + 75, 480, -1); G.lh = [WIN[0] + 52, WIN[1] + 70 + 6 * Math.sin(t * 16)]; G.le = [WIN[0] + 62, WIN[1] + 96]; fixArms(G);
    s += `<svg x="${WIN[0]}" y="${WIN[1]}" width="150" height="130" overflow="hidden"><g transform="translate(${-WIN[0]},${-WIN[1]}) translate(${WIN[0] + 75},480) scale(.9) translate(${-(WIN[0] + 75)},-480)">${gpa(G, { mood: 'neutral' })}</g></svg>`;
    s += life({ ...G, head: [G.head[0], WIN[1] + 22] }, gpaN(6));
    const L = lying(t, 0, { flame: 0.48, cover: ramp(t, 22, 22.8) });
    s += anchor(400, 360) + L.s + life(L.J, sparkN(6));
    return s + hudS(FIRES(t), { sn: SN(t), mi: MI(t) });
  }, { cam: STAND(486) });
  scene(24.5, 28, t => { // trưa: Spark ngước nhìn con số trên đầu mình, quơ tay xua, nhún vai — chưa hiểu nó là gì
    let s = bedroom(t, { light: 1, sky: 0.05, jarN: 9, curtain: 0.7 }) + ui(txt(1170, 140, '12:40 PM', { size: 22, c: '#6f6c66', w: 600, ls: 3 }));
    const J = stand(1050, 560, { look: 10 });
    const up = ramp(t, 24.8, 25.4); J.head = [J.head[0] - 6 * up, J.head[1] - 4 * up]; J.look = 10;
    const swat = ramp(t, 25.9, 26.3) * (1 - ramp(t, 26.5, 26.9));
    J.lh = mix(J.lh, [J.head[0] + 34, J.head[1] - 58], swat); J.le = mix(J.le, [J.head[0] + 30, J.head[1] + 4], swat);
    const shrug = ramp(t, 27.0, 27.3) * (1 - ramp(t, 27.6, 27.95));
    if (shrug > 0) { J.lh = [J.hip[0] + 34, J.hip[1] - 50 * shrug - 6]; J.rh = [J.hip[0] - 30, J.hip[1] - 50 * shrug - 6]; J.head = [J.head[0], J.head[1] + 6 * shrug]; }
    fixArms(J);
    s += fig(J, { flame: 0.44, t, mood: 'drowsy' });
    // con số rung khi bị xua, rồi đứng yên như cũ; đúng lúc đó nó tụt 1
    const n = t < 25.6 ? sparkN(7) : sparkN(8), wob = swat > 0 ? Math.sin(t * 40) * 6 * swat : 0;
    s += `<g transform="translate(${wob},0)">` + life(J, n, { k: 1.25 }) + '</g>';
    if (t > 25.6 && t < 26.2) s += txt(J.head[0], J.head[1] - 80 - 20 * ramp(t, 25.6, 26.2), '−1', { size: 13, c: MUTED, w: 700, op: 1 - ramp(t, 25.6, 26.2) });
    return s + hudS(FIRES(t), { sn: SN(t), mi: MI(t) });
  }, { cam: { x: 960, y: 430, k: 1.9 } });
  scene(28, 31.5, t => { // lọ đầy dần mặt trời nhỏ
    const n = Math.round(lerp(8, 15, ramp(t, 28.2, 31.2)));
    let s = `<rect x="-600" y="-400" width="2600" height="960" fill="#121016"/>` + shelf(JAR[0], JAR[1], 200) + jar(JAR[0], JAR[1], n, t);
    s += shadowFig(whisperPose(480, 560, 1), { k: 0.8 });
    return s + hudS(FIRES(t), { sn: SN(t), mi: MI(t) });
  }, { cam: { x: 580, y: 360, k: 2.0 } });
  scene(31.5, 35, t => { // ngủ dậy lúc trưa, trời xám, ảnh dưới sàn
    let s = bedroom(t, { light: 1, sky: 0.05, jarN: 17, curtain: 0.7 }) + ui(txt(1170, 140, '12:10 PM', { size: 22, c: '#6f6c66', w: 600, ls: 3 }));
    const J = sitChair(BEDX + 40, 560, { look: -6 }); J.face = -1; J.head = [J.head[0] - 6, J.head[1] + 12]; J.hip = [BEDX + 40, BEDY - 10];
    s += fig(J, { flame: 0.36, t, mood: 'drowsy' });
    return s + hudS(FIRES(t), { sn: SN(t), mi: MI(t) });
  }, { cam: STAND(620) });
  scene(35, 38.5, t => { // bến: ông nhìn cái ghế trống
    let s = pier(t, { rise: 0.7 }) + foldChair(620, 548) + foldChair(500, 548);
    const G = sitChair(500, 548, { look: 8 }); G.rh = [560, 470]; G.re = [540, 486]; G.lh = [552, 474];
    if (t > 36.2) { G.head = [G.head[0] + 14, G.head[1] + 4]; }
    fixArms(G);
    s += gpa(G, { mood: 'sad' }) + rod(G.rh, [700, 400], 600) + handDot(G.rh) + numTick(G, gpaN(15), gpaN(16), t, 36.6);
    return s + hudS(FIRES(t), { sn: SN(t), mi: MI(t) });
  }, { cam: { x: 560, y: 430, k: 2.0 } });
  scene(38.5, 42, t => { // tối, bấm lần nữa
    let s = bedroom(t, { ring: t < 39.6 ? 1 : 0, sky: 0.2, jarN: 20 + (t > 40.8 ? 1 : 0) });
    const r = ramp(t, 38.8, 39.6) * (1 - ramp(t, 39.9, 40.4)), L = lying(t, r, { flame: 0.3, mood: t > 38.7 && t < 40.8 ? 'drowsy' : 'asleep' });
    s += anchor(400, 360) + L.s + life(L.J, sparkN(20)) + sunToJar(t, 39.8, 40.8);
    return s + hudS(FIRES(t), { sn: SN(t), mi: MI(t) });
  }, { cam: STAND(486) });

  // ================= 4. Đáy (58–78): bà cụ trên ghế đá mang số 1 · hôm sau đám tang · số của ông =================
  // bà cụ: búi tóc bạc, khăn choàng tím; vẽ quay phải rồi lật nếu cần
  function granny(J, o = {}) {
    const d = dirOf(J), [hx, hy] = J.head;
    return fig(J, { c: '#ddd3c6', mood: o.mood || 'happy' }) +
      `<circle cx="${hx - 24 * d}" cy="${hy - 18}" r="13" fill="#d8d4cc" stroke="#a8a298" stroke-width="2"/>` +
      `<path d="M${hx - 31},${hy - 6} Q${hx},${hy - 40} ${hx + 31},${hy - 6} Q${hx + 10},${hy - 22} ${hx - 31},${hy - 6}Z" fill="#d8d4cc" stroke="#a8a298" stroke-width="1.5"/>` +
      `<path d="M${J.neck[0] - 30},${J.neck[1] + 6} Q${J.neck[0]},${J.neck[1] - 8} ${J.neck[0] + 30},${J.neck[1] + 6} L${J.neck[0] + 22},${J.neck[1] + 46} Q${J.neck[0]},${J.neck[1] + 56} ${J.neck[0] - 22},${J.neck[1] + 46}Z" fill="#8a6a9a" stroke="#5a4268" stroke-width="2"/>`;
  }
  function bench(x, g) {
    return `<rect x="${x - 120}" y="${g - 96}" width="240" height="12" rx="3" fill="#7a5a3a" stroke="#4a3420" stroke-width="2"/><rect x="${x - 120}" y="${g - 150}" width="240" height="10" rx="3" fill="#7a5a3a" stroke="#4a3420" stroke-width="2"/><rect x="${x - 120}" y="${g - 132}" width="240" height="10" rx="3" fill="#7a5a3a" stroke="#4a3420" stroke-width="2"/>` +
      ln([x - 104, g - 84], [x - 110, g], '#3a3a3a', 6) + ln([x + 104, g - 84], [x + 110, g], '#3a3a3a', 6) + ln([x - 104, g - 150], [x - 104, g - 96], '#3a3a3a', 5) + ln([x + 104, g - 150], [x + 104, g - 96], '#3a3a3a', 5);
  }
  function pigeon(x, g, t, i, fly = 0) {
    const peck = Math.max(0, Math.sin(t * 5 + i * 1.7)) * 6, y = g - 12 - fly * 120, xx = x + fly * 140;
    return `<ellipse cx="${xx}" cy="${y}" rx="14" ry="9" fill="#8a8c96" stroke="#5a5c66" stroke-width="1.5"/><circle cx="${xx + 12}" cy="${y - 8 + peck}" r="6" fill="#7a7c86"/><path d="M${xx + 17},${y - 8 + peck} l5,2 l-5,2Z" fill="#c8a050"/>` +
      (fly ? '' : ln([xx - 2, y + 8], [xx - 2, g], '#c87a5a', 2) + ln([xx + 4, y + 8], [xx + 4, g], '#c87a5a', 2));
  }
  function parkBG(t, rainy = 0) {
    let s = `<defs><linearGradient id="parkSky${rainy}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${rainy ? '#1e2228' : '#2e363e'}"/><stop offset=".75" stop-color="${rainy ? '#454c58' : '#76838c'}"/></linearGradient></defs><rect x="-600" y="-400" width="2600" height="960" fill="url(#parkSky${rainy})"/>` + `<rect x="-600" y="560" width="2600" height="400" fill="${rainy ? '#2e3a2e' : '#56663e'}"/>`;
    // cây xa
    for (let i = 0; i < 6; i++) { const x = -100 + i * 280 + 60 * rnd(i), r = 70 + 30 * rnd(i + 2); s += ln([x, 560], [x, 420], rainy ? '#2e2a26' : '#5a4632', 12) + `<circle cx="${x}" cy="${400 - r * 0.4}" r="${r}" fill="${rainy ? '#33403a' : '#4e6a42'}" opacity=".9"/>`; }
    s += ln([-600, 560], [2000, 560], '#2e2924', 2.2, 0.5);
    if (rainy) s += rain(t, -200, 1500, -100, 560, 0.25);
    return s;
  }
  scene(58, 64, t => { // trưa, công viên: bà cụ cho chim ăn, trên đầu bà là số 1. Spark tới ngồi cạnh, không hiểu con số
    let s = parkBG(t) + bench(760, 560);
    const PG = [[840, 0], [900, 1], [960, 2], [1010, 3]];
    PG.forEach(([x, i]) => { s += pigeon(x, 560, t, i); });
    // bà cụ ngồi nửa phải ghế, quay mặt sang trái (về phía Spark)
    const GX = 820, Gm = sitChair(GX, 560, { look: 8 });
    const give = ramp(t, 61.4, 62.0) * (1 - ramp(t, 62.8, 63.2));
    Gm.lh = mix([GX + 52, 470], [GX + 90, 450], give); Gm.le = [GX + 36, 470]; fixArms(Gm);
    s += flip(GX, granny(Gm, { mood: 'happy' }) + handDot(Gm.lh) + (give > 0.5 ? `<circle cx="${Gm.lh[0] + 6}" cy="${Gm.lh[1] - 6}" r="5" fill="#d8b070"/>` : ''));
    s += `<text x="${2 * GX - Gm.head[0]}" y="${Gm.head[1] - 56}" fill="#e4ddcf" font-family="${MONO}" font-size="${14 * (1 + 0.15 * ramp(t, 60.6, 61.2))}" font-weight="700" text-anchor="middle">1</text>`;
    // Spark đi vào (chân bước thật), dừng, nhìn số của bà, ngước nhìn số của mình, rồi ngồi xuống
    let J;
    const k = clamp((t - 58.2) / 2.0), x = lerp(250, 600, ease(k));
    if (t < 62.0) {
      J = k > 0 && k < 1 ? walk(x, 560, (t - 58.2) * 7) : stand(x, 560, { look: 10 }); J.look = 10;
      if (t > 60.6 && t < 61.4) J.head = [J.head[0] + 4, J.head[1] - 3]; // nhìn số của bà
      if (t > 61.4) { J.head = [J.head[0] - 6, J.head[1] - 5]; } // ngước nhìn số của mình
    } else {
      const sd = ramp(t, 62.0, 62.6), A = stand(600, 560, { look: 10 }), B = sitChair(640, 560, { look: 8 });
      J = {}; for (const kk in B) J[kk] = Array.isArray(B[kk]) ? mix(A[kk], B[kk], sd) : B[kk];
      if (t > 62.8) { J.lh = [JX(J) + 60, 470]; J.le = [JX(J) + 30, 476]; }
    }
    fixArms(J);
    s += fig(J, { flame: 0.12, t, mood: 'neutral' }) + life(J, sparkN(24));
    if (t > 63.2) s += `<circle cx="${lerp(J.lh[0], 860, ramp(t, 63.2, 63.8))}" cy="${lerp(J.lh[1], 556, ramp(t, 63.2, 63.8)) - 30 * Math.sin(Math.PI * ramp(t, 63.2, 63.8))}" r="4" fill="#d8b070"/>`;
    return s + hudS(6, { sn: 38, mi: 21 }) + ui(txt(1170, 140, '12:15 PM', { size: 22, c: '#6f6c66', w: 600, ls: 3 }));
  }, { cam: { x: 680, y: 400, k: 1.5 } });
  const JX = J => J.hip[0];

  // đám tang (hôm sau): ô đen, mưa nhỏ; tấm ảnh bà cụ — trên ảnh con số về 0 rồi tắt
  const MOURN = [[520, 12480, 0], [610, 7311, 1], [900, 19002, 2]];
  function mourner(x, n, i, t, lit) {
    const J = stand(x, 560, { look: i % 2 ? -8 : 8 }); J.head = [J.head[0] + (i % 2 ? -8 : 8), J.head[1] + 8]; if (i % 2) J.face = -1;
    J.lh = [x + 6, 440]; J.le = [x + 20, 470]; fixArms(J);
    let s = fig(J, { c: '#3a3a46' }) + ln(J.lh, [x + 6, J.head[1] - 60], '#1a1a1e', 3) +
      `<path d="M${x - 64},${J.head[1] - 54} Q${x + 6},${J.head[1] - 130} ${x + 76},${J.head[1] - 54} Q${x + 6},${J.head[1] - 70} ${x - 64},${J.head[1] - 54}Z" fill="#141418" stroke="#2a2a30" stroke-width="2"/>`;
    return s + life(J, n, { dy: 60, op: 0.75 + 0.25 * lit, k: 1 + 0.2 * lit, glow: lit > 0.3 });
  }
  function portrait(x, g, t, zero) {
    let s = ln([x - 34, g], [x, g - 210], '#4a3a2a', 5) + ln([x + 34, g], [x, g - 210], '#4a3a2a', 5) + ln([x, g - 120], [x, g], '#4a3a2a', 4);
    s += `<rect x="${x - 52}" y="${g - 220}" width="104" height="124" fill="#2a1a12" stroke="#1a0e08" stroke-width="3"/><rect x="${x - 44}" y="${g - 212}" width="88" height="108" fill="#d8d0c0"/>`;
    const P = stand(0, 0, { look: 8 }); P.lh = [-20, -70]; P.rh = [20, -70];
    s += `<svg x="${x - 44}" y="${g - 212}" width="88" height="108" viewBox="${x - 44} ${g - 212} 88 108"><g transform="translate(${x - 4},${g - 176 + 195 * 0.62}) scale(.62)">` + granny(P, { mood: 'happy' }) + '</g></svg>';
    s += `<path d="M${x + 30},${g - 220} l22,0 l0,22Z" fill="#111"/>`;
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI; s += `<circle cx="${x + Math.cos(a) * 60}" cy="${g - 70 + Math.sin(a) * 30}" r="${9 + 3 * rnd(i)}" fill="#f0ece4" stroke="#b8b0a4" stroke-width="1.5"/>`; }
    if (zero > 0) s += `<text x="${x}" y="${g - 236}" fill="#e4ddcf" fill-opacity="${zero}" font-family="${MONO}" font-size="16" font-weight="700" text-anchor="middle">0</text>`;
    return s;
  }
  function funeral(t, o = {}) {
    let s = parkBG(t, 1) + portrait(760, 560, t, o.zero || 0);
    MOURN.forEach(([x, n, i]) => { s += mourner(x, n - 1, i, t, o.lit ? o.lit[i] : 0); });
    // ông đứng cuối hàng, không ô, đội mũ len
    const G = bentPose(1060, 560, -1); G.head = [G.head[0] - 4, G.head[1] + 6]; G.lh = [1030, 480]; G.rh = [1040, 484];
    if (o.wave) { G.lh = [996, 372 + 8 * Math.sin(t * 6)]; G.le = [1010, 420]; }
    fixArms(G);
    s += gpa(G, { mood: o.wave ? 'happy' : 'sad' }) + life(G, gpaN(25), { k: o.gk || 1, glow: (o.gk || 1) > 1.2 });
    return s;
  }
  // Spark đứng bên trái, nhìn về tấm ảnh
  function sparkFuneral(t, o = {}) {
    const J = stand(380, 560, { look: 10 });
    if (o.up) J.head = [J.head[0] - 6 * o.up, J.head[1] - 5 * o.up];
    J.head = [J.head[0] + (o.turn || 0) * 8, J.head[1]];
    fixArms(J);
    return { s: fig(J, { flame: o.flame ?? 0.1, t, mood: o.mood || 'sad' }) + life(J, sparkN(25), { k: 1 + 0.25 * (o.up || 0), glow: (o.up || 0) > 0.5 }), J };
  }
  scene(64, 72, t => {
    let s = funeral(t, { zero: fade(t, 64.4, 65.8, 0.3, 0.6), lit: [0, 1, 2].map(i => fade(t, 68.0 + i * 0.6, 68.9 + i * 0.6, 0.15, 0.3)) });
    const up = ramp(t, 66.2, 66.8) * (1 - ramp(t, 67.6, 68.0));
    s += sparkFuneral(t, { up, flame: lerp(0.1, 0.06, ramp(t, 70, 72)) }).s;
    return s + hudS(6, { sn: 38, mi: 21 });
  }, { cam: t => ({ x: lerp(660, 560, ramp(t, 69.6, 72)), y: 400, k: lerp(1.25, 1.5, ramp(t, 69.6, 72)) }) });
  // đoạn chèn 72–78: Spark quay sang thấy ông — số trên đầu ông chỉ còn 35
  scene(72, 78, t => {
    const gk = 1 + 1.2 * ramp(t, 73.4, 74.4);
    let s = funeral(t, { gk, wave: t > 76.2 });
    const sp = sparkFuneral(t, { turn: 1, flame: lerp(0.1, 0.05, ramp(t, 73.6, 74.4)), mood: 'sad' });
    s += sp.s;
    // Spark tự nghĩ thầm (chữ kem, nghiêng — không phải giọng kẻ thù)
    const th = fade(t, 75.0, 77.8, 0.5, 0.5);
    if (th > 0) s += `<text x="${sp.J.head[0] - 10}" y="${sp.J.head[1] - 92}" fill="#efe6d8" fill-opacity="${th}" font-family="Inter" font-size="17" font-style="italic" font-weight="500" text-anchor="middle">he has no time...</text>`;
    if (t > 76.6) s += `<circle cx="${sp.J.head[0] + 12}" cy="${sp.J.head[1] + 6 + 14 * ramp(t, 76.6, 77.6)}" r="2.6" fill="#bcd7ff" opacity="${1 - ramp(t, 77.4, 77.9)}"/>`; // một giọt nước mắt
    return s + hudS(4, { sn: 38, mi: 21 });
  }, { ins: true, cam: t => {
    const p = ramp(t, 72.2, 73.2), back = ramp(t, 74.4, 75.2);
    return { x: lerp(lerp(560, 960, p), 700, back), y: lerp(400, 380, p), k: lerp(lerp(1.5, 2.0, p), 1.3, back) };
  } });

  // ================= 5. Bước ngoặt (72–86) =================
  scene(72, 82.4, t => {
    const open = ramp(t, 75.6, 76.2), fly = ramp(t, 76.2, 78.8);
    let s = bedroom(t, { light: 1, sky: 0.05, photos: 5, photoLit: fly > 0.5, curtain: 0.6, jarN: 0 }) + whiteFlower(CLK[0] + 40, 490); // bông hoa trắng mang về từ đám tang, đặt trên tủ đầu giường
    s = s.replace(jar(JAR[0], JAR[1], 0, t, { open: 0 }), ''); // lọ đang trên tay Spark
    const J = stand(560, 560, { look: 10 });
    const jh = [600, 452];
    J.lh = [jh[0] - 22, jh[1] - 20]; J.le = [580, 470]; J.rh = [jh[0] + 22, jh[1] - 20]; J.re = [622, 470];
    if (open > 0 && open < 1) J.rh = [jh[0] + 34, jh[1] - 46];
    fixArms(J);
    s += fig(J, { flame: lerp(0.05, 0.2, fly), t, mood: t > 75.4 ? 'fierce' : 'sad' }) + life(J, sparkN(25));
    const left = Math.round(21 * (1 - fly));
    s += jar(jh[0], jh[1] + 20, left, t, { open });
    s += handDot(J.lh) + handDot(J.rh);
    // mặt trời bay ra, lơ lửng khắp phòng, thắp sáng những tấm ảnh
    if (fly > 0) for (let i = 0; i < 21; i++) { const k = clamp(fly * 1.4 - i * 0.02); if (k <= 0) continue; const a = i * 0.9 + t * 0.6, r = 100 + 160 * rnd(i); s += sunIcon(lerp(jh[0], 560 + Math.cos(a) * r * 1.6, k), lerp(jh[1] - 30, 300 + Math.sin(a) * r * 0.5, k), 5, 0.9); }
    if (fly > 0.3) s += glow(560, 330, 420, 0.3 * fly);
    // kẻ thù đặt tay lên nắp
    const gone = ramp(t, 76.0, 77.0);
    if (t > 76.2 && t < 77.4) { const q = (t - 76.2) / 1.2; s += `<text x="${J.head[0] + 60}" y="${J.head[1] + 20 - 26 * q}" fill="${ORANGE}" fill-opacity="${1 - q}" filter="url(#softGlow)" font-family="${MONO}" font-size="15" font-weight="700">+6%</text>`; }
    // từ khoá: SNOOZE (xám) — N O O Z rơi, R I (vàng) trượt vào → RISE → bay vào góc
    if (t > 78.4) {
      const o = fade(t, 78.4, 82.4, 0.3, 0.01), fall = ramp(t, 79.0, 79.9), slide = ramp(t, 79.9, 80.6), fly2 = ramp(t, 81.4, 82.2);
      const cx = lerp(900, 1150, fly2), cy = lerp(190, 66, fly2), fs = lerp(70, 18, fly2), cw = fs * 0.72;
      let k = '';
      const letters = 'SNOOZE'.split('');
      letters.forEach((ch, i) => {
        const keep = i === 0 || i === 5, d = keep ? 0 : clamp(fall * 1.5 - i * 0.1);
        const xpos = keep ? (i === 0 ? cx + cw * 2 * slide : cx + cw * (5 - 2 * slide)) : cx + i * cw;
        const col = keep && slide > 0.5 ? YEL : '#9a968e';
        k += `<text x="${xpos}" y="${cy + 280 * d * d}" fill="${col}" fill-opacity="${keep ? 1 : 1 - d}" ${keep && slide > 0.5 ? 'filter="url(#yelGlow)"' : ''} font-family="Inter" font-size="${fs}" font-weight="900">${ch}</text>`;
      });
      if (slide > 0) ['R', 'I'].forEach((ch, i) => { k += `<text x="${cx - 200 * (1 - slide) + i * cw}" y="${cy}" fill="${YEL}" fill-opacity="${slide}" filter="url(#yelGlow)" font-family="Inter" font-size="${fs}" font-weight="900">${ch}</text>`; });
      s += ui(`<g opacity="${o}">${k}</g>`);
    }
    return s + hudS(t < 76.2 ? 4 : t < 78 ? 10 : 18, t < 82 ? { sn: 38, mi: 21 - Math.round(21 * fly) } : { rise: 0 });
  }, { nopush: true, cam: { x: 600, y: 380, k: 1.6 } });
  scene(82.4, 86, t => { // dời đồng hồ ra kệ xa giường
    let s = bedroom(t, { light: 1, sky: 0.1, curtain: 0.6, jarN: 0, jarOpen: 1, clock: t > 83.2 ? false : true });
    s += shelf(1000, 404, 120);
    const k = ramp(t, 83.2, 85.0), x = lerp(360, 960, k);
    const J = t < 83.2 ? stand(360, 560, { look: -10 }) : walk(x, 560, t * 6);
    if (t < 83.2) J.face = -1;
    J.lh = t < 83.2 ? [CLK[0] + 20, CLK[1] - 10] : [x + 30, 470]; J.le = [x + 16, 480]; fixArms(J);
    s += fig(J, { flame: 0.22, t, mood: 'fierce' }) + life(J, sparkN(25)) + (t >= 83.2 ? alarm(t < 85 ? J.lh[0] : 1000, t < 85 ? J.lh[1] + 20 : 404, 0, t, 0.9) : '') + handDot(J.lh);
    return s + hudS(18, { rise: 0 });
  }, { cam: STAND(660) });

  // ================= 6. Montage (86–116) =================
  scene(86, 92, t => { // 6:30: chuông reo ở kệ xa, chân chạm sàn ngay
    let s = bedroom(t, { sky: 0.3, jarN: 0, jarOpen: 1, clock: false, curtain: 0.4 }) + shelf(1000, 404, 120) + alarm(1000, 404, t < 87.4 ? 1 : 0, t, 0.9);
    const up = ramp(t, 86.4, 87.0), x = lerp(620, 960, ramp(t, 87.0, 88.6));
    if (up < 1) { const A = lieBed(580, BEDY), B = sitChair(620, 560, { look: 10 }); const J = {}; for (const k in B) J[k] = Array.isArray(B[k]) ? mix(A[k], B[k], up) : B[k]; s += fig(J, { flame: 0.3, t, mood: 'fierce' }) + life(J, sparkN(26)); }
    else { const J = t < 88.6 ? walk(x, 560, t * 7) : stand(960, 560, { look: 10 }); if (t >= 88.6) { J.lh = [990, 380]; J.le = [976, 410]; fixArms(J); } s += fig(J, { flame: 0.34, t, mood: 'fierce' }) + life(J, sparkN(26)) + (t >= 88.6 ? handDot(J.lh) : ''); }
    return s + hudS(24, { rise: 1 }) + clock(1170, 140, '6:30 AM');
  }, { cam: STAND(700) });
  scene(98, 104, t => { // 6:00: chạy ra bến, ông vẫn ở đó, vẫy nhau
    let s = pier(t, { rise: 0.4 }) + foldChair(620, 548) + foldChair(500, 548);
    const G = sitChair(500, 548, { look: 8 }); G.rh = [560, 470]; G.re = [540, 486];
    if (t > 100.6) { G.lh = [470, 380 + 10 * Math.sin(t * 8)]; G.le = [480, 420]; G.head = [G.head[0] - 6, G.head[1]]; G.look = -6; G.face = -1; }
    fixArms(G);
    s += gpa(G, { mood: 'happy' }) + rod(G.rh, [700, 400], 600) + handDot(G.rh) + life(G, gpaN(28));
    const x = lerp(-60, 300, ramp(t, 98.2, 100.8)), J = t < 100.8 ? run(x, 548, t * 10) : stand(300, 548, { look: 10 });
    if (t >= 100.8) { J.lh = [330, 380 + 10 * Math.sin(t * 8 + 1)]; J.le = [320, 420]; fixArms(J); }
    s += fig(J, { flame: 0.58, t, mood: 'happy' }) + life(J, sparkN(28));
    return s + hudS(48, { rise: 2 }) + clock(1170, 140, '6:00 AM');
  }, { cam: STAND(440) });
  scene(104, 110, t => { // 5:55: pha hai ly ca cao
    let s = `<rect x="-600" y="-400" width="2600" height="960" fill="#1e1814"/>` + room() + `<rect x="420" y="430" width="420" height="130" fill="#3a2e24" stroke="#5a4636" stroke-width="3"/>` + ln([410, 430], [850, 430], '#6a5444', 6);
    const pour = ramp(t, 104.6, 107.4);
    [[600, 0], [680, 1]].forEach(([cx, i]) => { const lvl = clamp(pour * 2 - i); s += `<rect x="${cx - 16}" y="398" width="32" height="32" rx="4" fill="#e8e2d4" stroke="#8a8478" stroke-width="2"/><rect x="${cx - 13}" y="${426 - 24 * lvl}" width="26" height="${24 * lvl}" fill="#6a3a20"/>`; if (lvl >= 1) for (let j = 0; j < 2; j++) s += `<path d="M${cx - 6 + j * 10},392 q-6,-12 2,-24" fill="none" stroke="#d8d0c0" stroke-width="2" opacity="${0.4 + 0.3 * Math.sin(t * 3 + j)}"/>`; });
    const J = stand(520, 560, { look: 10 }); const px = pour < 0.5 ? 600 : 680; J.lh = [px - 20, 370]; J.le = [548, 420]; fixArms(J);
    s += fig(J, { flame: 0.68, t, mood: 'happy' }) + life(J, sparkN(29)) + `<rect x="${J.lh[0] - 8}" y="${J.lh[1] - 18}" width="22" height="30" rx="4" fill="#c8a070" transform="rotate(40 ${J.lh[0]} ${J.lh[1]})"/>` + handDot(J.lh);
    return s + hudS(62, { rise: 3 }) + clock(1170, 140, '5:55 AM');
  }, { cam: STAND(600) });
  scene(110, 116, t => { // lọ để mở, mỗi sáng một mặt trời bay ra cửa sổ
    let s = bedroom(t, { light: 1, sky: 0.8, curtain: 1, jarN: 0, jarOpen: 1 });
    for (let i = 0; i < 4; i++) { const k = ((t - 110) / 1.5 - i) ; if (k > 0 && k < 1) s += sunIcon(lerp(JAR[0], WIN[0] + 75, k), lerp(JAR[1] - 50, WIN[1] + 60, k) - 60 * Math.sin(Math.PI * k), 6, 1 - k * 0.3, YEL); }
    return s + hudS(80, { rise: 4 });
  }, { cam: { x: 700, y: 330, k: 1.7 } });

  // ================= 8. Phần thưởng: những buổi sáng cùng ông, số của ông đếm về 1 =================
  scene(132, 137, t => { // chạy ra bến, ông đang xếp đồ
    let s = pier(t, { rise: 0.3 }) + foldChair(500, 548, 0) + `<rect x="560" y="520" width="40" height="28" fill="#c8a070" stroke="#8a6a40"/>`;
    const G = bentPose(620, 548, -1); G.lh = [596, 520]; G.rh = [604, 524]; fixArms(G); s += gpa(G, { mood: 'neutral' }) + life(G, gpaN(32));
    const x = lerp(-80, 420, ramp(t, 132.2, 135.6)), J = t < 135.6 ? run(x, 548, t * 11) : stand(420, 548, { look: 10 });
    s += fig(J, { flame: 1.0, t, mood: 'happy' }) + life(J, sparkN(32));
    return s + hudS(100, { rise: 5 });
  }, { cam: STAND(420) });
  // ông mở ghế thứ hai; hai người ngồi câu. Rồi thời gian trôi nhanh: mỗi bình minh số của ông tụt 1, SUNRISES tăng 1
  const LAPSE = [140.2, 144.2], NLAPSE = 2;
  const lapseDay = t => 32 + Math.min(NLAPSE, Math.floor(NLAPSE * clamp((t - LAPSE[0]) / (LAPSE[1] - LAPSE[0])) + 0.5)); // ngày 32 → 34 (ông 28 → 26), chậm
  scene(137, 147.4, t => {
    const open = ramp(t, 137.4, 138.4), sit = ramp(t, 138.8, 139.6);
    const lp = clamp((t - LAPSE[0]) / (LAPSE[1] - LAPSE[0])), inLapse = t > LAPSE[0] && t < LAPSE[1];
    const day = t < LAPSE[0] ? 32 : lapseDay(t);
    const cyc = inLapse ? (lp * NLAPSE) % 1 : 0, rise = inLapse ? cyc : lerp(0.4, 0.9, ramp(t, 137, 140.2));
    let s = pier(t, { rise: t >= LAPSE[1] ? 0.85 : rise }) + foldChair(470, 548, open) + foldChair(640, 548);
    if (inLapse) s += `<rect x="-600" y="-400" width="2600" height="1400" fill="#0a0a18" opacity="${0.45 * Math.pow(Math.cos(Math.PI * cyc), 2)}"/>`;
    // ông: càng về sau lưng càng còng; cuối cùng đội mũ len của mình lên đầu Spark
    const G = sitChair(640, 548, { look: 8 }); G.head = [G.head[0] + 8 * lp, G.head[1] + 10 * lp]; G.rh = [700, 470]; G.re = [680, 486]; G.lh = [692, 474];
    // ông nhấc mũ len khỏi đầu (144.6) → chìa sang (145.2) → Spark đỡ lấy, đội lên đầu mình (145.8–146.4)
    const MEET = [552, 424], off = t > 144.6, a1 = ramp(t, 144.6, 145.1), a2 = ramp(t, 145.2, 145.8), b1 = ramp(t, 145.8, 146.4);
    const capTop = h => [h[0], h[1] - 34];
    if (off) {
      const lean = ramp(t, 144.8, 145.4) * (1 - ramp(t, 146.2, 146.8));
      G.head = [G.head[0] - 26 * lean, G.head[1] + 4 * lean]; G.neck = [G.neck[0] - 18 * lean, G.neck[1]]; G.look = -8; G.face = -1;
      G.lh = b1 >= 1 ? [G.hip[0] + 30, G.hip[1] - 20] : mix(mix(G.rh, capTop(G.head), a1), MEET, a2); G.le = [G.neck[0] - 10, G.neck[1] + 50];
    }
    fixArms(G);
    let g = gpa(G, { mood: 'happy' });
    if (off) g = g.replace(/<path d="M[^"]*" fill="#3b6bd6"[^>]*\/><circle[^>]*fill="#e8e8f0"\/>/, ''); // mũ rời đầu ông
    s += g + (!off ? rod(G.rh, [840, 400], 620) + handDot(G.rh) : handDot(G.lh)) + life(G, gpaN(day));
    const J = sit > 0 ? sitChair(470, 548, { look: 8 }) : stand(440, 548, { look: 10 });
    if (sit > 0) { J.rh = [530, 470]; J.re = [510, 486]; J.lh = [522, 474]; }
    if (b1 > 0) J.lh = b1 < 1 ? mix(MEET, capTop(J.head), b1) : [522, 474];
    fixArms(J);
    const onSpark = b1 >= 1;
    s += fig(J, { flame: 1.1, t, mood: 'happy', blink: (t % 3.2) < 0.12 }) + (sit > 0 ? rod(J.rh, [700, 410], 610) + handDot(J.rh) : '') + life(J, sparkN(day), { dy: onSpark ? 16 : 0 });
    if (off && !onSpark) { const cp = b1 > 0 ? J.lh : G.lh; s += woolCap(cp[0], cp[1] + 30) + handDot(cp); }
    if (onSpark) s += woolCap(J.head[0], J.head[1] + 4);
    return s + hudS(100, { rise: 5 + day - 32 });
  }, { cam: t => ({ x: 580, y: 420, k: lerp(1.5, 1.7, ramp(t, 137, 147.4)) }) });
  function woolCap(hx, hy) { return `<path d="M${hx - 31},${hy - 4} Q${hx},${hy - 50} ${hx + 31},${hy - 4}Z" fill="${CAPC}" stroke="#22388a" stroke-width="2"/><circle cx="${hx}" cy="${hy - 38}" r="7" fill="#e8e8f0"/>`; }
  scene(147.4, 150.6, t => { // sáng hôm sau: Spark đội mũ len của ông, một mình ngồi đúng ghế của ông; ghế bên cạnh trống
    let s = pier(t, { rise: 0.6 }) + foldChair(620, 548) + foldChair(500, 548);
    const J = sitChair(620, 548, { look: 8 }); J.rh = [680, 470]; J.re = [660, 486]; J.lh = [672, 474]; fixArms(J);
    s += fig(J, { flame: 1.0, t, mood: 'happy' }) + rod(J.rh, [820, 400], 620) + handDot(J.rh) + woolCap(J.head[0], J.head[1] + 4) + life(J, sparkN(60), { dy: 16 });
    return s + hudS(100, { rise: 34 });
  }, { cam: { x: 600, y: 420, k: 1.4 } });


  // ================= v4: cảnh thêm =================
  // con số tụt 1 ngay trên màn hình: số cũ → số mới ở giây tk, kèm "−1" bay lên
  function numTick(J, before, after, t, tk, o = {}) {
    const k = o.k || 1.5;
    let s = life(J, t < tk ? before : after, { k, glow: Math.abs(t - tk) < 0.5 });
    if (t > tk && t < tk + 0.8) s += txt(J.head[0] + 34, J.head[1] - 64 - 22 * (t - tk), '−1', { size: 14, c: MUTED, w: 700, op: 1 - (t - tk) / 0.8 });
    return s;
  }
  function whiteFlower(x, g) {
    let s = ln([x, g], [x + 4, g - 26], '#5a7a4a', 2.5);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; s += `<circle cx="${x + 4 + Math.cos(a) * 6}" cy="${g - 30 + Math.sin(a) * 6}" r="5" fill="#f0ece4" stroke="#b8b0a4" stroke-width="1"/>`; }
    return s + `<circle cx="${x + 4}" cy="${g - 30}" r="3.5" fill="#e8c860"/>`;
  }
  // bà cụ ngồi ghế đá (quay mặt sang trái), có thể vẫy tay; trả về chuỗi vẽ + toạ độ đầu thật
  function grannyBench(GX, t, o = {}) {
    const Gm = sitChair(GX, 560, { look: 8 });
    if (o.wave) { Gm.lh = [GX + 46, 380 + 10 * Math.sin(t * 7)]; Gm.le = [GX + 40, 420]; Gm.head = [Gm.head[0] - 4, Gm.head[1] - 4]; }
    fixArms(Gm);
    const hx = 2 * GX - Gm.head[0], hy = Gm.head[1];
    const s = flip(GX, granny(Gm, { mood: 'happy' }) + (o.wave ? handDot(Gm.lh) : '')) +
      `<text x="${hx}" y="${hy - 56}" fill="#e4ddcf" font-family="${MONO}" font-size="${14 * (o.k || 1.4)}" font-weight="700" text-anchor="middle">${o.n}</text>`;
    return s;
  }
  // gieo 1 (ngày 15): Spark ngái ngủ nhìn qua cửa sổ lúc trưa — bà cụ dưới công viên vẫy lên, trên đầu bà: 10
  scene(42, 45, t => {
    let s = parkBG(t) + bench(700, 560);
    [[800, 0], [860, 1], [920, 2]].forEach(([x, i]) => { s += pigeon(x, 560, t, i); });
    s += grannyBench(760, t, { wave: t > 42.8, n: 10 });
    // khung cửa sổ phòng Spark (nhìn từ trong ra), rèm hé
    s += `<path d="M-600,-400 H2000 V1000 H-600Z M330,190 V600 H1000 V190Z" fill="#2a2420" fill-rule="evenodd"/>` +
      `<rect x="330" y="190" width="670" height="410" fill="none" stroke="#6b6760" stroke-width="10"/>` + ln([665, 190], [665, 600], '#6b6760', 7) +
      `<path d="M310,170 L420,170 L410,620 L310,620Z" fill="#3a3a5a"/><path d="M1020,170 L910,170 L920,620 L1020,620Z" fill="#3a3a5a"/>` + ln([280, 166], [1050, 166], '#5a5048', 6);
    return s + hudS(40, { sn: 25, mi: 14 }) + ui(txt(1170, 140, '12:20 PM', { size: 22, c: '#6f6c66', w: 600, ls: 3 }));
  }, { cam: { x: 665, y: 420, k: 1.3 } });
  // gieo 2 (ngày 22): nhìn từ công viên — Spark ngáp trong khung cửa sổ, bà cụ vẫy lên; số của bà: 3
  scene(45, 48, t => {
    let s = parkBG(t) + `<rect x="120" y="180" width="440" height="380" fill="#5a4a3e" stroke="#3a2e26" stroke-width="4"/><path d="M100,184 L340,90 L580,184Z" fill="#4a3a30"/>`;
    s += `<rect x="250" y="270" width="170" height="150" fill="#1a1612" stroke="#d8d0c0" stroke-width="6"/>`;
    const J = stand(330, 560, { look: 10 }); J.head = [J.head[0] + 4, J.head[1] + 6];
    const wv = t > 46.0; if (wv) { J.lh = [372, 300 + 6 * Math.sin(t * 5)]; J.le = [360, 340]; }
    fixArms(J);
    s += `<svg x="253" y="273" width="164" height="144" viewBox="253 273 164 144">` + fig(J, { flame: 0.3, t, mood: 'drowsy' }) + (wv ? handDot(J.lh) : '') + '</svg>';
    s += ln([335, 270], [335, 420], '#d8d0c0', 4) + life({ ...J, head: [J.head[0], 300] }, sparkN(22));
    s += bench(840, 560) + grannyBench(900, t, { wave: t > 45.4, n: 3 });
    [[960, 0], [1010, 1]].forEach(([x, i]) => { s += pigeon(x, 560, t, i); });
    return s + hudS(32, { sn: 36, mi: 20 }) + ui(txt(1170, 140, '12:05 PM', { size: 22, c: '#6f6c66', w: 600, ls: 3 }));
  }, { cam: { x: 620, y: 400, k: 1.3 } });

  // sáng chủ nhật 5:55: thói quen kéo chăn trùm đầu, chữ "five more minutes." hiện bên gối;
  // con số trên đầu tụt 1 → Spark hất chăn, chữ vỡ vụn, đi tắt chuông ở kệ xa
  scene(116, 121.5, t => {
    const ringing = t < 120.5;
    let s = bedroom(t, { sky: 0.35, jarN: 0, jarOpen: 1, clock: false, curtain: 0.4 }) + shelf(1000, 404, 120) + alarm(1000, 404, ringing ? 1 : 0, t, 0.9);
    const cover = ramp(t, 116.3, 116.9) * (1 - ramp(t, 118.7, 118.95));
    let J;
    if (t < 118.9) { const L = lying(t, 0, { flame: 0.8, mood: 'drowsy', cover }); s += L.s; J = L.J; s += numTick(J, sparkN(32), sparkN(33), t, 118.1, { k: 1.2 }); }
    else if (t < 119.5) { const up = ramp(t, 118.9, 119.5), A = lieBed(580, BEDY), B = sitChair(620, 560, { look: 10 }); J = {}; for (const k in B) J[k] = Array.isArray(B[k]) ? mix(A[k], B[k], up) : B[k]; s += fig(J, { flame: 0.9, t, mood: 'fierce' }) + life(J, sparkN(33)); }
    else { const k = clamp((t - 119.5) / 1.0), x = lerp(620, 960, ease(k)); J = k < 1 ? walk(x, 560, (t - 119.5) * 7) : stand(960, 560, { look: 10 }); J.look = 10; if (k >= 1) { J.lh = [990, 380]; J.le = [976, 410]; } fixArms(J); s += fig(J, { flame: 0.95, t, mood: 'fierce' }) + life(J, sparkN(33)) + (k >= 1 ? handDot(J.lh) : ''); }
    // chữ thì thầm tự vẽ (không có hình cái bóng); vỡ thành từng chữ cái rơi khi Spark bật dậy
    const w = 'five more minutes.', o = fade(t, 116.9, 121, 0.3, 0.3), br = ramp(t, 118.9, 119.9);
    let cx = 250;
    if (o > 0) w.split('').forEach((ch, i) => {
      const x = cx + br * (rnd(i) - 0.5) * 60, y = 372 + br * br * (120 + 80 * rnd(i + 4)), r = br * (rnd(i + 9) - 0.5) * 120;
      cx += 'il.t '.includes(ch) ? 4.6 : ch === 'm' ? 13.2 : 8.6;
      s += `<text x="${x}" y="${y}" transform="rotate(${r} ${x} ${y})" fill="#ff9aa6" fill-opacity="${o * (1 - br)}" stroke="${RED}" stroke-width=".7" stroke-opacity="${o * (1 - br)}" filter="url(#redGlow)" font-family="Inter" font-size="15" font-weight="600">${ch}</text>`;
    });
    return s + hudS(t < 119 ? 84 : 92, { rise: 4 }) + clock(1170, 140, '5:55 AM');
  }, { cam: t => ({ ...STAND(lerp(560, 760, ramp(t, 119.2, 120.6))), k: 1.6 }) });

  // sáng hôm sau ông đi: Spark đội mũ len, rót hai ly ca cao, đặt một ly lên ghế trống (cần câu thứ hai dựng cạnh), rồi ngồi đúng ghế của ông
  function cup(x, y, t, full = 1) {
    let s = `<rect x="${x - 9}" y="${y - 18}" width="18" height="18" rx="3" fill="#e8e2d4" stroke="#8a8478" stroke-width="1.5"/><rect x="${x - 7}" y="${y - 16}" width="14" height="5" fill="#6a3a20" opacity="${full}"/>`;
    for (let j = 0; j < 2; j++) s += `<path d="M${x - 3 + j * 6},${y - 22} q-4,-8 1,-16" fill="none" stroke="#e8e0d0" stroke-width="1.5" opacity="${0.35 + 0.25 * Math.sin(t * 3 + j)}"/>`;
    return s;
  }
  scene(122, 128, t => {
    let s = pier(t, { rise: lerp(0.45, 0.75, ramp(t, 122, 128)) }) + foldChair(620, 548) + foldChair(500, 548) + ln([470, 548], [452, 420], '#6a5038', 3); // cần câu của ông dựng cạnh ghế trống
    const place = ramp(t, 123.0, 123.8), back = ramp(t, 123.9, 124.4), sit = ramp(t, 124.5, 125.3);
    let J;
    if (sit <= 0) {
      J = stand(560, 548, { look: -8 }); J.face = -1; J.head = [J.head[0] - 8 * place, J.head[1] + 6 * place];
      J.lh = mix(mix([532, 470], [506, 480], place), [536, 470], back); J.rh = [578, 470];
    } else {
      const A = stand(560, 548, { look: 10 }), B = sitChair(620, 548, { look: 8 }); J = {}; for (const k in B) J[k] = Array.isArray(B[k]) ? mix(A[k], B[k], sit) : B[k];
      J.rh = [680, 452]; J.re = [662, 480]; J.lh = [672, 456];
      if (t > 126.0) { J.look = -8; J.face = -1; J.head = [J.head[0] - 4, J.head[1]]; } // nhìn sang ghế trống
      if (t > 127.2) { J.look = 8; J.face = 1; } // rồi nhìn ra mặt trời
    }
    fixArms(J);
    if (place >= 1) s += cup(506, 486, t);
    s += fig(J, { flame: 1.0, t, mood: t > 126 && t < 127.2 ? 'neutral' : 'happy' }) + woolCap(J.head[0], J.head[1] + 4) + life(J, sparkN(60), { dy: 16 });
    if (place < 1) s += cup(J.lh[0], J.lh[1] + 6, t) + handDot(J.lh);
    s += cup(J.rh[0], J.rh[1] + 6, t) + handDot(J.rh);
    return s + hudS(100, { rise: 34 });
  }, { cam: { x: 580, y: 420, k: 1.5 } });

  // ================= 9. Tấm gương + tên phim (150.6–165) =================
  scene(150.6, 159.4, t => {
    let s = `<rect x="-600" y="-400" width="2600" height="960" fill="#2a2018"/>` + `<path d="M800,100 L1000,100 L760,600 L460,600Z" fill="#ffd9a0" opacity=".12"/>` + shelf(JAR[0], JAR[1], 220) + jar(JAR[0], JAR[1], 0, t, { open: 1 }) + woolCap(JAR[0] - 64, JAR[1] + 2);
    s += ui(`<rect x="0" y="100" width="1280" height="66" fill="#000" opacity="${0.5 * fade(t, 151.0, 159.2, 0.8, 0.6)}"/>` + txt(640, 144, "Some mornings don't come back.", { size: 40, w: 600, op: fade(t, 151.0, 159.2, 0.8, 0.6) }) +
      `<text x="640" y="610" fill="${YEL}" fill-opacity="${fade(t, 154.2, 159.2, 0.6, 0.6)}" filter="url(#yelGlow)" font-family="Inter" font-size="52" font-weight="800" text-anchor="middle" stroke="#1a0f0c" stroke-width="6" paint-order="stroke">Wake up for them.</text>`);
    return s;
  }, { fo: 0.6, cam: { x: 600, y: 320, k: 2.6 } });
  scene(159.4, 165, t => {
    let s = `<text x="640" y="360" fill="${YEL}" fill-opacity="${fade(t, 159.8, 164.4, 0.8, 0.8)}" filter="url(#yelGlow)" font-family="Inter" font-size="92" font-weight="800" letter-spacing="22" text-anchor="middle">SNOOZE</text>`;
    s += txt(640, 410, 'an animated short film', { size: 22, c: MUTED, ls: 6, op: fade(t, 160.4, 164.4, 0.8, 0.8) });
    s += flame(640, 520, 0.32, t, fade(t, 160.8, 164.4, 0.6, 0.8)) + txt(640, 572, 'Keep the fire.', { size: 20, c: ORANGE, w: 600, ls: 4, op: fade(t, 161.2, 164.4, 0.6, 0.8) });
    return ui(s);
  }, { fo: 0.01 });

  // ---------- lời thì thầm: [giây, câu, thời lượng] ----------
  const WH = [
    [5.2, 'five more minutes.', 2.3],
    [116.9, 'five more minutes.', 2.0],
    [21.6, "it's still dark", 2.0],
    [28.6, 'you deserve rest', 2.0],
    [39.0, 'next time', 1.8],
    [119.4, 'five more minutes', 2.2], [120.4, "he'll understand", 2.0], [121.4, "it's warm here", 1.8], [122.4, 'next time', 1.6],
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
  window.KIT = { fig, shadowFig, flame, glow, txt, stand, slump, sitChair, whisperPose, lieBed, alarm, jar, sunIcon, gpa, bentPose, bedroom, lying, pier, foldChair, rod, windowR, DEFS, MONO, C: { W, BG, MUTED, ORANGE, CORE, RED, YEL, SKIN, COLD } };
  window.DURATION = DUR;
  for (const w of WH) w[0] = toReal(w[0]);
  for (let i = WH.length - 1; i >= 0; i--) if (WH[i][0] === null) WH.splice(i, 1);

  window.WHISPERS = WH;
  const SHAKES = [];
  window.frame = function (T) {
    const m = mapT(T), FB = m.ins, t = m.t; // t = thời gian phim gốc
    let body = '';
    ENEMY = null;
    CLIPN = 0;
    const seed = Math.floor(T * 8) % 9; // nét rung vẽ lại mỗi 3 khung
    const defs = DEFS.replace('seed="4"', `seed="${seed + 1}"`).replace('seed="77"', `seed="${seed + 30}"`);
    for (const sc of FB ? SI : S) {
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
