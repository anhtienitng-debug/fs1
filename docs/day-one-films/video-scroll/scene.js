// SCROLL — vẽ khung hình tại thời điểm t (giây). Chạy trong trình duyệt: window.frame(t) → chuỗi SVG.
(function () {
  const W = '#f4f1ea', BG = '#0b0b0c', MUTED = '#8d8a84', GREY = '#55534f';
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
    s += `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="5" fill="${lit > 0 ? '#dfe9f5' : '#141416'}" fill-opacity="${lit > 0 ? 0.35 + 0.6 * lit : 1}" ${st(W, 2.5)}/>`;
    return s + '</g>';
  }

  // ---------- người que ----------
  function fig(J, o = {}) {
    const c = o.c || W, op = o.op ?? 1;
    const sh = mix(J.neck, J.hip, 0.15);
    let s = `<g opacity="${op}">`;
    s += ln(J.hip, J.neck, c);
    s += pl([sh, J.le, J.lh], c) + pl([sh, J.re, J.rh], c);
    s += pl([J.hip, J.lk, J.lf], c) + pl([J.hip, J.rk, J.rf], c);
    if (o.flame !== undefined) {
      const ch = mix(J.neck, J.hip, 0.42);
      if (o.flame > 0.1) s += glow(ch[0], ch[1] - 10, 60 + 110 * o.flame, 0.25 + 0.3 * o.flame);
      s += flame(ch[0], ch[1] + 22 * Math.max(0.5, o.flame), o.flame * 0.62, o.t || 0);
    }
    s += `<circle cx="${J.head[0]}" cy="${J.head[1]}" r="34" fill="${BG}" ${st(c)}/>`;
    s += eyes(J.head[0] + (J.look || 0), J.head[1], o.mood || 'neutral', c, o.blink);
    return s + '</g>';
  }
  function eyes(x, y, mood, c, blink) {
    if (blink) return ln([x - 16, y + 3], [x - 5, y + 3], c, 4) + ln([x + 5, y + 3], [x + 16, y + 3], c, 4);
    if (mood === 'tired') return ln([x - 16, y + 4], [x - 4, y + 6], c, 4) + ln([x + 6, y + 6], [x + 18, y + 4], c, 4);
    if (mood === 'happy') return `<path d="M${x - 17},${y + 4} Q${x - 11},${y - 4} ${x - 5},${y + 4} M${x + 5},${y + 4} Q${x + 11},${y - 4} ${x + 17},${y + 4}" fill="none" ${st(c, 4)}/>`;
    let s = `<circle cx="${x - 11}" cy="${y + 2}" r="4.5" fill="${c}"/><circle cx="${x + 11}" cy="${y + 2}" r="4.5" fill="${c}"/>`;
    if (mood === 'fierce') s += ln([x - 19, y - 12], [x - 5, y - 7], c, 4) + ln([x + 19, y - 12], [x + 5, y - 7], c, 4);
    if (mood === 'sad') s += ln([x - 18, y - 7], [x - 5, y - 12], c, 3.5) + ln([x + 18, y - 7], [x + 5, y - 12], c, 3.5);
    return s;
  }
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
    const a = Math.sin(ph), b = Math.cos(ph), up = Math.abs(b) * 8;
    return {
      head: [x + 26, g - 192 - up], neck: [x + 16, g - 154 - up], hip: [x, g - 74 - up],
      le: [x + 6 - 30 * a, g - 120 - up], lh: [x + 20 - 50 * a, g - 140 - up + 10 * a], re: [x + 6 + 30 * a, g - 120 - up], rh: [x + 20 + 50 * a, g - 140 - up - 10 * a],
      lk: [x + 34 * a, g - 40 - up], lf: [x + 40 * a - 10, g - Math.max(0, b) * 22], rk: [x - 34 * a, g - 40 - up], rf: [x - 40 * a - 10, g - Math.max(0, -b) * 22], look: 10,
    };
  }
  function armsUp(x, g, k = 1) {
    const J = stand(x, g);
    J.le = mix(J.le, [x - 34, g - 178], k); J.lh = mix(J.lh, [x - 56, g - 216], k);
    J.re = mix(J.re, [x + 34, g - 178], k); J.rh = mix(J.rh, [x + 56, g - 216], k);
    return J;
  }
  function sitGround(x, g) {
    return {
      head: [x, g - 145], neck: [x, g - 108], hip: [x, g - 24],
      le: [x - 24, g - 80], lh: [x - 32, g - 56], re: [x + 24, g - 80], rh: [x + 32, g - 56],
      lk: [x - 32, g - 54], lf: [x - 42, g], rk: [x + 32, g - 54], rf: [x + 42, g], look: 0,
    };
  }
  const ground = (x1, x2, g, o = 1) => ln([x1, g], [x2, g], '#2a2a2a', 3, o);

  // ---------- đạo cụ ----------
  function bed(x, y) {
    return `<rect x="${x - 190}" y="${y - 6}" width="380" height="40" rx="6" fill="#121214" ${st('#3a3a3a', 3)}/>` +
      ln([x - 190, y + 34], [x - 190, y + 70], '#3a3a3a', 3) + ln([x + 190, y + 34], [x + 190, y + 70], '#3a3a3a', 3) +
      `<rect x="${x - 196}" y="${y - 70}" width="12" height="140" rx="4" fill="#121214" ${st('#3a3a3a', 3)}/>` +
      `<ellipse cx="${x - 140}" cy="${y - 14}" rx="40" ry="12" fill="#18181a" ${st('#3a3a3a', 3)}/>`;
  }
  function desk(x, g) {
    return ln([x - 120, g - 130], [x + 140, g - 130], '#5a5a5a', 5) + ln([x - 100, g - 130], [x - 100, g], '#3a3a3a', 4) + ln([x + 120, g - 130], [x + 120, g], '#3a3a3a', 4);
  }
  function chair(x, g) { return ln([x - 26, g - 90], [x + 26, g - 90], '#3a3a3a', 4) + ln([x - 22, g - 90], [x - 22, g], '#3a3a3a', 4) + ln([x + 22, g - 90], [x + 22, g], '#3a3a3a', 4) + ln([x - 26, g - 90], [x - 30, g - 190], '#3a3a3a', 4); }
  function books(x, y, open = 0) {
    if (open) return `<path d="M${x - 46},${y} L${x},${y + 6} L${x + 46},${y} L${x + 46},${y - 34} L${x},${y - 28} L${x - 46},${y - 34}Z" fill="${W}" fill-opacity=".92"/>` + ln([x, y + 6], [x, y - 28], '#bbb', 2);
    return `<rect x="${x - 40}" y="${y - 14}" width="80" height="14" fill="#2a2a2c" ${st('#555', 2)}/><rect x="${x - 34}" y="${y - 28}" width="70" height="14" fill="#2a2a2c" ${st('#555', 2)}/><rect x="${x - 38}" y="${y - 42}" width="76" height="14" fill="#2a2a2c" ${st('#555', 2)}/>`;
  }
  function clock(x, y, s) { return txt(x, y, s, { size: 22, c: '#6f6c66', w: 600, ls: 3 }); }
  function hud(day, screen, o = 1) {
    let s = '';
    if (day) s += txt(56, 66, `DAY ${day}`, { a: 'start', size: 22, w: 800, c: ORANGE, ls: 5, op: o });
    if (screen) s += txt(1224, 66, `SCREEN TIME  ${screen}`, { a: 'end', size: 18, w: 600, c: '#7b7872', ls: 3, op: o });
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
  const scene = (a, b, fn, fx = {}) => S.push({ a, b, fn, fi: fx.fi ?? 0.3, fo: fx.fo ?? 0.3 });

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
    const J = lieBed(660, by);
    const ph = J.rh, pp = [ph[0] + 6, ph[1] - 26];
    const [fk] = flicks(t, a + 0.6, period);
    s += phone(pp[0], pp[1], 160, 0.8 + 0.2 * fk);
    s += fig(J, { flame: flameAmt, t, mood: 'tired' });
    const ch = mix(J.neck, J.hip, 0.42);
    s += thread([ch[0], ch[1] - 6], pp, t, 0.25 + 0.75 * fk);
    if (clockStr) s += clock(1080, 140, clockStr);
    if (demonK) s += smoke(380, 420, demonK, t, ramp(t, a + 0.4, a + 1.4)) + whisper(380, 420 - 120 * demonK - 18, line, fade(t, a + 1.2, a + 5.6, 0.5, 0.5));
    return s;
  }
  scene(7, 14, t => bedScene(t, 7, 0.55, 0) + txt(640, 170, 'Just one more.', { size: 40, op: fade(t, 9.5, 13.6) }));

  // 3. Trượt dốc
  scene(14, 20, t => hud(12, '2h 10m') + bedScene(t, 14, 0.45, 0.4, 'one more video', '2:14 AM', 1.0), { fi: 0.15, fo: 0.15 });
  scene(20, 26, t => {
    let s = hud(45, '3h 48m') + ground(140, 1140, 560) + desk(760, 560) + chair(560, 560) + books(700, 430) + books(820, 430);
    const J = sitChair(560, 560, { hand: [610, 470], hand2: [616, 468], look: 10 });
    J.head = [596, 368]; J.neck = [578, 396];
    const [fk] = flicks(t, 20.5, 1.0);
    s += phone(616, 448, 10, 0.8 + 0.2 * fk) + fig(J, { flame: 0.35, t, mood: 'tired' });
    s += thread(mix(J.neck, J.hip, 0.42), [616, 448], t, 0.3 + 0.7 * fk);
    return s + smoke(360, 360, 0.55, t, ramp(t, 20.6, 21.6)) + whisper(360, 280, 'you deserve a break', fade(t, 21.4, 25.6, 0.5, 0.5));
  }, { fi: 0.15, fo: 0.15 });
  scene(26, 32, t => {
    let s = hud(88, '5h 02m') + ground(140, 1140, 560) + ln([400, 470], [880, 470], '#5a5a5a', 5) + ln([440, 470], [440, 560], '#3a3a3a', 4) + ln([840, 470], [840, 560], '#3a3a3a', 4);
    const fo = lerp(1, 0.12, ramp(t, 27, 31));
    const L = stand(330, 560, { look: 8 }), R = stand(950, 560, { look: -8 });
    const wave = Math.sin(t * 5) * 14;
    L.re = [356, 430 + wave]; L.rh = [384, 410 + wave]; R.le = [924, 428 - wave]; R.lh = [896, 412 - wave];
    s += fig(L, { op: fo, mood: 'happy' }) + fig(R, { op: fo, mood: 'happy' });
    const J = standPhone(632, 560);
    const [fk] = flicks(t, 26.6, 1.1);
    s += phone(682, 432, 15, 0.8 + 0.2 * fk) + fig(J, { flame: 0.25, t, mood: 'tired' });
    return s + thread(mix(J.neck, J.hip, 0.42), [682, 432], t, 0.3 + 0.7 * fk);
  }, { fi: 0.15, fo: 0.15 });
  scene(32, 38, t => {
    let s = hud(140, '6h 31m');
    for (let i = 0; i < 9; i++) { const x = ((i * 170 - t * 120) % 1530 + 1530) % 1530 - 120; s += ln([x, 560], [x + 60, 560], '#2a2a2a', 3); }
    s += ln([0, 560], [1280, 560], '#1d1d1f', 2);
    const J = walk(620, 560, t * 6, { phone: true });
    const [fk] = flicks(t, 32.5, 1.0);
    s += phone(668, 430, 15, 0.8 + 0.2 * fk) + fig(J, { flame: 0.16, t, mood: 'tired' });
    s += thread(mix(J.neck, J.hip, 0.42), [668, 430], t, 0.3 + 0.7 * fk);
    return s + smoke(820, 300, 0.75, t, ramp(t, 32.5, 33.5)) + whisper(820, 190, "it's only 5 minutes", fade(t, 33.2, 37.6, 0.5, 0.5));
  }, { fi: 0.15, fo: 0.15 });
  scene(38, 44, t => hud(201, '8h 57m') + bedScene(t, 38, 0.06, 1.1, "you'll start tomorrow", '3:12 AM', 0.9), { fi: 0.15, fo: 0.15 });
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
      s += `<g opacity="${0.55 * r}">`;
      const J = slump(632, 600);
      s += fig(J, { c: '#8a8a8a', mood: 'tired', flame: 0.05, t });
      s += '</g>';
      const beat = Math.pow(Math.max(0, Math.sin((t - 46) * Math.PI / 0.9)), 8);
      s += glow(642, 486, 40 + 30 * beat, 0.25 * r * beat);
      s += `<path d="M500,120 L560,120 L520,250Z" fill="#ffffff" opacity="${0.04 * r}"/>`;
    }
    return s;
  }, { fi: 0.15, fo: 0.5 });

  // 4. Bước ngoặt
  scene(50, 62, t => {
    const beat = Math.pow(Math.max(0, Math.sin((t - 50) * Math.PI / 0.9)), 8);
    let s = glow(640, 470, 40 + 30 * beat, 0.4 * beat) + `<circle cx="640" cy="470" r="${4 + 2 * beat}" fill="${EMBER}"/>`;
    s += txt(640, 330, 'The phone never stole your time.', { size: 44, w: 600, op: fade(t, 51.8, 56.4, 0.8, 0.5) });
    s += `<text x="640" y="330" font-family="Inter" font-size="50" font-weight="700" text-anchor="middle" fill="${W}" fill-opacity="${fade(t, 57.0, 61.6, 0.8, 0.6)}">It stole your <tspan fill="${ORANGE}">fire</tspan>.</text>`;
    return s;
  }, { fi: 0.6, fo: 0.6 });

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
    const J = stand(600, 560, { look: 8 });
    J.re = mix([622, 448], [680, 448], k); J.rh = mix([628, 482], [750, 452], k);
    if (t > 67.2) { const m = ramp(t, 67.2, 68.0); J.le = mix(J.le, [604, 452], m); J.lh = mix(J.lh, [598, 476], m); J.re = mix(J.re, [622, 448], ramp(t, 65.6, 66.4)); J.rh = mix(J.rh, [628, 482], ramp(t, 65.6, 66.4)); }
    else if (t > 65.6) { const m = ramp(t, 65.6, 66.4); J.re = mix(J.re, [622, 448], m); J.rh = mix(J.rh, [628, 482], m); }
    const fl = t < 68 ? 0.05 : lerp(0.05, 0.28, ramp(t, 68, 69));
    if (t < 65.2) s += phone(J.rh[0] + 4, J.rh[1] - 18, 0, 0.5, 1 - ramp(t, 64.6, 65.0));
    s += fig(J, { flame: fl, t, mood: t > 68 ? 'fierce' : 'neutral' });
    if (t > 68 && t < 69.5) { const k2 = ramp(t, 68, 69.5); for (let i = 0; i < 10; i++) s += `<circle cx="${600 + Math.cos(i) * 70 * k2}" cy="${484 + Math.sin(i * 1.3) * 70 * k2}" r="${3 * (1 - k2)}" fill="${CORE}"/>`; }
    s += smoke(900, 330, 0.5, t, fade(t, 62.6, 67.4, 0.6, 1.0)) + whisper(900, 250, 'just check once', fade(t, 63.0, 66.6, 0.5, 0.6));
    return s;
  });
  scene(71, 79, t => {
    let s = hud(4, '6h 20m') + ground(140, 1140, 560) + chair(560, 560);
    s += `<path d="M700,250 L640,250 L560,420 L780,420Z" fill="${CORE}" opacity=".05"/>` + ln([700, 250], [700, 560], '#3a3a3a', 4) + `<path d="M660,250 L740,250 L726,226 L674,226Z" fill="#2a2a2c" ${st('#555', 3)}/>`;
    const J = sitChair(560, 560, { hand: [620, 440], hand2: [636, 438], look: 8 });
    J.head = [588, 360]; J.neck = [574, 392];
    s += fig(J, { flame: 0.36, t, mood: 'neutral', blink: (t % 3.3) < 0.12 });
    s += books(628, 440, 1);
    const flip = ((t - 71) % 3) / 3;
    if (flip < 0.25) { const k = flip / 0.25; s += `<path d="M628,446 Q${628 + 46 * Math.cos(k * Math.PI)},${412 - 20 * Math.sin(k * Math.PI)} ${628 + 46 * Math.cos(k * Math.PI)},${412}" fill="none" ${st(W, 2)}/>`; }
    return s;
  });
  scene(79, 87, t => {
    let s = hud(11, '4h 05m');
    s += `<circle cx="1000" cy="560" r="90" fill="${ORANGE}" opacity=".18"/><circle cx="1000" cy="560" r="60" fill="${ORANGE}" opacity=".35"/>`;
    for (let i = 0; i < 9; i++) { const x = ((i * 170 - t * 360) % 1530 + 1530) % 1530 - 120; s += ln([x, 560], [x + 70, 560], '#3a3a3a', 3); }
    s += `<rect x="0" y="560" width="1280" height="160" fill="${BG}"/>` + ln([0, 560], [1280, 560], '#2a2a2a', 3);
    return s + fig(run(560, 560, t * 9), { flame: 0.5, t, mood: 'fierce' });
  });
  scene(87, 95, t => {
    let s = hud(23, '2h 40m') + ground(140, 1140, 560) + desk(760, 560) + chair(560, 560);
    const buzz = [88.5, 91.0, 93.5].some(b => t > b && t < b + 0.6);
    const jx = buzz ? Math.sin(t * 90) * 3 : 0;
    s += phone(860 + jx, 418, 90, buzz ? 1 : 0.3, 1, 22, 40);
    if (t > 88.5) s += `<rect x="868" y="392" width="40" height="20" rx="10" fill="#d0d0d0"/>` + txt(888, 407, '99+', { size: 13, c: BG, w: 800 });
    const J = sitChair(560, 560, { hand: [650 + Math.sin(t * 9) * 8, 428], hand2: [640, 430], look: 10 });
    s += `<rect x="610" y="424" width="90" height="6" fill="${W}" opacity=".85"/>`;
    s += fig(J, { flame: 0.62, t, mood: 'fierce' });
    return s;
  });
  scene(95, 103, t => {
    let s = hud(37, '1h 30m') + `<path d="M140,560 Q640,520 1140,560" fill="none" ${st('#2a2a2a', 3)}/>`;
    const L = stand(420, 556, { look: 8 }), R = stand(860, 556, { look: -8 });
    const wave = Math.sin(t * 4) * 16;
    L.re = [446, 426 + wave]; L.rh = [476, 400 + wave]; R.le = [834, 424 - wave]; R.lh = [806, 404 - wave];
    s += fig(L, { mood: 'happy' }) + fig(R, { mood: 'happy' });
    const J = stand(640, 548);
    J.le = [612, 440]; J.lh = [596, 410 + Math.sin(t * 4 + 1) * 10];
    return s + fig(J, { flame: 0.78, t, mood: 'happy' });
  });
  scene(103, 112, t => {
    let s = hud(60, '1h 05m') + ground(140, 1140, 560);
    s += ln([800, 300], [760, 560], '#5a5a5a', 4) + ln([800, 300], [850, 560], '#5a5a5a', 4) + ln([800, 300], [800, 560], '#3a3a3a', 3);
    s += `<rect x="720" y="300" width="170" height="130" fill="#141416" ${st(W, 3)}/>`;
    const p = ramp(t, 103.5, 111);
    const strokes = [[735, 400, 780, 340], [760, 410, 830, 330], [790, 400, 875, 350], [740, 330, 875, 320], [745, 415, 870, 415]];
    strokes.forEach(([x1, y1, x2, y2], i) => { const k = clamp(p * strokes.length - i); if (k > 0) s += ln([x1, y1], [lerp(x1, x2, k), lerp(y1, y2, k)], i % 2 ? ORANGE : W, 4); });
    const J = stand(600, 560, { look: 10 });
    J.re = [640, 440]; J.rh = mix([700, 420], [lerp(735, 870, (Math.sin(t * 3) + 1) / 2), 380], 1);
    return s + fig(J, { flame: 0.9, t, mood: 'fierce' });
  });

  // 6. Thử thách cuối
  scene(112, 130, t => {
    let s = ground(140, 1140, 560);
    const big = ramp(t, 113, 118) * (1 - ramp(t, 124.2, 126.5));
    const dOff = t > 125.5;
    s += smoke(900, 520, 0.3 + 2.0 * big, t, big > 0.02 ? 1 : 0);
    if (!dOff) s += phone(900, 548, 90, 1, 1, 26, 48);
    else s += `<rect x="876" y="535" width="48" height="26" rx="5" fill="#141416" ${st(W, 2.5)}/>`;
    // thông báo
    if (!dOff) for (let i = 0; i < 8; i++) {
      const tp = 112.3 + i * 0.5; if (t < tp) continue;
      const k = clamp((t - tp) / 0.4), fadeO = 1 - ramp(t, 121, 122.5);
      s += `<rect x="${960 + (i % 2) * 40}" y="${500 - i * 34 - 10 * k}" width="${130}" height="26" rx="13" fill="#2a2f36" opacity="${k * fadeO}"/><circle cx="${978 + (i % 2) * 40}" cy="${513 - i * 34 - 10 * k}" r="6" fill="#59626e" opacity="${k * fadeO}"/>`;
    }
    const ws = [["you're missing out", 640, 170], ["everyone's online", 700, 230], ['just one', 610, 290], ['you deserve it', 690, 350]];
    ws.forEach(([w, x, y], i) => s += whisper(x, y, w, fade(t, 116 + i * 0.9, 122.6, 0.5, 0.6)));
    // Spark
    let fl = 0.9; fl = lerp(fl, 0.42, ramp(t, 116, 121)); fl = lerp(fl, 1.25, ramp(t, 121.6, 124));
    const straight = ramp(t, 121, 122.4);
    let J = straight > 0 ? armsUp(380, 560, 0) : slump(380, 560);
    if (straight > 0 && straight < 1) { const A = slump(380, 560), B = stand(380, 560, { look: 10 }); J = {}; for (const k in B) J[k] = Array.isArray(B[k]) ? mix(A[k], B[k], straight) : B[k]; }
    if (t > 121.6) { const B = stand(380, 560, { look: 10 }); J = B; const m = ramp(t, 122.6, 123.6); J.le = mix(B.le, [348, 400], m); J.lh = mix(B.lh, [330, 364], m); J.re = mix(B.re, [412, 400], m); J.rh = mix(B.rh, [430, 364], m); }
    // hào quang đẩy khói
    const wave = ramp(t, 123.6, 126.5);
    if (wave > 0 && wave < 1) s += `<circle cx="380" cy="470" r="${80 + 900 * wave}" fill="none" ${st(ORANGE, 6, 0.6 * (1 - wave))}/>`;
    s += fig(J, { flame: fl, t, mood: t > 121.4 ? 'fierce' : 'sad' });
    if (t > 126) s += smoke(900, 520, 0.25, t, fade(t, 126, 128.5, 0.01, 2.4)) ;
    return s;
  });

  // 7. Kết
  scene(130, 144, t => {
    const sun = ramp(t, 130, 138);
    let s = `<defs><linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BG}"/><stop offset=".7" stop-color="#1a1209"/><stop offset="1" stop-color="#3a2410"/></linearGradient></defs>`;
    s += `<rect width="1280" height="720" fill="url(#dawn)" opacity="${0.4 + 0.6 * sun}"/>`;
    s += `<circle cx="900" cy="${640 - 120 * sun}" r="70" fill="${CORE}" opacity="${0.55 * sun}"/>` + glow(900, 640 - 120 * sun, 260, 0.35 * sun);
    s += `<path d="M-20,600 Q500,500 1300,600 L1300,720 L-20,720Z" fill="${BG}" ${st('#3a2a1a', 3)}/>`;
    s += fig(sitGround(540, 556), { flame: 1.0, t, mood: 'happy', blink: (t % 4) < 0.12 });
    s += fig(sitGround(690, 552), { mood: 'happy' });
    s += txt(640, 150, 'Your attention is your fire.', { size: 44, w: 600, op: fade(t, 132.4, 138.6, 0.8, 0.6) });
    s += txt(640, 150, 'Guard it.', { size: 52, w: 700, c: ORANGE, op: fade(t, 139.2, 143.6, 0.6, 0.6) });
    return s;
  }, { fi: 0.8, fo: 0.8 });
  scene(144, 150, t => {
    let s = txt(640, 360, 'SCROLL', { size: 92, w: 800, ls: 22, op: fade(t, 144.6, 149.2, 0.8, 0.8) });
    s += txt(640, 410, 'an animated short film', { size: 22, c: MUTED, ls: 6, op: fade(t, 145.4, 149.2, 0.8, 0.8) });
    s += flame(640, 520, 0.32, t, fade(t, 146.0, 149.2, 0.6, 0.8)) + txt(640, 572, 'Keep the fire.', { size: 20, c: ORANGE, w: 600, ls: 4, op: fade(t, 146.4, 149.2, 0.6, 0.8) });
    return s;
  }, { fi: 0.6, fo: 0.01 });

  const DEFS = `<defs><radialGradient id="gO"><stop offset="0" stop-color="${ORANGE}" stop-opacity=".9"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="gC"><stop offset="0" stop-color="${COLD}" stop-opacity=".7"/><stop offset="1" stop-color="${COLD}" stop-opacity="0"/></radialGradient></defs>`;

  window.DURATION = DUR;
  window.frame = function (t) {
    let body = '';
    for (const sc of S) {
      if (t < sc.a || t >= sc.b) continue;
      const o = Math.min(clamp((t - sc.a) / sc.fi), clamp((sc.b - t) / sc.fo));
      body += `<g opacity="${o}">${sc.fn(t)}</g>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1280 720">${DEFS}<rect width="1280" height="720" fill="${BG}"/>${body}</svg>`;
  };
})();
