// Xuất khung hình của scene.js.
//   node render.js stills <thư mục> t1 t2 ...      → ảnh PNG tại các thời điểm
//   node render.js video <file.mp4> <từ giây> <đến giây> [fps]  → đoạn video (không tiếng)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const [mode, out, ...rest] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.setContent('<html><body style="margin:0;background:#0b0b0c"><div id="v"></div></body></html>');
  await page.addScriptTag({ path: path.join(__dirname, 'scene.js') });
  const draw = t => page.evaluate(t => { document.getElementById('v').innerHTML = window.frame(t); }, t);

  if (mode === 'stills') {
    for (const t of rest.map(Number)) {
      await draw(t);
      await page.screenshot({ path: path.join(out, `t${String(t).padStart(6, '0')}.png`) });
    }
  } else {
    const [a, b, fps = 24] = rest.map(Number);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n0 = Math.round(a * fps), n1 = Math.round(b * fps);
    for (let n = n0; n < n1; n++) {
      await draw(n / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
