/* ================== ФЛАГИ (в квадрате -50..50) ================== */
const star=(cx,cy,r,fill)=>{let p=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;p.push((cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1))}return `<polygon points="${p.join(' ')}" fill="${fill}"/>`};
const hstripes=(cols)=>{const h=100/cols.length;return cols.map((c,i)=>`<rect x="-50" y="${-50+i*h}" width="100" height="${h+.5}" fill="${c}"/>`).join('')};
const vstripes=(cols)=>{const w=100/cols.length;return cols.map((c,i)=>`<rect y="-50" x="${-50+i*w}" height="100" width="${w+.5}" fill="${c}"/>`).join('')};
const sun=(cx,cy,r,rays,fill)=>{let s='';for(let i=0;i<rays;i++){const a=i*2*Math.PI/rays;s+=`<line x1="${cx}" y1="${cy}" x2="${(cx+Math.cos(a)*r*1.9).toFixed(1)}" y2="${(cy+Math.sin(a)*r*1.9).toFixed(1)}" stroke="${fill}" stroke-width="${r*.35}"/>`}return s+`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`};

const C = {
  usa:{name:'Америка',emoji:'🇺🇸',acc:'cap',flag:()=>{let s='';for(let i=0;i<13;i++)s+=`<rect x="-50" y="${-50+i*100/13}" width="100" height="${100/13+.3}" fill="${i%2?'#fff':'#B22234'}"/>`;s+=`<rect x="-50" y="-50" width="52" height="${700/13}" fill="#3C3B6E"/>`;for(let r=0;r<5;r++)for(let c=0;c<6;c++)s+=star(-44+c*8.4+(r%2)*4,-44+r*9.6,2.6,'#fff');return s}},
  russia:{name:'Россия',emoji:'🇷🇺',acc:'ushanka',flag:()=>hstripes(['#fff','#0039A6','#D52B1E'])},
  philippines:{name:'Филиппины',emoji:'🇵🇭',acc:'none',flag:()=>`<rect x="-50" y="-50" width="100" height="50" fill="#0038A8"/><rect x="-50" y="0" width="100" height="50" fill="#CE1126"/><polygon points="-50,-50 15,0 -50,50" fill="#fff"/>${sun(-24,0,7,8,'#FCD116')}${star(-43,-36,4,'#FCD116')}${star(-43,36,4,'#FCD116')}${star(5,0,4,'#FCD116')}`},
  iran:{name:'Иран',emoji:'🇮🇷',acc:'none',flag:()=>hstripes(['#239F40','#fff','#DA0000'])+`<path d="M0,-11 C-9,-6 -9,8 0,11 C9,8 9,-6 0,-11Z M0,-6 L0,9" fill="none" stroke="#DA0000" stroke-width="3"/><rect x="-50" y="-17.5" width="100" height="1.6" fill="#239F40" opacity=".6"/><rect x="-50" y="16" width="100" height="1.6" fill="#DA0000" opacity=".6"/>`},
  japan:{name:'Япония',emoji:'🇯🇵',acc:'headband',flag:()=>`<rect x="-50" y="-50" width="100" height="100" fill="#fff"/><circle r="22" fill="#BC002D"/>`},
  brazil:{name:'Бразилия',emoji:'🇧🇷',acc:'none',flag:()=>`<rect x="-50" y="-50" width="100" height="100" fill="#009C3B"/><polygon points="0,-40 46,0 0,40 -46,0" fill="#FFDF00"/><circle r="20" fill="#002776"/><path d="M-20,-4 Q0,-10 20,4" stroke="#fff" stroke-width="3.5" fill="none"/>`},
  germany:{name:'Германия',emoji:'🇩🇪',acc:'none',flag:()=>hstripes(['#000','#DD0000','#FFCE00'])},
  tajikistan:{name:'Таджикистан',emoji:'🇹🇯',acc:'toqi',flag:()=>`<rect x="-50" y="-50" width="100" height="30" fill="#CC0000"/><rect x="-50" y="-20" width="100" height="42" fill="#fff"/><rect x="-50" y="22" width="100" height="28" fill="#006600"/><path d="M-9,8 L-9,0 L-4,4 L0,-3 L4,4 L9,0 L9,8Z" fill="#F8C300"/>${[-3,-2,-1,0,1,2,3].map(k=>{const a=-Math.PI/2+k*.36;return star(Math.cos(a)*15,4+Math.sin(a)*15,2.4,'#F8C300')}).join('')}`},
  kazakhstan:{name:'Казахстан',emoji:'🇰🇿',acc:'none',flag:()=>`<rect x="-50" y="-50" width="100" height="100" fill="#00AFCA"/>${sun(0,-6,10,16,'#FEC50C')}<path d="M-18,12 Q0,2 18,12 Q0,8 -18,12Z" fill="#FEC50C"/>`},
  turkey:{name:'Турция',emoji:'🇹🇷',acc:'fez',flag:()=>`<rect x="-50" y="-50" width="100" height="100" fill="#E30A17"/><circle cx="-6" r="20" fill="#fff"/><circle cx="-1" r="16" fill="#E30A17"/>${star(18,0,8,'#fff')}`},
  france:{name:'Франция',emoji:'🇫🇷',acc:'beret',flag:()=>vstripes(['#0055A4','#fff','#EF4135'])},
  india:{name:'Индия',emoji:'🇮🇳',acc:'none',flag:()=>hstripes(['#FF9933','#fff','#138808'])+`<circle r="12" fill="none" stroke="#000080" stroke-width="2"/>${[...Array(12)].map((_,i)=>`<line x1="0" y1="0" x2="${(Math.cos(i*Math.PI/6)*12).toFixed(1)}" y2="${(Math.sin(i*Math.PI/6)*12).toFixed(1)}" stroke="#000080" stroke-width="1"/>`).join('')}`},
};

/* ================== АКСЕССУАРЫ ================== */
const ACC = {
  ushanka:`<g stroke="#111" stroke-width="2.5"><ellipse cx="-44" cy="-4" rx="13" ry="26" fill="#2a2a2a"/><ellipse cx="44" cy="-4" rx="13" ry="26" fill="#2a2a2a"/><path d="M-46,-26 Q-46,-74 0,-76 Q46,-74 46,-26Z" fill="#333"/><rect x="-50" y="-44" width="100" height="22" rx="11" fill="#222"/></g><g transform="translate(0,-60) scale(.55)"><path d="M0,-14 L-14,-6 L-20,-14 L-18,4 L-8,10 L0,14 L8,10 L18,4 L20,-14 L14,-6Z" fill="#E8B923" stroke="#8a6410" stroke-width="1.5"/><rect x="-5" y="-4" width="10" height="11" fill="#D52B1E"/></g>`,
  cap:`<g stroke="#111" stroke-width="2.5"><path d="M-40,-24 Q-38,-64 0,-64 Q38,-64 40,-24Z" fill="#B22234"/><path d="M0,-25 L68,-22 Q70,-14 40,-16Z" fill="#3C3B6E"/></g><text x="0" y="-36" text-anchor="middle" font-size="14" font-weight="900" fill="#fff" font-family="Arial">USA</text>`,
  headband:`<rect x="-46" y="-34" width="92" height="12" fill="#fff" stroke="#111" stroke-width="2"/><circle cx="0" cy="-28" r="4.5" fill="#BC002D"/><path d="M44,-30 l16,-6 l-4,12 z M44,-26 l14,10 l-14,0z" fill="#fff" stroke="#111" stroke-width="2"/>`,
  toqi:`<path d="M-30,-36 Q-28,-62 0,-62 Q28,-62 30,-36 Z" fill="#111" stroke="#111" stroke-width="2.5"/>${[-18,-6,6,18].map(x=>`<path d="M${x},-44 q-4,-5 0,-10 q4,5 0,10z" fill="#fff"/>`).join('')}`,
  fez:`<path d="M-22,-38 L-16,-70 L16,-70 L22,-38 Z" fill="#B2122B" stroke="#111" stroke-width="2.5"/><path d="M0,-70 Q14,-62 18,-48" stroke="#111" stroke-width="2.5" fill="none"/><circle cx="18" cy="-46" r="4" fill="#111"/>`,
  beret:`<ellipse cx="-6" cy="-40" rx="36" ry="13" fill="#1a1a1a" stroke="#111" stroke-width="2.5" transform="rotate(-12)"/><rect x="-10" y="-58" width="4" height="8" fill="#111" transform="rotate(-12)"/>`,
  none:'',
};

/* ================== РИСУЕМ ШАР ================== */
let uid=0;
function ballSVG(code,x,y,s,i,n){
  const c=C[code], id='cb'+(uid++);
  const acc=ACC[c.acc]||'';
  const behind=c.acc==='ushanka'?acc:'';
  const front=c.acc==='ushanka'?'':acc;
  return `<g transform="translate(${x},${y}) scale(${s})"><g class="ball" data-code="${code}" style="--i:${i};--n:${n}">
    <ellipse cx="0" cy="66" rx="40" ry="7" fill="#0003"/>
    <g stroke="#111" stroke-width="3"><path d="M-30,48 L-24,56" /><path d="M30,48 L24,56"/>
      <path d="M-40,66 Q-42,52 -24,52 Q-8,52 -8,66Z" fill="#1d1d1d"/><path d="M40,66 Q42,52 24,52 Q8,52 8,66Z" fill="#1d1d1d"/>
      <path d="M-38,64 H-10 M38,64 H10" stroke="#fff" stroke-width="3"/></g>
    <g class="body">
      ${behind}
      <clipPath id="${id}"><circle r="45"/></clipPath>
      <g clip-path="url(#${id})"><g transform="scale(.92)">${c.flag()}</g><ellipse cx="-14" cy="-24" rx="18" ry="9" fill="#fff" opacity=".28" transform="rotate(-25 -14 -24)"/><path d="M-45,20 A45,45 0 0,0 45,20 L45,45 L-45,45Z" fill="#000" opacity=".12"/></g>
      <circle r="45" fill="none" stroke="#111" stroke-width="3.5"/>
      ${front}
      <g stroke="#111" stroke-width="3" fill="#fff">
        <path d="M-30,-6 H-6 A12,12 0 0,1 -30,-6Z"/><path d="M6,-6 H30 A12,12 0 0,1 6,-6Z"/>
      </g>
      <g class="lid"><rect x="-31" y="-7" width="26" height="14" fill="${'#0000'}"/></g>
      <g class="shades"><path d="M-36,-12 H36 V-8 H32 Q30,8 14,8 Q4,8 4,-8 H-4 Q-4,8 -14,8 Q-30,8 -32,-8 H-36Z" fill="#111"/><path d="M-26,-6 l6,-3 M12,-6 l6,-3" stroke="#fff" stroke-width="2"/></g>
      <g class="crown"><path d="M-22,-42 L-24,-66 L-11,-54 L0,-72 L11,-54 L24,-66 L22,-42Z" fill="#FFD43B" stroke="#111" stroke-width="2.5"/><circle cx="0" cy="-52" r="3.5" fill="#fe2c55"/></g>
    </g>
    <g class="handL"><circle cx="-52" cy="18" r="11" fill="#fff" stroke="#111" stroke-width="3"/></g>
    <g class="handR"><circle cx="52" cy="18" r="11" fill="#fff" stroke="#111" stroke-width="3"/></g>
  </g></g>`;
}
function iconSVG(code){return `<svg viewBox="-60 -80 120 160">${ballSVG(code,0,0,1,0,0).replace(/class="ball"/,'class="ball-ic"')}</svg>`}

