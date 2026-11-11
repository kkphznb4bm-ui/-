// Рендерит skit.html покадрово (30 fps, 720x1280) и собирает MP4 со звуком.
// Запуск: node tools/render_video.js  (нужны playwright и ffmpeg)
const {chromium}=require('playwright'); const {execSync}=require('child_process');
const fs=require('fs'), path=require('path'), os=require('os');
(async()=>{
  const root=path.resolve(__dirname,'..'), FPS=30;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'frames-'));
  const b=await chromium.launch(); const p=await b.newPage({viewport:{width:360,height:640},deviceScaleFactor:2});
  await p.goto('file://'+root+'/skit.html?render');
  const DUR=await p.evaluate(()=>DUR); const svg=await p.$('#v');
  for(let f=0;f<DUR*FPS;f++){
    await p.evaluate(t=>draw(t),f/FPS);
    await svg.screenshot({path:path.join(dir,String(f).padStart(4,'0')+'.png')});
  }
  await b.close();
  execSync(`python3 ${root}/tools/make_audio.py ${root}/skit-audio.wav`);
  execSync(`ffmpeg -loglevel error -y -framerate ${FPS} -i ${dir}/%04d.png -i ${root}/skit-audio.wav -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -shortest -movflags +faststart ${root}/uchitel-vyshel.mp4`);
  fs.rmSync(dir,{recursive:true}); console.log('готово: uchitel-vyshel.mp4');
})();
