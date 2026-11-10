// Renders animation.html frame by frame with Playwright, then muxes with the voiceover.
// Usage: node render.mjs [--still t1,t2,...]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(dir, 'animation.html');
const out = path.join(dir, 'out');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const open = async () => {
  const p = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto(url);
  await p.evaluate(() => document.fonts.ready);
  return p;
};

const stillArg = process.argv.indexOf('--still');
if (stillArg > 0) {
  const p = await open();
  for (const t of process.argv[stillArg + 1].split(',').map(Number)) {
    await p.evaluate(t => window.renderAt(t), t);
    await p.screenshot({ path: path.join(out, `still-${t.toFixed(1)}.jpg`), type: 'jpeg', quality: 80 });
  }
  await browser.close();
  process.exit(0);
}

const first = await open();
const { fps, duration } = await first.evaluate(() => window.TIMING);
await first.close();
const total = Math.round(fps * duration);
const frames = path.join(out, 'frames');
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

const WORKERS = 4;
let next = 0;
await Promise.all(Array.from({ length: WORKERS }, async () => {
  const p = await open();
  for (;;) {
    const i = next++;
    if (i >= total) break;
    await p.evaluate(t => window.renderAt(t), i / fps);
    await p.screenshot({ path: path.join(frames, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 });
    if (i % 150 === 0) console.log(`frame ${i}/${total}`);
  }
}));
await browser.close();

const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
  '-framerate', String(fps), '-i', path.join(frames, 'f%05d.jpg'),
  '-i', path.join(dir, 'audio', 'voice.mp3'),
  '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11,apad', '-t', String(duration),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
  path.join(dir, 'baghdad-battery.mp4')], { stdio: 'inherit' });
ff.on('exit', code => { rmSync(frames, { recursive: true, force: true }); process.exit(code); });
