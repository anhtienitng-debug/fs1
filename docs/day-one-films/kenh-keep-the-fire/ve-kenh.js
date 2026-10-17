// Ảnh nhận diện kênh Keep The Fire, vẽ bằng đúng bộ nhân vật của phim (video-scroll/scene.js → window.KIT).
// Chạy: node ve-kenh.js <thư mục ra>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// phần chạy trong trình duyệt: mỗi hàm trả về { w, h, svg }
const ART = () => {
  const K = window.KIT, { W, BG, MUTED, ORANGE, CORE, RED, YEL } = K.C;
  const T = 0.35; // thời điểm cố định cho lửa lay
  const svg = (w, h, vb, body, bg = BG) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}">${K.DEFS}${bg ? `<rect x="-5000" y="-5000" width="10000" height="10000" fill="${bg}"/>` : ''}${body}</svg>`;
  const grain = (w, h) => `<rect width="${w}" height="${h}" filter="url(#grain)" opacity=".5"/>`;
  const vig = (w, h) => `<rect width="${w}" height="${h}" fill="url(#vig)"/>`;
  const big = (x, y, s, o = {}) =>
    `<text x="${x}" y="${y}" fill="${o.c || W}" font-family="Inter" font-size="${o.size || 100}" font-weight="${o.w || 900}" letter-spacing="${o.ls || 0}" text-anchor="${o.a || 'middle'}"${o.f ? ` filter="url(#${o.f})"` : ''}${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 8}" paint-order="stroke"` : ''}>${s}</text>`;
  // nhóm phóng to quanh điểm (x,y)
  const at = (x, y, k, s) => `<g transform="translate(${x},${y}) scale(${k})">${s}</g>`;
  // bầu trời bình minh trên biển (như cảnh kết phim)
  function dawn(w, h, horizon, sunX) {
    return `<defs><linearGradient id="skyB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#110f1f"/><stop offset=".5" stop-color="#4a2c3c"/><stop offset=".85" stop-color="#c8703e"/><stop offset="1" stop-color="#f2b26a"/></linearGradient>` +
      `<linearGradient id="seaB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4050"/><stop offset="1" stop-color="#14121f"/></linearGradient></defs>` +
      `<rect width="${w}" height="${horizon}" fill="url(#skyB)"/>` + K.glow(sunX, horizon, w * 0.3, 0.55) +
      `<circle cx="${sunX}" cy="${horizon - 10}" r="${w * 0.03}" fill="#ffd9a0"/>` +
      `<rect y="${horizon}" width="${w}" height="${h - horizon}" fill="url(#seaB)"/>` +
      Array.from({ length: 10 }, (_, i) => { const ww = w * (0.06 - i * 0.005); return `<rect x="${sunX - ww / 2}" y="${horizon + 8 + i * h * 0.012}" width="${ww}" height="${h * 0.004}" rx="2" fill="#ffd9a0" opacity="${0.75 - i * 0.07}"/>`; }).join('');
  }

  return {
    // 1. Ảnh đại diện 800×800: chỉ ngọn lửa — nhỏ cỡ 98 px vẫn nhận ra
    avatar() {
      let s = K.glow(400, 430, 420, 0.75) + `<circle cx="400" cy="400" r="330" fill="none" stroke="${YEL}" stroke-width="10" opacity=".9" filter="url(#yelGlow)"/>`;
      s += at(400, 0, 1, K.flame(0, 640, 4.4, T));
      return { w: 800, h: 800, svg: svg(800, 800, '0 0 800 800', s + vig(800, 800)) };
    },
    // 2. Watermark 150×150 nền trong suốt
    watermark() {
      return { w: 150, h: 150, transparent: true, svg: svg(150, 150, '0 0 150 150', `<circle cx="75" cy="75" r="68" fill="${BG}" opacity=".55"/>` + K.flame(75, 128, 0.95, T), null) };
    },
    // 3. Banner 2560×1440. Vùng an toàn mọi thiết bị: 1546×423 ở giữa (x 507–2053, y 508–931)
    banner() {
      const w = 2560, h = 1440, hz = 760;
      let s = dawn(w, h, hz, 1280);
      // đồi cỏ phía trước
      s += `<path d="M0,960 Q700,820 1280,860 Q1900,900 2560,820 L2560,1440 L0,1440Z" fill="#1f2a1a"/><path d="M0,960 Q700,820 1280,860 Q1900,900 2560,820" fill="none" stroke="#3e5230" stroke-width="5"/>`;
      // Spark (trái) — lửa to; cái bóng (phải) — mờ, lùi xa
      s += at(600, 930, 1.9, K.fig(K.stand(0, 0, { look: 8 }), { flame: 1.0, t: T, mood: 'happy' }));
      s += `<g opacity=".55">` + at(1990, 930, 1.6, K.shadowFig(K.whisperPose(0, 0, -1))) + '</g>';
      s += big(1300, 690, 'KEEP THE FIRE', { size: 112, ls: 8, c: YEL, f: 'yelGlow' });
      s += big(1300, 760, 'wordless animated films about the war inside you', { size: 36, w: 500, c: '#eee4d6', ls: 2 });
      s += big(1300, 820, 'NEW FILM EVERY WEEK', { size: 28, w: 700, c: ORANGE, ls: 10 });
      return { w, h, svg: svg(w, h, `0 0 ${w} ${h}`, s + grain(w, h) + vig(w, h)) };
    },
    // 4a. Thumbnail SCROLL — cái bóng thì thầm sau lưng Spark đang cắm mặt vào điện thoại
    thumbA() {
      let s = K.glow(820, 330, 420, 0.5, 'gC');
      s += at(1090, 690, 2.4, K.shadowFig(K.whisperPose(0, 0, -1)));
      const J = K.standPhone(0, 0);
      s += at(700, 700, 2.7, K.fig(J, { flame: 0.07, t: T, mood: 'tired' }) + K.phone(J.lh[0] + 6, J.lh[1] - 8, 12, 1, 1));
      s += big(40, 250, 'IT STOLE', { a: 'start', size: 120, stroke: '#000', sw: 14 });
      s += big(40, 380, 'MY FIRE', { a: 'start', size: 120, c: ORANGE, stroke: '#000', sw: 14 });
      s += `<text x="44" y="450" fill="${ORANGE}" font-family="${K.MONO}" font-size="40" font-weight="700" stroke="#000" stroke-width="8" paint-order="stroke">FIRE 1%</text>`;
      return { w: 1280, h: 720, svg: svg(1920, 1080, '0 0 1280 720', s + grain(1280, 720) + vig(1280, 720)) };
    },
    // 4b. Thumbnail SCROLL — trước/sau: lửa tắt bên điện thoại · lửa bùng ở biển bình minh
    thumbB() {
      let s = `<rect width="640" height="720" fill="#0b0d12"/>` + K.glow(330, 330, 300, 0.45, 'gC');
      const J = K.standPhone(0, 0);
      s += at(300, 690, 2.4, K.fig(J, { flame: 0.07, t: T, mood: 'tired' }) + K.phone(J.lh[0] + 6, J.lh[1] - 8, 12, 1, 1));
      s += `<svg x="640" y="0" width="640" height="720" viewBox="0 0 640 720">${dawn(640, 720, 470, 420)}<path d="M0,640 Q300,580 640,610 L640,720 L0,720Z" fill="#1f2a1a"/>` +
        at(300, 690, 2.4, K.fig(K.armsUp(0, 0), { flame: 1.25, t: T, mood: 'happy' })) + '</svg>';
      s += `<rect x="636" width="8" height="720" fill="${YEL}"/>`;
      s += big(320, 110, 'DAY 201', { size: 72, c: '#9aa3b2', stroke: '#000', sw: 10 });
      s += big(960, 110, 'DAY 60', { size: 72, c: YEL, stroke: '#000', sw: 10 });
      return { w: 1280, h: 720, svg: svg(1920, 1080, '0 0 1280 720', s + grain(1280, 720) + vig(1280, 720)) };
    },
    // 5. Nền màn hình kết thúc 20 s (1920×1080). guide = vẽ khung vị trí đặt phần tử YouTube
    endScreen(guide = false, t = T) {
      let s = dawn(1280, 720, 470, 900);
      s += `<path d="M-10,640 Q500,560 1290,620 L1290,730 L-10,730Z" fill="#1f2a1a"/>`;
      s += at(640, 640, 1.0, K.fig(K.sitGround(-40, 0), { flame: 1.0, t, mood: 'happy', blink: (t % 4) < 0.12 }));
      s += big(640, 110, 'Keep the fire.', { size: 46, w: 800, c: YEL, f: 'yelGlow' });
      if (guide) {
        const box = (x, y, w, h, l) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="12 8"/>` + big(x + w / 2, y + h / 2 + 10, l, { size: 24, w: 600 });
        s += box(120, 180, 400, 225, 'VIDEO: Best for viewer') + box(760, 180, 400, 225, 'VIDEO: Most recent') + `<circle cx="640" cy="320" r="70" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="12 8"/>` + big(640, 330, 'SUBSCRIBE', { size: 20, w: 700 });
      }
      return { w: 1920, h: 1080, svg: svg(1920, 1080, '0 0 1280 720', s + grain(1280, 720) + vig(1280, 720)) };
    },
  };
};

(async () => {
  const OUT = process.argv[2];
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<html><body style="margin:0;background:transparent"><div id="v"></div></body></html>');
  await page.addScriptTag({ path: path.join(__dirname, '../video-scroll/scene.js') });
  await page.addScriptTag({ content: `window.ART = (${ART.toString()})();` });
  const jobs = [['avatar', 'avatar-800.png'], ['watermark', 'watermark-150.png'], ['banner', 'banner-2560x1440.png'],
    ['thumbA', 'thumbnail-scroll-A.png'], ['thumbB', 'thumbnail-scroll-B.png'], ['endScreen', 'end-screen-nen.png', false], ['endScreen', 'end-screen-vi-tri.png', true]];
  for (const [fn, file, arg] of jobs) {
    const a = await page.evaluate(([fn, arg]) => { const a = window.ART[fn](arg); document.getElementById('v').innerHTML = a.svg; return { w: a.w, h: a.h, tr: !!a.transparent }; }, [fn, arg]);
    await page.setViewportSize({ width: a.w, height: a.h });
    // ảnh 1280×720 (thumbnail) vẽ ở 1920×1080 rồi thu nhỏ bằng thuộc tính svg
    await page.evaluate(([w, h]) => { const s = document.querySelector('svg'); s.setAttribute('width', w); s.setAttribute('height', h); }, [a.w, a.h]);
    await page.screenshot({ path: path.join(OUT, file), omitBackground: a.tr, clip: { x: 0, y: 0, width: a.w, height: a.h } });
    console.log(file);
  }
  // khung hình cho video màn hình kết thúc 20 s (lửa lay, nháy mắt) → ffmpeg ghép
  if (process.argv[3] === 'endvideo') {
    const dir = path.join(OUT, 'end-frames');
    fs.mkdirSync(dir, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    for (let i = 0; i < 20 * 24; i++) {
      await page.evaluate(t => { document.getElementById('v').innerHTML = window.ART.endScreen(false, t).svg; }, i / 24);
      await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
    }
    console.log('end-frames');
  }
  await browser.close();
})();
