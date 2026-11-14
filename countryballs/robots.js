/* Роботы-трансформеры: детали с позами car (машина) и bot (робот): [x,y,rot,sx,sy], t=[начало,конец] доли трансформации */
function JEEPNEY_PARTS(){return [
  {id:'legL',svg:`<rect x="-14" y="-60" width="28" height="120" rx="6" fill="#9aa4ae" stroke="#111" stroke-width="3"/><rect x="-14" y="-10" width="28" height="12" fill="#e63946"/>`,car:[-40,-30,0,0,0],bot:[-34,-78,0,1,1],t:[.25,.65]},
  {id:'legR',svg:`<rect x="-14" y="-60" width="28" height="120" rx="6" fill="#9aa4ae" stroke="#111" stroke-width="3"/><rect x="-14" y="-10" width="28" height="12" fill="#e63946"/>`,car:[40,-30,0,0,0],bot:[34,-78,0,1,1],t:[.25,.65]},
  {id:'armL',svg:`<rect x="-12" y="-58" width="24" height="116" rx="8" fill="#9aa4ae" stroke="#111" stroke-width="3"/><rect x="-12" y="-20" width="24" height="10" fill="#1c7ed6"/><circle cy="62" r="15" fill="#d9dde3" stroke="#111" stroke-width="3"/>`,car:[0,-50,0,0,0],bot:[-78,-205,18,1,1],t:[.45,.85]},
  {id:'armR',svg:`<rect x="-12" y="-58" width="24" height="116" rx="8" fill="#9aa4ae" stroke="#111" stroke-width="3"/><rect x="-12" y="-20" width="24" height="10" fill="#1c7ed6"/><circle cy="62" r="15" fill="#d9dde3" stroke="#111" stroke-width="3"/><g class="bigmic" opacity="0" transform="translate(0,62)"><rect x="-7" y="-4" width="14" height="46" rx="4" fill="#333" stroke="#111" stroke-width="2"/><circle cy="-14" r="17" fill="#c9ced6" stroke="#111" stroke-width="3"/><path d="M-12,-20 h24 M-14,-12 h28 M-12,-4 h24" stroke="#777" stroke-width="2"/></g>`,car:[0,-50,0,0,0],bot:[78,-205,-18,1,1],t:[.45,.85]},
  {id:'body',svg:`<rect x="-120" y="-36" width="240" height="72" rx="10" fill="url(#chrome)" stroke="#111" stroke-width="3"/>
     <rect x="-120" y="8" width="240" height="8" fill="#e63946"/><rect x="-120" y="16" width="240" height="6" fill="#ffd43b"/><rect x="-120" y="22" width="240" height="6" fill="#1c7ed6"/>
     ${[...Array(7)].map((_,i)=>`<rect x="${-108+i*32}" y="-28" width="24" height="26" rx="3" fill="#264b7a" stroke="#111" stroke-width="2"/>`).join('')}
     <path d="M-100,-2 q20,-8 40,0 t40,0 t40,0 t40,0 t40,0" stroke="#e63946" stroke-width="3" fill="none"/>`,car:[0,-60,0,1,1],bot:[0,-205,90,.55,1.25],t:[.1,.6]},
  {id:'roof',svg:`<rect x="-122" y="-7" width="244" height="14" rx="5" fill="#e63946" stroke="#111" stroke-width="3"/>${[...Array(9)].map((_,i)=>`<circle cx="${-100+i*25}" cy="0" r="3" fill="#ffd43b"/>`).join('')}`,car:[-4,-100,0,1,1],bot:[0,-272,0,.62,1.5],t:[.2,.7]},
  {id:'sign',svg:`<rect x="-46" y="-11" width="92" height="22" rx="4" fill="#ffd43b" stroke="#111" stroke-width="2.5"/><text x="0" y="6" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="13" fill="#c92a2a">PINOY 🇵🇭</text>`,car:[-70,-118,0,1,1],bot:[0,-218,0,.9,.9],t:[.5,.9]},
  {id:'hood',svg:`<rect x="-26" y="-26" width="52" height="52" rx="8" fill="url(#chrome)" stroke="#111" stroke-width="3"/>
     <circle class="lamp" cx="-13" cy="-8" r="8" fill="#fff59d" stroke="#111" stroke-width="2.5"/><circle class="lamp" cx="13" cy="-8" r="8" fill="#fff59d" stroke="#111" stroke-width="2.5"/>
     <rect x="-16" y="6" width="32" height="12" rx="2" fill="#555" stroke="#111" stroke-width="2"/><path d="M-12,9v6M-6,9v6M0,9v6M6,9v6M12,9v6" stroke="#ccc" stroke-width="1.5"/>
     <path d="M0,-26 l-6,-14 l10,-4 l3,6 z" fill="#d9dde3" stroke="#111" stroke-width="2"/>`,car:[-142,-46,0,1,1],bot:[0,-312,0,1.15,1.15],t:[.35,.8]},
  {id:'wheelB',svg:`<circle r="21" fill="#222" stroke="#111" stroke-width="3"/><circle r="9" fill="#ccc"/><path d="M0,-9V9M-9,0H9" stroke="#888" stroke-width="2"/>`,car:[80,-21,0,1,1],bot:[34,-14,0,1.15,1.15],t:[.15,.55],spin:true},
  {id:'wheelF',svg:`<circle r="21" fill="#222" stroke="#111" stroke-width="3"/><circle r="9" fill="#ccc"/><path d="M0,-9V9M-9,0H9" stroke="#888" stroke-width="2"/>`,car:[-92,-21,0,1,1],bot:[-34,-14,0,1.15,1.15],t:[.15,.55],spin:true},
];}

// собрать робота в <g parent>; вернуть {g, parts}
function buildRobot(parent,parts){const root=document.createElementNS(NS,'g');parent.appendChild(root);
  parts.forEach(p=>{const g=document.createElementNS(NS,'g');g.innerHTML=p.svg;root.appendChild(g);p.g=g});return {g:root,parts};}

// Монстр-трак Америки -> USA-бот (те же «кости», другой корпус)
function TRUCK_PARTS(){
  const star=(x,y,r)=>{let p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;p.push((x+rr*Math.cos(a)).toFixed(1)+','+(y+rr*Math.sin(a)).toFixed(1))}return `<polygon points="${p.join(' ')}" fill="#fff"/>`};
  const leg=`<rect x="-15" y="-60" width="30" height="120" rx="6" fill="#3C3B6E" stroke="#111" stroke-width="3"/>${star(0,-20,8)}${star(0,10,8)}`;
  const arm=`<rect x="-13" y="-58" width="26" height="116" rx="8" fill="#B22234" stroke="#111" stroke-width="3"/><rect x="-13" y="-30" width="26" height="8" fill="#fff"/><rect x="-13" y="-10" width="26" height="8" fill="#fff"/><rect x="-18" y="56" width="36" height="22" rx="6" fill="#d9dde3" stroke="#111" stroke-width="3"/>`;
  const wheel=`<circle r="30" fill="#222" stroke="#111" stroke-width="3"/><circle r="27" fill="none" stroke="#444" stroke-width="5" stroke-dasharray="6 5"/><circle r="12" fill="#ffd43b" stroke="#111" stroke-width="2"/>${star(0,0,8)}`;
  return [
    {id:'legL',svg:leg,car:[-40,-40,0,0,0],bot:[-34,-88,0,1,1],t:[.25,.65]},
    {id:'legR',svg:leg,car:[40,-40,0,0,0],bot:[34,-88,0,1,1],t:[.25,.65]},
    {id:'armL',svg:arm,car:[0,-60,0,0,0],bot:[-80,-215,18,1,1],t:[.45,.85]},
    {id:'armR',svg:arm,car:[0,-60,0,0,0],bot:[80,-215,-18,1,1],t:[.45,.85]},
    {id:'body',svg:`<rect x="-110" y="-34" width="220" height="68" rx="12" fill="#B22234" stroke="#111" stroke-width="3"/>
       <rect x="-110" y="-4" width="220" height="9" fill="#fff"/><rect x="-110" y="14" width="220" height="9" fill="#fff"/>
       <rect x="-30" y="-26" width="70" height="24" rx="4" fill="#3C3B6E" stroke="#111" stroke-width="2"/>${star(-14,-14,7)}${star(6,-14,7)}${star(26,-14,7)}
       <rect x="-100" y="-26" width="56" height="22" rx="4" fill="#9fd3ff" stroke="#111" stroke-width="2"/>`,car:[0,-90,0,1,1],bot:[0,-215,90,.6,1.3],t:[.1,.6]},
    {id:'roof',svg:`<rect x="-80" y="-7" width="160" height="14" rx="5" fill="#222" stroke="#111" stroke-width="3"/>${[...Array(6)].map((_,i)=>`<circle cx="${-62+i*25}" cy="0" r="5" fill="#ffd43b" stroke="#111" stroke-width="1.5"/>`).join('')}`,car:[-50,-132,0,1,1],bot:[0,-282,0,.95,1.5],t:[.2,.7]},
    {id:'sign',svg:`<rect x="-40" y="-12" width="80" height="24" rx="4" fill="#fff" stroke="#111" stroke-width="2.5"/><text x="0" y="6" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="15" fill="#B22234">USA ★</text>`,car:[50,-100,0,1,1],bot:[0,-228,0,.95,.95],t:[.5,.9]},
    {id:'hood',svg:`<rect x="-27" y="-27" width="54" height="54" rx="6" fill="#d9dde3" stroke="#111" stroke-width="3"/>
       <rect class="lamp" x="-21" y="-17" width="16" height="11" rx="3" fill="#fff59d" stroke="#111" stroke-width="2.5"/><rect class="lamp" x="5" y="-17" width="16" height="11" rx="3" fill="#fff59d" stroke="#111" stroke-width="2.5"/>
       <path d="M-20,4 H20 M-20,10 H20 M-20,16 H20" stroke="#555" stroke-width="3"/><path d="M-30,-27 V27 M30,-27 V27" stroke="#111" stroke-width="5"/>`,car:[-130,-75,0,1,1],bot:[0,-322,0,1.15,1.15],t:[.35,.8]},
    {id:'wheelB',svg:wheel,car:[72,-30,0,1,1],bot:[36,-16,0,.9,.9],t:[.15,.55],spin:true},
    {id:'wheelF',svg:wheel,car:[-78,-30,0,1,1],bot:[-36,-16,0,.9,.9],t:[.15,.55],spin:true},
  ];
}

// поставить робота: k = прогресс трансформации 0..1, wheelSpin = угол колёс в режиме машины, life(p) -> {rot,dx,dy} поправки ожившего робота
function poseRobot(R,{x,y,s=1,rot=0,k=0,wheelSpin=0,flip=false,life}){
  R.g.setAttribute('transform',`translate(${x},${y}) rotate(${rot}) scale(${flip?-s:s},${s})`);
  R.parts.forEach(p=>{
    const kk=ease(seg(k,p.t[0],p.t[1]));
    const v=p.car.map((c,i)=>lerp(c,p.bot[i],kk));
    let r=v[2]+Math.sin(kk*Math.PI)*180, sx=v[3], sy=v[4], dx=0, dy=-Math.sin(kk*Math.PI)*60;
    if(/^(leg|arm)/.test(p.id)){sx=sy=kk;r=v[2]}
    if(p.spin&&k===0) r+=wheelSpin;
    if(k>=1&&life){const o=life(p.id)||{};r=o.rot??r;dx=o.dx||0;dy=o.dy||0}
    p.g.setAttribute('transform',`translate(${v[0]+dx},${v[1]+dy}) rotate(${r}) scale(${sx},${sy})`);
  });
}

// Снегоуборщик России -> Russia-бот (оранжевый КамАЗ-стиль с отвалом и триколором)
function SNOWTRUCK_PARTS(){
  const tri=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h/3}" fill="#fff"/><rect x="${x}" y="${y+h/3}" width="${w}" height="${h/3}" fill="#0039A6"/><rect x="${x}" y="${y+2*h/3}" width="${w}" height="${h/3}" fill="#D52B1E"/>`;
  const leg=`<rect x="-16" y="-60" width="32" height="120" rx="6" fill="#ff8c1a" stroke="#111" stroke-width="3"/>${tri(-16,-30,32,24)}`;
  const arm=`<rect x="-13" y="-58" width="26" height="116" rx="8" fill="#ff8c1a" stroke="#111" stroke-width="3"/><rect x="-13" y="-20" width="26" height="10" fill="#333"/><circle cy="62" r="16" fill="#d9dde3" stroke="#111" stroke-width="3"/>`;
  const wheel=`<circle r="25" fill="#222" stroke="#111" stroke-width="3"/><circle r="10" fill="#ff8c1a" stroke="#111" stroke-width="2"/><path d="M0,-20V20M-20,0H20" stroke="#555" stroke-width="3"/>`;
  return [
    {id:'legL',svg:leg,car:[-40,-30,0,0,0],bot:[-34,-80,0,1,1],t:[.25,.65]},
    {id:'legR',svg:leg,car:[40,-30,0,0,0],bot:[34,-80,0,1,1],t:[.25,.65]},
    {id:'armL',svg:arm,car:[0,-60,0,0,0],bot:[-80,-210,18,1,1],t:[.45,.85]},
    {id:'armR',svg:arm+`<g class="hats" opacity="0" transform="translate(0,70)"><g transform="scale(.9)"><path d="M-30,0 Q-30,-28 0,-30 Q30,-28 30,0Z" fill="#333" stroke="#111" stroke-width="3"/><rect x="-32" y="-8" width="64" height="12" rx="6" fill="#222"/></g></g>`,car:[0,-60,0,0,0],bot:[80,-210,-18,1,1],t:[.45,.85]},
    {id:'body',svg:`<rect x="-115" y="-36" width="230" height="72" rx="8" fill="#ff8c1a" stroke="#111" stroke-width="3"/>${tri(-115,-8,230,30)}
       <rect x="20" y="-30" width="85" height="20" rx="3" fill="#ffd8a8" stroke="#111" stroke-width="2"/><text x="62" y="-15" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="12" fill="#c92a2a">СНЕГ</text>`,car:[0,-62,0,1,1],bot:[0,-208,90,.55,1.3],t:[.1,.6]},
    {id:'roof',svg:`<rect x="-70" y="-7" width="140" height="14" rx="5" fill="#333" stroke="#111" stroke-width="3"/><circle cx="-50" cy="-8" r="7" fill="#ffa94d" stroke="#111" stroke-width="2"/><circle cx="50" cy="-8" r="7" fill="#ffa94d" stroke="#111" stroke-width="2"/>`,car:[-60,-110,0,1,1],bot:[0,-274,0,1,1.5],t:[.2,.7]},
    {id:'sign',svg:`<rect x="-36" y="-12" width="72" height="24" rx="4" fill="#fff" stroke="#111" stroke-width="2.5"/><text x="0" y="6" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="14" fill="#0039A6">RUS ❄</text>`,car:[-60,-90,0,0,0],bot:[0,-224,0,.95,.95],t:[.5,.9]},
    {id:'hood',svg:`<rect x="-30" y="-34" width="60" height="68" rx="8" fill="#ff8c1a" stroke="#111" stroke-width="3"/><rect x="-24" y="-28" width="48" height="22" rx="3" fill="#9fd3ff" stroke="#111" stroke-width="2"/>
       <circle class="lamp" cx="-14" cy="6" r="7" fill="#fff59d" stroke="#111" stroke-width="2.5"/><circle class="lamp" cx="14" cy="6" r="7" fill="#fff59d" stroke="#111" stroke-width="2.5"/>
       <path d="M-18,20 H18 M-18,26 H18" stroke="#333" stroke-width="3"/>
       <g class="botHat"><path d="M-40,-30 Q-40,-72 0,-74 Q40,-72 40,-30Z" fill="#333" stroke="#111" stroke-width="3"/><rect x="-44" y="-44" width="88" height="18" rx="9" fill="#222"/><ellipse cx="-42" cy="-12" rx="10" ry="22" fill="#2a2a2a" stroke="#111" stroke-width="3"/><ellipse cx="42" cy="-12" rx="10" ry="22" fill="#2a2a2a" stroke="#111" stroke-width="3"/><path d="M0,-66 l-8,4 -3,-4 1,9 6,4 4,-4 4,4 6,-4 1,-9 -3,4z" fill="#E8B923"/></g>`,car:[-142,-62,0,1,1],bot:[0,-318,0,1,1],t:[.35,.8]},
    {id:'plow',svg:`<path d="M-20,-40 Q10,0 -20,40 L-8,40 Q22,0 -8,-40Z" fill="#c9ced6" stroke="#111" stroke-width="3"/><path d="M-18,-30 l10,0 M-14,-10 l10,0 M-14,10 l10,0 M-18,30 l10,0" stroke="#D52B1E" stroke-width="4"/>`,car:[-185,-40,0,1,1],bot:[-80,-150,-90,.0,.0],t:[.05,.4]},
    {id:'wheelB',svg:wheel,car:[75,-25,0,1,1],bot:[34,-14,0,1,1],t:[.15,.55],spin:true},
    {id:'wheelF',svg:wheel,car:[-85,-25,0,1,1],bot:[-34,-14,0,1,1],t:[.15,.55],spin:true},
  ];
}

// Синкансэн Японии -> Japan-бот (белый с синей полосой, нос поезда становится головой)
function SHINKANSEN_PARTS(){
  const leg=`<rect x="-14" y="-60" width="28" height="120" rx="8" fill="#f8f9fa" stroke="#111" stroke-width="3"/><rect x="-14" y="-6" width="28" height="9" fill="#1c3f94"/>`;
  const arm=`<rect x="-12" y="-58" width="24" height="116" rx="10" fill="#f8f9fa" stroke="#111" stroke-width="3"/><rect x="-12" y="-14" width="24" height="8" fill="#1c3f94"/><circle cy="62" r="14" fill="#dee2e6" stroke="#111" stroke-width="3"/>`;
  const wheel=`<circle r="16" fill="#495057" stroke="#111" stroke-width="3"/><circle r="6" fill="#ced4da"/>`;
  return [
    {id:'legL',svg:leg,car:[-40,-20,0,0,0],bot:[-32,-76,0,1,1],t:[.25,.65]},
    {id:'legR',svg:leg,car:[40,-20,0,0,0],bot:[32,-76,0,1,1],t:[.25,.65]},
    {id:'armL',svg:arm,car:[0,-40,0,0,0],bot:[-76,-205,18,1,1],t:[.45,.85]},
    {id:'armR',svg:arm,car:[0,-40,0,0,0],bot:[76,-205,-18,1,1],t:[.45,.85]},
    {id:'body',svg:`<rect x="-120" y="-30" width="240" height="60" rx="14" fill="#f8f9fa" stroke="#111" stroke-width="3"/>
       <rect x="-120" y="6" width="240" height="8" fill="#1c3f94"/><rect x="-120" y="16" width="240" height="3" fill="#1c3f94"/>
       ${[...Array(9)].map((_,i)=>`<rect x="${-108+i*25}" y="-18" width="16" height="14" rx="3" fill="#264b7a"/>`).join('')}
       <circle cx="80" cy="-4" r="10" fill="#fff" stroke="#BC002D" stroke-width="3"/><circle cx="80" cy="-4" r="5" fill="#BC002D"/>`,car:[0,-50,0,1,1],bot:[0,-205,90,.55,1.35],t:[.1,.6]},
    {id:'roof',svg:`<rect x="-60" y="-5" width="120" height="10" rx="5" fill="#adb5bd" stroke="#111" stroke-width="2.5"/><path d="M-20,-5 l10,-14 l10,14" fill="none" stroke="#111" stroke-width="2.5"/>`,car:[10,-84,0,1,1],bot:[0,-270,0,1.05,1.4],t:[.2,.7]},
    {id:'sign',svg:`<rect x="-38" y="-11" width="76" height="22" rx="4" fill="#fff" stroke="#111" stroke-width="2.5"/><text x="0" y="6" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="13" fill="#BC002D">JAPAN ⚡</text>`,car:[-40,-50,0,0,0],bot:[0,-222,0,.95,.95],t:[.5,.9]},
    {id:'hood',svg:`<path d="M-30,24 L-30,-6 Q-26,-46 0,-52 Q26,-46 30,-6 L30,24Z" fill="#f8f9fa" stroke="#111" stroke-width="3"/>
       <path d="M-22,-8 Q0,-30 22,-8 L18,2 Q0,-12 -18,2Z" fill="#264b7a"/>
       <circle class="lamp" cx="-14" cy="10" r="5" fill="#fff59d" stroke="#111" stroke-width="2"/><circle class="lamp" cx="14" cy="10" r="5" fill="#fff59d" stroke="#111" stroke-width="2"/>
       <rect x="-30" y="16" width="60" height="6" fill="#1c3f94"/>
       <g class="band"><rect x="-32" y="-26" width="64" height="9" fill="#fff" stroke="#111" stroke-width="2"/><circle cx="0" cy="-21.5" r="3.5" fill="#BC002D"/><path d="M30,-24 l14,-6 -2,10z M30,-20 l12,8 -12,0z" fill="#fff" stroke="#111" stroke-width="2"/></g>`,car:[-150,-48,-90,1,1],bot:[0,-312,0,1.1,1.1],t:[.35,.8]},
    {id:'wheelB',svg:wheel,car:[80,-16,0,1,1],bot:[32,-12,0,1.1,1.1],t:[.15,.55],spin:true},
    {id:'wheelF',svg:wheel,car:[-80,-16,0,1,1],bot:[-32,-12,0,1.1,1.1],t:[.15,.55],spin:true},
  ];
}

// Универсальный робот по цветовой схеме: o = {leg, arm, body, bodyDecor, roof, sign, signColor, hood, hoodDecor, wheel, bodyW}
function GENERIC_PARTS(o){
  const W=o.bodyW||220;
  const leg=`<rect x="-15" y="-60" width="30" height="120" rx="7" fill="${o.leg}" stroke="#111" stroke-width="3"/><rect x="-15" y="-8" width="30" height="10" fill="${o.accent||'#111'}"/>`;
  const arm=`<rect x="-12" y="-58" width="24" height="116" rx="9" fill="${o.arm}" stroke="#111" stroke-width="3"/><rect x="-12" y="-16" width="24" height="9" fill="${o.accent||'#111'}"/><circle cy="62" r="15" fill="#dee2e6" stroke="#111" stroke-width="3"/>${o.handItem||''}`;
  const wheel=`<circle r="${o.wheelR||20}" fill="#222" stroke="#111" stroke-width="3"/><circle r="${(o.wheelR||20)*.45}" fill="${o.wheel||'#ccc'}"/>`;
  return [
    {id:'legL',svg:leg,car:[-40,-25,0,0,0],bot:[-34,-78,0,1,1],t:[.25,.65]},
    {id:'legR',svg:leg,car:[40,-25,0,0,0],bot:[34,-78,0,1,1],t:[.25,.65]},
    {id:'armL',svg:arm,car:[0,-50,0,0,0],bot:[-78,-205,18,1,1],t:[.45,.85]},
    {id:'armR',svg:arm.replace(o.handItem||'§',''),car:[0,-50,0,0,0],bot:[78,-205,-18,1,1],t:[.45,.85]},
    {id:'body',svg:`<rect x="${-W/2}" y="-34" width="${W}" height="68" rx="12" fill="${o.body}" stroke="#111" stroke-width="3"/>${o.bodyDecor||''}`,car:[0,-58,0,1,1],bot:[0,-205,90,.55*220/W,1.3],t:[.1,.6]},
    {id:'roof',svg:`<rect x="-70" y="-7" width="140" height="14" rx="6" fill="${o.roof}" stroke="#111" stroke-width="3"/>`,car:[-10,-98,0,1,1],bot:[0,-272,0,1,1.5],t:[.2,.7]},
    {id:'sign',svg:`<rect x="-40" y="-12" width="80" height="24" rx="4" fill="#fff" stroke="#111" stroke-width="2.5"/><text x="0" y="6" text-anchor="middle" font-family="DejaVu Sans" font-weight="bold" font-size="14" fill="${o.signColor||'#111'}">${o.sign}</text>`,car:[30,-58,0,0,0],bot:[0,-222,0,.95,.95],t:[.5,.9]},
    {id:'hood',svg:`<rect x="-28" y="-28" width="56" height="56" rx="9" fill="${o.hood}" stroke="#111" stroke-width="3"/>
       <circle class="lamp" cx="-13" cy="-6" r="7.5" fill="#fff59d" stroke="#111" stroke-width="2.5"/><circle class="lamp" cx="13" cy="-6" r="7.5" fill="#fff59d" stroke="#111" stroke-width="2.5"/>
       <rect x="-16" y="9" width="32" height="10" rx="2" fill="#444" stroke="#111" stroke-width="2"/>${o.hoodDecor||''}`,car:[-W/2-28,-45,0,1,1],bot:[0,-312,0,1.12,1.12],t:[.35,.8]},
    {id:'wheelB',svg:wheel,car:[W/2-40,-20,0,1,1],bot:[34,-14,0,1.1,1.1],t:[.15,.55],spin:true},
    {id:'wheelF',svg:wheel,car:[-W/2+30,-20,0,1,1],bot:[-34,-14,0,1.1,1.1],t:[.15,.55],spin:true},
  ];
}
const GERMANY_PARTS=()=>GENERIC_PARTS({leg:'#2b2b2b',arm:'#2b2b2b',accent:'#FFCE00',body:'#1f1f1f',roof:'#DD0000',sign:'DE ⚙',signColor:'#DD0000',hood:'#c9ced6',
  bodyDecor:`<rect x="-110" y="-2" width="220" height="10" fill="#DD0000"/><rect x="-110" y="8" width="220" height="10" fill="#FFCE00"/><rect x="-90" y="-26" width="70" height="20" rx="4" fill="#9fd3ff"/><rect x="0" y="-26" width="70" height="20" rx="4" fill="#9fd3ff"/>`,
  hoodDecor:`<circle cy="-21" r="5" fill="#fff" stroke="#111" stroke-width="1.5"/>`});
const INDIA_PARTS=()=>GENERIC_PARTS({leg:'#138808',arm:'#138808',accent:'#FF9933',body:'#ffd43b',roof:'#138808',sign:'IN 🛺',signColor:'#FF9933',hood:'#ffd43b',bodyW:150,wheelR:16,
  bodyDecor:`<rect x="-75" y="-34" width="150" height="14" fill="#138808"/><rect x="-60" y="-16" width="50" height="22" rx="4" fill="#9fd3ff"/><circle cx="35" cy="5" r="11" fill="none" stroke="#000080" stroke-width="2.5"/>`,
  hoodDecor:`<rect x="-28" y="-28" width="56" height="10" fill="#FF9933"/>`});
const TURKEY_PARTS=()=>GENERIC_PARTS({leg:'#E30A17',arm:'#E30A17',accent:'#fff',body:'#E30A17',roof:'#b30812',sign:'TR ☕',signColor:'#E30A17',hood:'#f1f3f5',
  bodyDecor:`<circle cx="-10" cy="0" r="20" fill="#fff"/><circle cx="-4" cy="0" r="16" fill="#E30A17"/><polygon points="20,0 9,4 13,-7 13,7 9,-4" fill="#fff" transform="translate(4,0) scale(1.2)"/>`,
  hoodDecor:`<path d="M-14,-28 L-10,-46 L10,-46 L14,-28Z" fill="#B2122B" stroke="#111" stroke-width="2"/><path d="M0,-46 Q10,-40 12,-30" stroke="#111" stroke-width="2" fill="none"/>`});
