// 5 phong cách nhân vật bóng người trắng + cái bóng viền đỏ, cùng một cảnh để so sánh.
// Chạy: node ve-5-ban-bong.js <thư mục ra>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = process.argv[2];
const BG = '#08080a', W = '#f4f1ea', RED = '#e63946', ORANGE = '#ff8a1f', CORE = '#ffd166', COLD = '#bcd7ff';

const mix = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
const unit = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
const add = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

// đoạn chi thon: từ p (rộng w1) tới q (rộng w2)
function taper(p, q, w1, w2, c) {
  const u = unit(p, q), n = [-u[1], u[0]];
  const a = add(p, n, w1 / 2), b = add(q, n, w2 / 2), cc = add(q, n, -w2 / 2), d = add(p, n, -w1 / 2);
  return `<path d="M${a} L${b} L${cc} L${d}Z" fill="${c}"/><circle cx="${p[0]}" cy="${p[1]}" r="${w1 / 2}" fill="${c}"/><circle cx="${q[0]}" cy="${q[1]}" r="${w2 / 2}" fill="${c}"/>`;
}
// vẽ thân người theo khớp J và tỷ lệ P; e = độ dày thêm (để tạo viền)
function parts(J, P, c, e = 0) {
  const u = unit(J.neck, J.hip), n = [-u[1], u[0]];
  const S = add(J.neck, u, P.shDrop);
  const pf = P.profile ?? 0.68; // nhìn nghiêng: thân hẹp lại
  const sA = add(S, n, P.torso[0] * pf / 2), sB = add(S, n, -P.torso[0] * pf / 2);
  const wst = mix(S, J.hip, 0.6);
  const wA = add(wst, n, P.torso[1] * pf / 2), wB = add(wst, n, -P.torso[1] * pf / 2);
  const hA = add(J.hip, n, P.torso[2] * pf / 2), hB = add(J.hip, n, -P.torso[2] * pf / 2);
  const [shL, shR] = dist(sA, J.le) <= dist(sB, J.le) ? [sA, sB] : [sB, sA];
  const [hpL, hpR] = dist(hA, J.lk) <= dist(hB, J.lk) ? [hA, hB] : [hB, hA];
  const [a1, a2, a3] = P.arm, [l1, l2, l3] = P.leg;
  let s = '';
  s += taper(hpL, J.lk, l1 + e, l2 + e, c) + taper(J.lk, J.lf, l2 + e, l3 + e, c);
  s += taper(hpR, J.rk, l1 + e, l2 + e, c) + taper(J.rk, J.rf, l2 + e, l3 + e, c);
  const fd = J.face || 1;
  s += taper(J.lf, [J.lf[0] + P.foot * fd, J.lf[1]], l3 + e, l3 * 0.8 + e, c) + taper(J.rf, [J.rf[0] + P.foot * fd, J.rf[1]], l3 + e, l3 * 0.8 + e, c);
  s += `<path d="M${sA} Q${add(mix(sA, wA, 0.5), n, 3)} ${wA} L${hA} L${hB} L${wB} Q${add(mix(sB, wB, 0.5), n, -3)} ${sB}Z" fill="${c}" stroke="${c}" stroke-width="${10 + e}" stroke-linejoin="round"/>`;
  s += taper(shL, J.le, a1 + e, a2 + e, c) + taper(J.le, J.lh, a2 + e, a3 + e, c);
  s += taper(shR, J.re, a1 + e, a2 + e, c) + taper(J.re, J.rh, a2 + e, a3 + e, c);
  s += `<circle cx="${J.lh[0]}" cy="${J.lh[1]}" r="${a3 * 0.75 + e / 2}" fill="${c}"/><circle cx="${J.rh[0]}" cy="${J.rh[1]}" r="${a3 * 0.75 + e / 2}" fill="${c}"/>`;
  s += taper(J.neck, add(J.neck, unit(J.neck, J.head), P.head[1] * 0.9), P.neck + e, P.neck + e, c);
  const ang = Math.atan2(J.head[0] - J.neck[0], -(J.head[1] - J.neck[1])) * 180 / Math.PI;
  s += `<ellipse cx="${J.head[0]}" cy="${J.head[1]}" rx="${P.head[0] + e / 2}" ry="${P.head[1] + e / 2}" fill="${c}" transform="rotate(${ang} ${J.head[0]} ${J.head[1]})"/>`;
  return s;
}

// Tư thế: Spark ngồi mép giường cúi xuống điện thoại; cái bóng đứng sau ghé tai
function sitHunched(x, g, P) {
  const k = P.scale || 1;
  const T = (dx, dy) => [x + dx * k, g + dy * k];
  return {
    hip: T(0, -96), neck: T(20, -178), head: T(42 + (P.headDx || 0), -202 + (P.headDy || 0)),
    le: T(30, -116), lh: T(70, -134), re: T(40, -112), rh: T(78, -130),
    lk: T(62, -100), lf: T(64, 0), rk: T(70, -96), rf: T(76, 0), face: 1,
  };
}
function whisperLean(x, g, P) {
  const k = P.scale || 1;
  const T = (dx, dy) => [x + dx * k, g + dy * k];
  return {
    hip: T(0, -84), neck: T(42, -176), head: T(78 + (P.headDx || 0), -198 + (P.headDy || 0)),
    le: T(70, -150), lh: T(104, -192), re: T(22, -130), rh: T(10, -92),
    lk: T(4, -42), lf: T(-8, 0), rk: T(22, -42), rf: T(26, 0), face: 1,
  };
}

// ---------- 5 phong cách ----------
const STYLES = [
  {
    id: 'a-manocanh', code: 'A', name: 'Ma-nơ-canh trơn',
    note: 'Khối tròn mượt như ma-nơ-canh, đổ bóng nhẹ, ánh điện thoại hắt lên. Gần phim hoạt hình 3D tối giản.',
    P: { head: [24, 29], torso: [58, 40, 42], arm: [17, 14, 11], leg: [26, 19, 13], neck: 15, foot: 18, shDrop: 12 },
    hero: (J, P) => `<g filter="url(#soft)">${parts(J, P, 'url(#gHeroA)')}</g>` + lightMask(J, P, 'mA'),
    shadow: (J, P) => parts(J, P, RED, 8) + parts(J, P, '#120809'),
    text: (x, y, s) => `<text x="${x}" y="${y}" fill="none" stroke="${RED}" stroke-width="1.6" font-family="Inter" font-size="34" font-weight="800" font-style="italic" text-anchor="middle">${s}</text>`,
    bg: 'room',
  },
  {
    id: 'b-manh-khanh', code: 'B', name: 'Mảnh khảnh, sương mù (kiểu Limbo/Inside)',
    note: 'Tỷ lệ người thật, mảnh và cao. Trắng phát sáng nhẹ trong sương. Không khí điện ảnh, u buồn.',
    P: { head: [16, 21], torso: [44, 28, 30], arm: [11, 9, 7], leg: [17, 12, 8], neck: 10, foot: 14, shDrop: 10, scale: 1.12 },
    hero: (J, P) => `<g filter="url(#glowW)">${parts(J, P, W)}</g>`,
    shadow: (J, P) => `<g filter="url(#glowR)">${parts(J, P, RED, 4)}</g>` + parts(J, P, '#0b0708'),
    text: (x, y, s) => `<text x="${x}" y="${y}" fill="none" stroke="${RED}" stroke-width="1.1" font-family="Georgia, serif" font-size="32" font-style="italic" text-anchor="middle" letter-spacing="2" filter="url(#glowR)">${s}</text>`,
    bg: 'fog',
  },
  {
    id: 'c-chibi', code: 'C', name: 'Chibi đầu to, mắt chấm',
    note: 'Đầu to, thân ngắn, hai mắt chấm đen biểu cảm. Dễ thương, dễ đồng cảm, hợp khán giả trẻ.',
    P: { head: [44, 42], torso: [52, 42, 46], arm: [16, 14, 12], leg: [22, 18, 14], neck: 12, foot: 16, shDrop: 6, headDx: 4, headDy: -12, scale: 0.92 },
    hero: (J, P) => parts(J, P, W) + eyesC(J, P),
    shadow: (J, P) => parts(J, P, RED, 10) + parts(J, P, '#120809') + eyesC(J, P, RED),
    text: (x, y, s) => `<text x="${x}" y="${y}" fill="none" stroke="${RED}" stroke-width="2.2" font-family="Inter" font-size="38" font-weight="900" text-anchor="middle">${s}</text>`,
    bg: 'room',
  },
  {
    id: 'd-phan-trang', code: 'D', name: 'Phấn trắng vẽ tay',
    note: 'Như vẽ bằng phấn trên bảng đen: nét run, hạt nhám. Cái bóng là phấn đỏ. Cảm giác làm tay, không giống AI.',
    P: { head: [23, 28], torso: [54, 36, 38], arm: [15, 12, 10], leg: [23, 17, 12], neck: 13, foot: 17, shDrop: 12 },
    hero: (J, P) => `<g filter="url(#chalk)">${parts(J, P, W)}</g>`,
    shadow: (J, P) => `<g filter="url(#chalkLine)">${parts(J, P, RED, 7)}</g>` + `<g filter="url(#rough)">${parts(J, P, '#0d0b0b')}</g>`,
    text: (x, y, s) => `<text x="${x}" y="${y}" fill="none" stroke="${RED}" stroke-width="1.8" font-family="'Comic Sans MS', 'Segoe Print', cursive" font-size="36" text-anchor="middle" filter="url(#rough)">${s}</text>`,
    bg: 'chalk',
  },
  {
    id: 'e-linh-hon', code: 'E', name: 'Linh hồn phát sáng',
    note: 'Thân trắng toả sáng, viền mờ, có hạt bụi sáng bay lên. Cái bóng có viền đỏ phát sáng. Hợp tên "soul".',
    P: { head: [22, 27], torso: [54, 36, 38], arm: [15, 12, 10], leg: [24, 17, 12], neck: 13, foot: 16, shDrop: 12 },
    hero: (J, P) => `<g filter="url(#aura)">${parts(J, P, '#ffffff')}</g>` + motes(J),
    shadow: (J, P) => `<g filter="url(#auraR)">${parts(J, P, RED, 6)}</g>` + parts(J, P, '#0a0607'),
    text: (x, y, s) => `<text x="${x}" y="${y}" fill="none" stroke="${RED}" stroke-width="1.4" font-family="Inter" font-size="34" font-weight="700" font-style="italic" text-anchor="middle" filter="url(#auraR)">${s}</text>`,
    bg: 'void',
  },
];

function eyesC(J, P, c = '#111') {
  const [x, y] = J.head;
  return `<ellipse cx="${x + 6}" cy="${y + 6}" rx="5" ry="7" fill="${c}"/><ellipse cx="${x + 26}" cy="${y + 6}" rx="5" ry="7" fill="${c}"/>`;
}
function motes(J) {
  let s = '';
  for (let i = 0; i < 18; i++) {
    const r = Math.sin(i * 12.9898) * 43758.5453, k = r - Math.floor(r);
    s += `<circle cx="${J.hip[0] - 60 + 160 * k}" cy="${J.head[1] - 40 - 160 * ((i * 0.37) % 1)}" r="${1 + 2.2 * k}" fill="#fff" opacity="${0.25 + 0.5 * k}"/>`;
  }
  return s;
}
// ánh sáng lạnh từ điện thoại hắt lên mặt và tay (dùng mặt nạ thân người)
function lightMask(J, P, id) {
  return `<mask id="${id}"><rect x="0" y="0" width="1920" height="1080" fill="#000"/>${parts(J, P, '#fff')}</mask>` +
    `<rect x="0" y="0" width="1920" height="1080" fill="url(#gPhoneLight)" mask="url(#${id})"/>`;
}

// ---------- bối cảnh ----------
function scene(st) {
  const G = 780, x = 900;
  const hero = sitHunched(x, G, st.P), sh = whisperLean(x - 112, G, st.P);
  const phoneP = mix(hero.lh, hero.rh, 0.5);
  let bg = '', fg = '', full = '';
  if (st.bg === 'room') {
    bg += `<rect x="1180" y="180" width="260" height="320" fill="#10141c" stroke="#232a36" stroke-width="6"/><line x1="1310" y1="180" x2="1310" y2="500" stroke="#232a36" stroke-width="6"/><line x1="1180" y1="340" x2="1440" y2="340" stroke="#232a36" stroke-width="6"/>`;
    bg += `<circle cx="1380" cy="240" r="26" fill="#cfd8e6" opacity=".55"/><path d="M1180,500 L1440,500 L1300,${G} L980,${G}Z" fill="#9fb3d1" opacity=".05"/>`;
  }
  if (st.bg === 'fog') {
    full += `<rect x="0" y="0" width="1920" height="1080" fill="url(#gFog)"/>`;
    full += '';
  }
  if (st.bg === 'chalk') full += `<rect x="0" y="0" width="1920" height="1080" fill="#14181a" filter="url(#board)"/>`;
  if (st.bg === 'void') full += `<rect x="0" y="0" width="1920" height="1080" fill="url(#gVoid)"/>`;
  // giường
  const bedC = st.bg === 'chalk' ? '#cfcbc2' : '#2b2b30';
  bg += `<g ${st.bg === 'chalk' ? 'filter="url(#rough)"' : ''}><rect x="${x - 220}" y="${G - 96}" width="560" height="44" rx="8" fill="${st.bg === 'chalk' ? 'none' : '#141417'}" stroke="${bedC}" stroke-width="4"/>` +
    `<line x1="${x - 220}" y1="${G - 52}" x2="${x - 220}" y2="${G}" stroke="${bedC}" stroke-width="4"/><line x1="${x + 340}" y1="${G - 52}" x2="${x + 340}" y2="${G}" stroke="${bedC}" stroke-width="4"/>` +
    `<rect x="${x + 230}" y="${G - 220}" width="16" height="168" rx="4" fill="${st.bg === 'chalk' ? 'none' : '#141417'}" stroke="${bedC}" stroke-width="4"/></g>`;
  bg += `<line x1="-600" y1="${G}" x2="2400" y2="${G}" stroke="${st.bg === 'chalk' ? '#5a5f60' : '#1e1e22'}" stroke-width="3"/>`;
  // ánh điện thoại
  const glowPhone = `<circle cx="${phoneP[0]}" cy="${phoneP[1]}" r="260" fill="url(#gCold)" opacity=".55"/>`;
  const phone = `<g transform="translate(${phoneP[0] + 4},${phoneP[1] - 10}) rotate(-20)"><rect x="-13" y="-22" width="26" height="44" rx="5" fill="#dfe9f5" stroke="#fff" stroke-width="2"/></g>`;
  // ngọn lửa nhỏ trong ngực (giữ ẩn dụ)
  const ch = mix(hero.neck, hero.hip, 0.38);
  const chestGlow = `<circle cx="${ch[0]}" cy="${ch[1]}" r="90" fill="url(#gO)" opacity=".35"/>`;
  const flame = `<path d="M${ch[0]},${ch[1] - 30} C${ch[0] + 14},${ch[1] - 14} ${ch[0] + 11},${ch[1]} ${ch[0]},${ch[1]} C${ch[0] - 11},${ch[1]} ${ch[0] - 14},${ch[1] - 14} ${ch[0]},${ch[1] - 30}Z" fill="${ORANGE}"/><path d="M${ch[0]},${ch[1] - 17} C${ch[0] + 8},${ch[1] - 8} ${ch[0] + 6},${ch[1]} ${ch[0]},${ch[1]} C${ch[0] - 6},${ch[1]} ${ch[0] - 8},${ch[1] - 8} ${ch[0]},${ch[1] - 17}Z" fill="${CORE}"/>`;
  const words = `<g transform="translate(${sh.head[0]},${sh.head[1]}) scale(.6) translate(${-sh.head[0]},${-sh.head[1]})">` + st.text(sh.head[0] - 140, sh.head[1] - 150, 'just one more') + st.text(sh.head[0] + 60, sh.head[1] - 95, 'you can sleep later') +
    `<g opacity=".55">${st.text(sh.head[0] - 200, sh.head[1] - 40, "it's not that late")}</g></g>`;
  const K = 1.95, cx = 830, cy = 640;
  const haze = st.bg === 'fog' ? `<rect x="0" y="720" width="1920" height="360" fill="url(#gHaze)"/>` : '';
  return full + `<g transform="translate(${960 - cx * K},${560 - cy * K}) scale(${K})">` + bg + glowPhone + chestGlow + st.shadow(sh, st.P) + st.hero(hero, st.P) + flame + phone + words + '</g>' + haze;
}

const DEFS = `<defs>
  <radialGradient id="gO"><stop offset="0" stop-color="${ORANGE}" stop-opacity=".9"/><stop offset="1" stop-color="${ORANGE}" stop-opacity="0"/></radialGradient>
  <radialGradient id="gCold"><stop offset="0" stop-color="${COLD}" stop-opacity=".55"/><stop offset="1" stop-color="${COLD}" stop-opacity="0"/></radialGradient>
  <linearGradient id="gHeroA" gradientUnits="userSpaceOnUse" x1="0" y1="560" x2="0" y2="790"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e9e5dc"/><stop offset="1" stop-color="#a9a49b"/></linearGradient>
  <radialGradient id="gPhoneLight" gradientUnits="userSpaceOnUse" cx="980" cy="650" r="160"><stop offset="0" stop-color="${COLD}" stop-opacity=".55"/><stop offset="1" stop-color="${COLD}" stop-opacity="0"/></radialGradient>
  <linearGradient id="gFog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0d10"/><stop offset=".75" stop-color="#1b1d22"/><stop offset="1" stop-color="#26282d"/></linearGradient>
  <linearGradient id="gHaze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa0aa" stop-opacity="0"/><stop offset=".5" stop-color="#9aa0aa" stop-opacity=".10"/><stop offset="1" stop-color="#9aa0aa" stop-opacity=".22"/></linearGradient>
  <radialGradient id="gVoid" cx=".5" cy=".62" r=".7"><stop offset="0" stop-color="#14121c"/><stop offset="1" stop-color="#050507"/></radialGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".6"/></filter>
  <filter id="glowW" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .55 0"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="glowR" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="aura" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur in="SourceGraphic" stdDeviation="22" result="b1"/><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b2"/><feMerge><feMergeNode in="b1"/><feMergeNode in="b1"/><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="auraR" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="5"/></filter>
  <filter id="chalk" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.2 1.7" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="2" result="w"/><feDisplacementMap in="c" in2="w" scale="5"/></filter>
  <filter id="chalkLine" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2 1.6" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="4" result="w"/><feDisplacementMap in="c" in2="w" scale="6"/></filter>
  <filter id="board"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="3" seed="1" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .3  0 0 0 0 .33  0 0 0 0 .34  0 0 0 .08 0" result="d"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="d"/></feMerge></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="8"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .05 0"/></filter>
  <radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
</defs>`;

function card(st) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">${DEFS}
  <rect width="1920" height="1080" fill="${BG}"/>${scene(st)}
  <rect width="1920" height="1080" filter="url(#grain)"/><rect width="1920" height="1080" fill="url(#vig)"/>
  <rect x="0" y="930" width="1920" height="150" fill="#000" opacity=".55"/>
  <text x="70" y="992" fill="${ORANGE}" font-family="Inter" font-size="30" font-weight="800" letter-spacing="4">BẢN ${st.code}</text>
  <text x="210" y="992" fill="${W}" font-family="Inter" font-size="34" font-weight="800">${st.name}</text>
  <text x="70" y="1040" fill="#b9b5ad" font-family="Inter" font-size="24">${st.note}</text></svg>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  for (const st of STYLES) {
    await page.setContent(`<html><body style="margin:0;background:${BG}">${card(st)}</body></html>`);
    await page.waitForTimeout(200);
    const f = path.join(OUT, `bong-${st.id}.png`);
    await page.screenshot({ path: f });
    console.log(f);
  }
  await browser.close();
})();
