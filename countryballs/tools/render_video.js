// Рендерит HTML-скетч покадрово (30 fps, 720x1280) и собирает MP4 со звуком.
// Запуск: node tools/render_video.js <page.html> <audio> <out.mp4>
//   node tools/render_video.js skit.html skit-audio.wav uchitel-vyshel.mp4
//   node tools/render_video.js jeepney.html jeepney-audio.m4a jeepney-transformer.mp4
// Звук готовится заранее: tools/make_audio.py (skit) или tools/jeepney_audio.py + сведение с голосом (см. README).
const {chromium}=require('playwright'); const {execFileSync}=require('child_process');
const fs=require('fs'), path=require('path'), os=require('os');
(async()=>{
  const root=path.resolve(__dirname,'..'), FPS=30;
  const [page='skit.html', audio='skit-audio.wav', out='uchitel-vyshel.mp4']=process.argv.slice(2);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'frames-'));
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:360,height:640},deviceScaleFactor:2});
  p.on('pageerror',e=>{console.error(e);process.exit(1)});
  await p.goto('file://'+path.join(root,page)+'?render');
  const DUR=await p.evaluate(()=>DUR); const svg=await p.$('#v');
  const N=Math.round(DUR*FPS);
  for(let f=0;f<N;f++){
    await p.evaluate(t=>draw(t),f/FPS);
    await svg.screenshot({path:path.join(dir,String(f).padStart(4,'0')+'.png')});
  }
  await b.close();
  execFileSync('ffmpeg',['-loglevel','error','-y','-framerate',String(FPS),'-i',path.join(dir,'%04d.png'),'-i',path.join(root,audio),
    '-c:v','libx264','-preset','slow','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',path.join(root,out)]);
  fs.rmSync(dir,{recursive:true}); console.log('готово:',out);
})();
