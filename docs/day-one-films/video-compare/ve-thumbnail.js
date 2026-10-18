// Thumbnail COMPARE (1280×720), vẽ bằng đúng nhân vật trong phim (scene.js → window.KIT).
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
  const tapeK = (a, b) => K.tape(a, b);
  return {
    // A: mặt Spark to, buồn, lửa nhỏ; thước dây của kẻ thù nối tới ngọn lửa to của người đang bay
    A() {
      let s = K.glow(980, 260, 380, 0.5);
      s += at(1000, 520, 1.9, K.rider(0, 0, -20, { c: '#b9b5ad', flame: 1.2, t: T, mood: 'happy' }));
      s += at(380, 1130, 3.6, K.fig(K.stand(0, 0, { look: 10 }), { flame: 0.12, t: T, mood: 'sad' }));
      s += at(560, 420, 2.2, K.tape([0, 0], [(1086 - 560) / 2.2, (196 - 420) / 2.2]));
      s += big(36, 130, 'LOOK AT', { size: 96 }) + big(36, 236, 'THEM.', { size: 96, c: ORANGE });
      return wrap(s);
    },
    // B: hai thanh to YOU vs THEM −88%, Spark ngồi ôm ván
    B() {
      let s = K.glow(640, 420, 420, 0.35);
      s += `<text x="60" y="140" fill="#cfcbc2" font-family="${K.MONO}" font-size="44" font-weight="700" stroke="#000" stroke-width="8" paint-order="stroke">YOU</text><rect x="220" y="104" width="${960 * 0.12}" height="40" fill="${ORANGE}"/>`;
      s += `<text x="60" y="220" fill="#8d8a84" font-family="${K.MONO}" font-size="44" font-weight="700" stroke="#000" stroke-width="8" paint-order="stroke">THEM</text><rect x="220" y="184" width="960" height="40" fill="#8d8a84"/>`;
      s += `<text x="1180" y="320" fill="#cfcbc2" font-family="${K.MONO}" font-size="72" font-weight="700" text-anchor="end" stroke="#000" stroke-width="10" paint-order="stroke">−88%</text>`;
      const J = K.sitGround(0, 0); J.lh = [42, -74]; J.le = [22, -92];
      s += at(760, 690, 2.4, `<g transform="rotate(-70 36 -60)">${K.skateboard(36, -64)}</g>` + K.fig(J, { flame: 0.1, t: T, mood: 'sad' }));
      s += big(36, 600, 'SO FAR', { size: 80 }) + big(36, 690, 'BEHIND?', { size: 80, c: ORANGE });
      return wrap(s);
    },
    // C: khung cửa với cột vạch vàng, Spark tự hào — lộ kết, để dự phòng
    C() {
      let s = K.glow(700, 360, 420, 0.4);
      s += at(-560, -360, 1.8, K.doorFrame(560, { kids: 1, lit: true, days: [[1, 446], [5, 432], [12, 418], [20, 404], [30, 390], [45, 376]] }));
      const J = K.stand(0, 0, { look: -10 }); J.face = -1; J.flameDir = 1;
      s += at(1000, 1150, 3.4, K.fig(J, { flame: 1.1, t: T, mood: 'happy' }));
      s += big(36, 130, 'BEAT', { size: 96 }) + big(36, 236, 'YESTERDAY.', { size: 96, c: YEL, f: 'yelGlow' });
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
    await page.screenshot({ path: path.join(OUT, `thumbnail-compare-${k}.png`) });
    console.log(k);
  }
  await browser.close();
})();
