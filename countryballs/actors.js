const NS='http://www.w3.org/2000/svg';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const seg=(t,a,b)=>clamp((t-a)/(b-a));
const lerp=(a,b,k)=>a+(b-a)*k;
const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
const back=k=>{const c=1.7;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2)};
/* ---------- шар со сменными частями ---------- */
function makeBall(code,{teacher=false,mic=false}={}){
  const id='k'+(uid++), c=C[code]||{};
  const flag=teacher
    ? `<rect x="-50" y="-50" width="100" height="100" fill="#4b92db"/><g fill="none" stroke="#fff" stroke-width="2.5"><circle r="16"/><circle r="8"/><path d="M-16,0H16M0,-16V16"/><path d="M-22,14 Q-28,-6 -18,-22 M22,14 Q28,-6 18,-22"/></g>`
    : c.flag();
  const hat=teacher?'':(ACC[c.acc]||'');
  const g=document.createElementNS(NS,'g');
  g.innerHTML=`
   <g class="feet" stroke="#111" stroke-width="3"><path d="M-40,66 Q-42,52 -24,52 Q-8,52 -8,66Z" fill="#1d1d1d"/><path d="M40,66 Q42,52 24,52 Q8,52 8,66Z" fill="#1d1d1d"/><path d="M-36,63H-12M36,63H12" stroke="#fff"/></g>
   <g class="hatBack">${code==='russia'?hat:''}</g>
   <g class="body">
     <clipPath id="${id}"><circle r="45"/></clipPath>
     <g clip-path="url(#${id})"><g transform="scale(.92)">${flag}</g><ellipse cx="-14" cy="-24" rx="18" ry="9" fill="#fff" opacity=".28" transform="rotate(-25 -14 -24)"/><path d="M-45,20 A45,45 0 0,0 45,20 L45,45 L-45,45Z" fill="#000" opacity=".12"/></g>
     <circle r="45" fill="none" stroke="#111" stroke-width="3.5"/>
     <g class="eyes">
       <g class="eN" stroke="#111" stroke-width="3" fill="#fff"><path d="M-30,-6 H-6 A12,12 0 0,1 -30,-6Z"/><path d="M6,-6 H30 A12,12 0 0,1 6,-6Z"/></g>
       <g class="eW" stroke="#111" stroke-width="3" fill="#fff" opacity="0"><circle cx="-17" cy="-6" r="13"/><circle cx="17" cy="-6" r="13"/><circle class="pup" cx="-17" cy="-6" r="3" fill="#111"/><circle class="pup" cx="17" cy="-6" r="3" fill="#111"/></g>
       <g class="eH" stroke="#111" stroke-width="4" fill="none" stroke-linecap="round" opacity="0"><path d="M-29,-2 Q-18,-16 -7,-2"/><path d="M7,-2 Q18,-16 29,-2"/></g>
     </g>
     <ellipse class="mouth" cx="0" cy="22" rx="8" ry="0" fill="#5a0d0d" stroke="#111" stroke-width="2.5"/>
     ${teacher?`<g fill="none" stroke="#111" stroke-width="3"><circle cx="-17" cy="-4" r="15"/><circle cx="17" cy="-4" r="15"/><path d="M-2,-4H2M-32,-6L-45,-10M32,-6L45,-10"/></g>`:''}
     <g class="shades" opacity="0"><path d="M-36,-12 H36 V-8 H32 Q30,8 14,8 Q4,8 4,-8 H-4 Q-4,8 -14,8 Q-30,8 -32,-8 H-36Z" fill="#111"/><path d="M-26,-6 l6,-3 M12,-6 l6,-3" stroke="#fff" stroke-width="2"/></g>
     <g class="sweat" opacity="0"><path d="M38,-30 q6,10 0,14 q-6,-4 0,-14z" fill="#7fd3ff" stroke="#111" stroke-width="1.5"/></g>
   </g>
   <g class="hatFront">${code!=='russia'?hat:''}</g>
   <g class="handL"><circle cx="-52" cy="18" r="11" fill="#fff" stroke="#111" stroke-width="3"/></g>
   <g class="handR"><circle cx="52" cy="18" r="11" fill="#fff" stroke="#111" stroke-width="3"/>${mic?`<g transform="translate(52,10)"><rect x="-4" y="-2" width="8" height="26" rx="3" fill="#333"/><circle cy="-8" r="9" fill="#999" stroke="#111" stroke-width="2.5"/></g>`:''}
     ${teacher?`<g class="sign" opacity="0" transform="translate(58,-30)"><rect x="-4" y="0" width="6" height="50" fill="#8b5a2b"/><rect x="-30" y="-56" width="60" height="58" rx="6" fill="#fff" stroke="#111" stroke-width="3"/><text x="0" y="-12" text-anchor="middle" font-size="44" font-weight="bold" fill="#d00" font-family="DejaVu Sans">2</text></g>`:''}</g>`;
  const q=s=>g.querySelector(s), qa=s=>[...g.querySelectorAll(s)];
  return {g,body:q('.body'),hL:q('.handL'),hR:q('.handR'),hatB:q('.hatBack'),hatF:q('.hatFront'),
    eN:q('.eN'),eW:q('.eW'),eH:q('.eH'),pups:qa('.pup'),mouth:q('.mouth'),shades:q('.shades'),sweat:q('.sweat'),sign:q('.sign'),eyes:q('.eyes')};
}
function pose(b,{x,y,s=1,rot=0,squash=0,hl=[0,0],hr=[0,0],eyes='N',look=0,mouth=0,shades=0,sweat=0,hat=[0,0,0],op=1,sign=0}){
  b.g.setAttribute('transform',`translate(${x},${y}) scale(${s*(1+squash)},${s*(1-squash)})`);
  b.g.setAttribute('opacity',op);
  b.body.setAttribute('transform',`rotate(${rot})`);
  b.hL.setAttribute('transform',`translate(${hl[0]},${hl[1]})`);
  b.hR.setAttribute('transform',`translate(${hr[0]},${hr[1]})`);
  b.eN.setAttribute('opacity',eyes==='N'?1:0);b.eW.setAttribute('opacity',eyes==='W'?1:0);b.eH.setAttribute('opacity',eyes==='H'?1:0);
  b.eyes.setAttribute('transform',`translate(${look*7},0)`);
  b.pups.forEach(p=>p.setAttribute('transform',`translate(${look*6},0)`));
  b.mouth.setAttribute('ry',mouth);
  b.shades.setAttribute('opacity',shades);b.sweat.setAttribute('opacity',sweat);
  const ht=`translate(${hat[0]},${hat[1]}) rotate(${hat[2]})`;b.hatB.setAttribute('transform',ht);b.hatF.setAttribute('transform',ht);
  if(b.sign)b.sign.setAttribute('opacity',sign);
}

