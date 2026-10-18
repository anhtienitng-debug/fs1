// Thumbnail PERFECT (1280×720), vẽ bằng đúng nhân vật và tranh trong phim (scene.js → window.KIT).
// Chạy: node ve-thumbnail.js <thư mục ra>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ART = () => {
  const K = window.KIT, { W, BG, ORANGE, YEL, RED } = K.C;
  const T = 0.35;
  const at = (x, y, k, s) => `<g transform="translate(${x},${y}) scale(${k})">${s}</g>`;
  const big = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" fill="${o.c || W}" font-family="Inter" font-size="${o.size || 100}" font-weight="900" text-anchor="${o.a || 'start'}" stroke="#000" stroke-width="${o.sw || 14}" paint-order="stroke"${o.f ? ` filter="url(#${o.f})"` : ''}>${s}</text>`;
  const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">${K.DEFS}<rect width="1280" height="720" fill="${BG}"/>${body}<rect width="1280" height="720" filter="url(#grain)" opacity=".5"/><rect width="1280" height="720" fill="url(#vig)"/></svg>`;
  // tờ giấy vẽ con chim với các vòng bút đỏ
  const paper = (x, y, k, o = {}) => {
    let s = `<g transform="translate(${x},${y}) scale(${k}) rotate(${o.rot || -3})"><rect x="0" y="0" width="124" height="90" fill="#efe7d6" stroke="#b9ab98" stroke-width="1.5"/>`;
    for (let i = 0; i < (o.smudge || 0); i++) s += `<ellipse cx="${16 + (i * 37) % 92}" cy="${14 + (i * 23) % 62}" rx="12" ry="6" fill="#8a8478" opacity=".16"/>`;
    s += K.art(o.name || 'bird', 8, 8, 1.08, 1, { w: 2.2, ghost: o.ghost });
    if (o.circles) [[30, 16, 9], [66, 22, 8], [92, 40, 6], [36, 52, 8], [18, 46, 7]].forEach(([cx, cy, r]) => { s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${RED}" stroke-width="2.4" filter="url(#redGlow)"/>`; });
    if (o.sign) s += `<text x="80" y="84" fill="${YEL}" filter="url(#yelGlow)" font-family="Inter" font-size="14" font-weight="700" font-style="italic">Spark</text>`;
    return s + '</g>';
  };
  return {
    // A: kẻ thù cầm bút đỏ chỉ vào bức chim; mặt Spark to, buồn; một nguồn sáng (đèn bàn)
    A() {
      let s = K.glow(820, 320, 420, 0.5);
      s += paper(700, 120, 3.0, { circles: true, smudge: 6 });
      const E = K.whisperPose(0, 0, -1); E.lh = [-74, -150]; E.le = [-40, -128];
      s += at(1180, 760, 2.4, K.shadowFig(E));
      s += at(390, 1120, 3.6, K.fig(K.stand(0, 0, { look: 10 }), { flame: 0.1, t: T, mood: 'sad' }));
      s += big(36, 130, 'NOT GOOD', { size: 92 }) + big(36, 236, 'ENOUGH.', { size: 92, c: ORANGE });
      return wrap(s);
    },
    // B: tờ giấy bị tẩy đến rách, đống vụn tẩy, bộ đếm ERASED ×312
    B() {
      let s = K.glow(700, 380, 420, 0.45);
      s += paper(560, 170, 4.0, { ghost: 0.35, smudge: 10, rot: 4 });
      s += `<path d="M810,160 L835,300 L805,420 L850,560 L825,640" fill="none" stroke="${BG}" stroke-width="14"/>`;
      const h = i => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
      for (let i = 0; i < 220; i++) { const u = h(i) - 0.5, hy = 40 * (1 - Math.abs(u) * 2) * h(i + 500); s += `<circle cx="${720 + u * 560}" cy="${700 - hy}" r="${3 + 2 * h(i + 900)}" fill="#b9a8b0" opacity=".9"/>`; }
      s += `<g transform="rotate(-30 1080 560)"><rect x="1040" y="500" width="90" height="150" rx="14" fill="#e6e2ec" stroke="#8a8aa0" stroke-width="4"/><rect x="1040" y="570" width="90" height="46" fill="#5b7fc0"/></g>`;
      s += `<text x="36" y="640" fill="#cfcbc2" font-family="${K.MONO}" font-size="40" font-weight="700" stroke="#000" stroke-width="8" paint-order="stroke">ERASED ×312</text>`;
      s += `<text x="36" y="690" fill="#8d8a84" font-family="${K.MONO}" font-size="30" font-weight="700" stroke="#000" stroke-width="7" paint-order="stroke">FINISHED 0</text>`;
      s += big(36, 116, "WHY CAN'T I", { size: 84 }) + big(36, 214, 'FINISH?', { size: 84, c: ORANGE });
      return wrap(s);
    },
    // C: Spark ký tên giữa những vòng bút đỏ — mặt quyết tâm, lửa sáng
    C() {
      let s = K.glow(640, 360, 460, 0.45);
      s += paper(560, 150, 3.4, { circles: true, sign: true, rot: -2 });
      s += at(380, 1130, 3.6, K.fig(K.stand(0, 0, { look: 10 }), { flame: 1.1, t: T, mood: 'fierce' }));
      s += big(36, 130, 'SIGN IT', { size: 96 }) + big(36, 236, 'ANYWAY.', { size: 96, c: YEL, f: 'yelGlow' });
      return wrap(s);
    },
  };
};

(async () => {
  const OUT = process.argv[2];
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.setContent('<html><body style="margin:0"><div id="v"></div></body></html>');
  await page.addScriptTag({ path: path.join(__dirname, 'scene.js') });
  await page.addScriptTag({ content: `window.ART = (${ART.toString()})();` });
  for (const k of ['A', 'B', 'C']) {
    await page.evaluate(k => { document.getElementById('v').innerHTML = window.ART[k](); }, k);
    await page.screenshot({ path: path.join(OUT, `thumbnail-perfect-${k}.png`) });
    console.log(k);
  }
  await browser.close();
})();
