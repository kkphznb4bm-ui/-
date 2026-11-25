// Рендер кадров мультфильма. Использование:
//   node render.js frames <outdir> [fps]      — все кадры PNG в stdout-пайп (ffmpeg)
//   node render.js stills <outdir> t1 t2 ...  — отдельные кадры для проверки
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const [mode, out, ...rest] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(__dirname, '../cartoon.html') + '?render');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.fonts.load('900 40px "Noto Sans"'));
  const grab = async t => {
    const data = await page.evaluate(t => { renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }, t);
    return Buffer.from(data.split(',')[1], 'base64');
  };
  fs.mkdirSync(out, { recursive: true });
  if (mode === 'stills') {
    for (const t of rest) fs.writeFileSync(path.join(out, `t_${t}.png`), await grab(parseFloat(t)));
  } else {
    const fps = parseInt(rest[0] || '30');
    const dur = await page.evaluate(() => DURATION);
    const n = Math.round(dur * fps);
    for (let i = 0; i < n; i++) {
      fs.writeFileSync(path.join(out, `f_${String(i).padStart(5, '0')}.png`), await grab(i / fps));
      if (i % 100 === 0) console.error(`frame ${i}/${n}`);
    }
  }
  await browser.close();
})();
