// Thumbnail SNOOZE (1280×720), vẽ bằng đúng nhân vật trong phim (scene.js → window.KIT).
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
  return {
    // A: Spark nằm ngái ngủ, ngón tay trên nút báo lại; ông nội ngoài cửa sổ giơ hai cần câu, trên đầu ông số 35
    A() {
      let s = `<rect x="820" y="80" width="360" height="300" fill="#1a2240" stroke="#6b6760" stroke-width="8"/>` + K.glow(1000, 330, 260, 0.4);
      const G = K.bentPose(1000, 560, -1); G.lh = [940, 250]; G.le = [960, 300]; G.rh = [1080, 250]; G.re = [1050, 300];
      s += `<svg x="820" y="80" width="360" height="300" overflow="hidden"><g transform="translate(-820,-80) translate(1000,560) scale(1.6) translate(-1000,-560)">` + K.gpa(G, { mood: 'sad' }) + `<line x1="940" y1="250" x2="925" y2="170" stroke="#6a5038" stroke-width="3"/><line x1="1080" y1="250" x2="1095" y2="170" stroke="#6a5038" stroke-width="3"/></g></svg>`;
      s += at(330, 640, 3.0, K.alarm(0, 0, 1, 0.3));
      // nằm đắp chăn, gối dưới đầu; một tay thò ra khỏi chăn với về phía đồng hồ đang reo
      const J = K.lieBed(0, 0); J.lh = [J.hip[0] - 30, J.hip[1] - 6]; J.le = [J.hip[0] - 50, J.hip[1] - 16]; J.rh = [J.hip[0] - 20, J.hip[1] - 4]; J.re = [J.hip[0] - 40, J.hip[1] - 14];
      s += at(900, 600, 2.6, `<ellipse cx="-128" cy="-12" rx="46" ry="14" fill="#e6dccd" stroke="#b9ab98" stroke-width="1.5"/>` + K.fig(J, { flame: 0.1, t: T, mood: 'drowsy' }) +
        `<path d="M-74,-22 Q40,-70 170,-14 L170,8 L-74,8Z" fill="#4a5a7a" stroke="#2a3448" stroke-width="2"/>` +
        // tay duỗi dọc gối, dưới cằm, chạm tới đồng hồ
        `<path d="M-60,0 Q-120,16 -186,-10" fill="none" stroke="#9a846b" stroke-width="15" stroke-linecap="round"/><path d="M-60,0 Q-120,16 -186,-10" fill="none" stroke="#e9d6bd" stroke-width="12" stroke-linecap="round"/>` +
        `<path d="M-74,-22 Q-40,-36 0,-34 L0,8 L-74,8Z" fill="#4a5a7a"/>` +
        `<circle cx="-188" cy="-11" r="7.5" fill="#e9d6bd" stroke="#9a846b" stroke-width="2"/>`);
      // số ngày còn lại trên đầu ông
      s += `<text x="1000" y="62" fill="#f4efe4" font-family="${K.MONO}" font-size="46" font-weight="800" text-anchor="middle" stroke="#000" stroke-width="8" paint-order="stroke">35</text>`;
      s += big(36, 130, 'FIVE MORE', { size: 88 }) + big(36, 230, 'MINUTES.', { size: 88, c: ORANGE });
      return wrap(s);
    },
    // B: lọ "MISSED" đầy những mặt trời nhỏ bị nhốt
    B() {
      let s = K.glow(640, 380, 420, 0.4);
      s += at(640, 640, 5.2, K.jar(0, 0, 21, 0.4));
      s += big(36, 130, 'MISSED', { size: 92 }) + big(36, 236, '21 SUNRISES.', { size: 72, c: ORANGE });
      return wrap(s);
    },
    // C: hai ông cháu ngồi câu lúc bình minh — lộ kết, để dự phòng
    C() {
      let s = `<svg x="0" y="0" width="1280" height="720" viewBox="-130 160 960 540">${K.pier(0.4, { rise: 0.8 })}${K.foldChair(470, 548)}${K.foldChair(640, 548)}` +
        (() => { const G = K.sitChair(640, 548, { look: 8 }); G.rh = [700, 470]; G.re = [680, 486]; G.lh = [692, 474]; const J = K.sitChair(470, 548, { look: 8 }); J.rh = [530, 470]; J.re = [510, 486]; J.lh = [522, 474]; return K.gpa(G, { mood: 'happy' }) + K.rod([700, 470], [840, 400], 620) + K.fig(J, { flame: 1.1, t: T, mood: 'happy' }) + K.rod([530, 470], [700, 410], 610); })() + '</svg>';
      s += big(48, 250, 'WAKE UP', { size: 84 }) + big(48, 345, 'FOR THEM.', { size: 84, c: YEL, f: 'yelGlow' });
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
    await page.screenshot({ path: path.join(OUT, `thumbnail-snooze-${k}.png`) });
    console.log(k);
  }
  await browser.close();
})();
