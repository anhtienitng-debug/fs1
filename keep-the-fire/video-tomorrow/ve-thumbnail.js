// Thumbnail TOMORROW (1280×720), vẽ bằng đúng nhân vật trong phim (scene.js → window.KIT).
// Chạy: node ve-thumbnail.js <thư mục ra>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ART = () => {
  const K = window.KIT, { W, BG, ORANGE, YEL } = K.C;
  const T = 0.35;
  const at = (x, y, k, s) => `<g transform="translate(${x},${y}) scale(${k})">${s}</g>`;
  const big = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" fill="${o.c || W}" font-family="Inter" font-size="${o.size || 110}" font-weight="900" text-anchor="${o.a || 'start'}" stroke="#000" stroke-width="${o.sw || 14}" paint-order="stroke"${o.f ? ` filter="url(#${o.f})"` : ''}>${s}</text>`;
  const wrap = body => `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">${K.DEFS}<rect width="1280" height="720" fill="${BG}"/>${body}<rect width="1280" height="720" filter="url(#grain)" opacity=".5"/><rect width="1280" height="720" fill="url(#vig)"/></svg>`;
  return {
    // A: Spark ôm đàn, mặt buồn; kẻ thù viết "tomorrow" lên tờ lịch sau lưng; một nguồn sáng từ đốm lửa
    A() {
      let s = K.glow(820, 330, 380, 0.45);
      // lịch + kẻ thù (phóng to quanh gốc 0,0)
      const E = K.whisperPose(0, 0, -1); E.lh = [-66, -168]; E.le = [-34, -136];
      s += at(1185, 700, 2.3, K.shadowFig(E));
      s += at(905, 96, 1.75, K.calendar(0, 0, 29, { note: 1, ember: 1 }));
      s += at(680, 960, 3.4, K.playing(0, 0, { flame: 0.12, t: T, mood: 'sad' }).s);
      s += big(36, 150, 'MAYBE', { size: 92 }) + big(36, 256, 'TOMORROW.', { size: 92, c: ORANGE });
      return wrap(s);
    },
    // B: trước/sau — trái: mưa ngoài quán, DAYS LEFT 0 · phải: sân khấu, đèn, lửa bùng; chữ TOMORROW gạch → TODAY.
    B() {
      let s = `<rect width="640" height="720" fill="#0a0c14"/>` + K.rain(T, 0, 640, 0, 720, 0.4);
      s += at(330, 700, 2.4, K.fig(K.stand(0, 0, { look: 8 }), { flame: 0.06, t: T, mood: 'sad' }));
      s += `<svg x="640" y="0" width="640" height="720" viewBox="0 0 640 720"><rect width="640" height="720" fill="#0b0910"/><path d="M240,0 L400,0 L560,720 L80,720Z" fill="#f0d8a8" opacity=".2"/>${K.glow(320, 480, 320, 0.45)}` +
        at(300, 700, 2.4, K.playing(0, 0, { flame: 1.2, t: T, mood: 'happy', strum: 1, hy: 80 }).s) + '</svg>';
      s += `<rect x="636" width="8" height="720" fill="${YEL}"/>`;
      s += big(320, 120, 'TOMORROW', { size: 74, c: '#8d8a84', a: 'middle', sw: 10 }) + `<line x1="140" y1="96" x2="500" y2="96" stroke="#cfc6b8" stroke-width="9" stroke-linecap="round"/>`;
      s += big(960, 100, 'TODAY.', { size: 84, c: YEL, a: 'middle', sw: 12 });
      return wrap(s);
    },
    // C: bước cuối — mặt Spark to, lửa bùng; kẻ thù chắn lối, thân đầy vết nứt vàng; dưới chân "DAY 45"
    C() {
      let s = `<path d="M1280,0 L1280,720 L760,720 L980,0Z" fill="#f0d8a8" opacity=".18"/>` + K.glow(980, 360, 420, 0.4);
      const E = K.whisperPose(0, 0, -1);
      s += at(1060, 820, 3.2, K.shadowFig(E));
      const cr = [[[0, -150], [-14, -120], [6, -96], [-8, -70]], [[18, -60], [4, -30], [22, -6], [10, 24]], [[-30, -186], [-10, -160], [-26, -130], [-6, -110]], [[30, -200], [10, -176], [26, -150]], [[-20, -10], [-4, 14], [-24, 40]]];
      cr.forEach(c => { s += `<polyline points="${c.map(([x, y]) => [1060 + x * 3.2 * 0.8, 820 + (y - 100) * 3.2 * 0.55].join(',')).join(' ')}" fill="none" stroke="${YEL}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" filter="url(#yelGlow)"/>`; });
      const J = K.stand(0, 0, { look: 10 });
      s += at(560, 1130, 3.6, K.fig(J, { flame: 1.25, t: T, mood: 'fierce' }));
      s += big(36, 130, 'NOT', { size: 96, c: YEL, f: 'yelGlow' }) + big(36, 236, 'TOMORROW.', { size: 92 });
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
    await page.screenshot({ path: path.join(OUT, `thumbnail-tomorrow-${k}.png`) });
    console.log(k);
  }
  await browser.close();
})();
