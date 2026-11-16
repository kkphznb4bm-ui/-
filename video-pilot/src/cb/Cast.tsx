import React from 'react';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const COMIC = 'Bangers, Impact, sans-serif';
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// =====================================================================
// flags (drawn in a 2r x 2r box centred on 0,0)
// =====================================================================

export type FlagName =
  | 'usa' | 'rus' | 'chn' | 'jpn' | 'kgz' | 'ger' | 'fra' | 'uk' | 'ita'
  | 'bra' | 'ind' | 'can' | 'mex' | 'esp' | 'ned' | 'bel' | 'irl' | 'aut' | 'pol' | 'ukr'
  | 'swe' | 'fin' | 'che' | 'tur' | 'kaz' | 'arg' | 'nga' | 'idn' | 'col' | 'rou' | 'hun' | 'est' | 'bgd' | 'unknown';

export const CROWD_FLAGS: FlagName[] = [
  'bra', 'ind', 'can', 'mex', 'esp', 'ned', 'bel', 'irl', 'aut', 'pol', 'ukr', 'swe', 'fin', 'che', 'tur', 'kaz', 'arg', 'nga', 'idn', 'col', 'rou', 'hun', 'est', 'bgd',
];

const star = (cx: number, cy: number, r: number, rot = -90) => {
  const p: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.4 : r;
    const a = ((rot + i * 36) * Math.PI) / 180;
    p.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
  }
  return `M${p.join('L')}Z`;
};

export const Flag: React.FC<{ name: FlagName; r: number }> = ({ name, r }) => {
  const d = r * 2;
  const x0 = -r;
  const y0 = -r;
  const h = (cols: string[], w?: number[]) => {
    const ws = w ?? cols.map(() => 1);
    const tot = ws.reduce((a, b) => a + b, 0);
    let acc = 0;
    return cols.map((c, i) => {
      const y = y0 + (acc / tot) * d;
      acc += ws[i];
      return <rect key={i} x={x0} y={y} width={d} height={(ws[i] / tot) * d + 1} fill={c} />;
    });
  };
  const v = (cols: string[], w?: number[]) => {
    const ws = w ?? cols.map(() => 1);
    const tot = ws.reduce((a, b) => a + b, 0);
    let acc = 0;
    return cols.map((c, i) => {
      const x = x0 + (acc / tot) * d;
      acc += ws[i];
      return <rect key={i} x={x} y={y0} width={(ws[i] / tot) * d + 1} height={d} fill={c} />;
    });
  };
  const bg = (c: string) => <rect x={x0} y={y0} width={d} height={d} fill={c} />;
  const nordic = (b: string, c: string) => (
    <>
      {bg(b)}
      <rect x={x0} y={-r * 0.14} width={d} height={r * 0.28} fill={c} />
      <rect x={-r * 0.42} y={y0} width={r * 0.28} height={d} fill={c} />
    </>
  );
  switch (name) {
    case 'usa': {
      const sh = d / 13;
      return (
        <>
          {Array.from({ length: 13 }).map((_, i) => (
            <rect key={i} x={x0} y={y0 + i * sh} width={d} height={sh + 0.5} fill={i % 2 ? '#fff' : '#b22234'} />
          ))}
          <rect x={x0} y={y0} width={d * 0.5} height={sh * 7} fill="#3c3b6e" />
          {Array.from({ length: 20 }).map((_, i) => (
            <circle key={i} cx={x0 + d * 0.07 + (i % 5) * d * 0.09} cy={y0 + sh * 0.8 + Math.floor(i / 5) * sh * 1.6} r={r * 0.035} fill="#fff" />
          ))}
        </>
      );
    }
    case 'rus': return <>{h(['#fff', '#0039a6', '#d52b1e'])}</>;
    case 'ger': return <>{h(['#000', '#dd0000', '#ffce00'])}</>;
    case 'fra': return <>{v(['#0055a4', '#fff', '#ef4135'])}</>;
    case 'ita': return <>{v(['#009246', '#fff', '#ce2b37'])}</>;
    case 'ned': return <>{h(['#ae1c28', '#fff', '#21468b'])}</>;
    case 'bel': return <>{v(['#000', '#fdda24', '#ef3340'])}</>;
    case 'irl': return <>{v(['#169b62', '#fff', '#ff883e'])}</>;
    case 'aut': return <>{h(['#ed2939', '#fff', '#ed2939'])}</>;
    case 'pol': return <>{h(['#fff', '#dc143c'])}</>;
    case 'ukr': return <>{h(['#0057b7', '#ffd700'])}</>;
    case 'idn': return <>{h(['#ce1126', '#fff'])}</>;
    case 'nga': return <>{v(['#008751', '#fff', '#008751'])}</>;
    case 'rou': return <>{v(['#002b7f', '#fcd116', '#ce1126'])}</>;
    case 'hun': return <>{h(['#ce2939', '#fff', '#477050'])}</>;
    case 'est': return <>{h(['#0072ce', '#000', '#fff'])}</>;
    case 'col': return <>{h(['#fcd116', '#003893', '#ce1126'], [2, 1, 1])}</>;
    case 'esp': return <>{h(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1])}</>;
    case 'swe': return nordic('#006aa7', '#fecc00');
    case 'fin': return nordic('#fff', '#003580');
    case 'che':
      return (
        <>
          {bg('#da291c')}
          <rect x={-r * 0.12} y={-r * 0.5} width={r * 0.24} height={r} fill="#fff" />
          <rect x={-r * 0.5} y={-r * 0.12} width={r} height={r * 0.24} fill="#fff" />
        </>
      );
    case 'tur':
      return (
        <>
          {bg('#e30a17')}
          <circle cx={-r * 0.2} cy={0} r={r * 0.42} fill="#fff" />
          <circle cx={-r * 0.08} cy={0} r={r * 0.34} fill="#e30a17" />
          <path d={star(r * 0.38, 0, r * 0.16, 180)} fill="#fff" />
        </>
      );
    case 'kaz':
      return (
        <>
          {bg('#00afca')}
          <circle cx={0} cy={-r * 0.1} r={r * 0.24} fill="#fec50c" />
          {Array.from({ length: 16 }).map((_, i) => (
            <path key={i} d={`M${-r * 0.03} ${-r * 0.38} L0 ${-r * 0.5} L${r * 0.03} ${-r * 0.38}Z`} fill="#fec50c" transform={`translate(0 ${-r * 0.1}) rotate(${i * 22.5})`} />
          ))}
        </>
      );
    case 'arg':
      return (
        <>
          {h(['#74acdf', '#fff', '#74acdf'])}
          <circle r={r * 0.14} fill="#f6b40e" />
        </>
      );
    case 'bgd':
      return (
        <>
          {bg('#006a4e')}
          <circle cx={-r * 0.1} r={r * 0.4} fill="#f42a41" />
        </>
      );
    case 'mex':
      return (
        <>
          {v(['#006847', '#fff', '#ce1126'])}
          <circle r={r * 0.16} fill="#8c5a2b" opacity={0.8} />
        </>
      );
    case 'can':
      return (
        <>
          {v(['#d52b1e', '#fff', '#d52b1e'], [1, 2, 1])}
          <path d={star(0, r * 0.02, r * 0.36)} fill="#d52b1e" />
          <rect x={-r * 0.03} y={r * 0.1} width={r * 0.06} height={r * 0.3} fill="#d52b1e" />
        </>
      );
    case 'ind':
      return (
        <>
          {h(['#ff9933', '#fff', '#138808'])}
          <circle r={r * 0.2} fill="none" stroke="#000080" strokeWidth={r * 0.04} />
        </>
      );
    case 'bra':
      return (
        <>
          {bg('#009c3b')}
          <path d={`M0 ${-r * 0.75} L${r * 0.9} 0 L0 ${r * 0.75} L${-r * 0.9} 0Z`} fill="#ffdf00" />
          <circle r={r * 0.4} fill="#002776" />
        </>
      );
    case 'jpn':
      return (
        <>
          {bg('#fff')}
          <circle cx={0} cy={r * 0.15} r={r * 0.42} fill="#bc002d" />
        </>
      );
    case 'chn':
      return (
        <>
          {bg('#de2910')}
          <path d={star(-r * 0.45, -r * 0.45, r * 0.24)} fill="#ffde00" />
          {[
            [-0.12, -0.72],
            [0.02, -0.52],
            [0.02, -0.26],
            [-0.12, -0.08],
          ].map(([sx, sy], i) => (
            <path key={i} d={star(sx * r, sy * r, r * 0.08, -60 + i * 25)} fill="#ffde00" />
          ))}
        </>
      );
    case 'uk': {
      const w = d * 0.1;
      return (
        <>
          {bg('#012169')}
          <g stroke="#fff" strokeWidth={w * 2}>
            <line x1={x0} y1={y0} x2={r} y2={r} />
            <line x1={r} y1={y0} x2={x0} y2={r} />
          </g>
          <g stroke="#c8102e" strokeWidth={w * 0.7}>
            <line x1={x0} y1={y0} x2={r} y2={r} />
            <line x1={r} y1={y0} x2={x0} y2={r} />
          </g>
          <rect x={x0} y={-w * 1.6} width={d} height={w * 3.2} fill="#fff" />
          <rect x={-w * 1.6} y={y0} width={w * 3.2} height={d} fill="#fff" />
          <rect x={x0} y={-w} width={d} height={w * 2} fill="#c8102e" />
          <rect x={-w} y={y0} width={w * 2} height={d} fill="#c8102e" />
        </>
      );
    }
    case 'kgz':
      return (
        <>
          {bg('#e8112d')}
          {Array.from({ length: 40 }).map((_, i) => (
            <path key={i} d={`M${-r * 0.03} ${-r * 0.32} L0 ${-r * 0.6} L${r * 0.03} ${-r * 0.32}Z`} fill="#ffef00" transform={`rotate(${i * 9})`} />
          ))}
          <circle r={r * 0.34} fill="#ffef00" />
          <circle r={r * 0.22} fill="none" stroke="#e8112d" strokeWidth={r * 0.05} />
          {[-1, 0, 1].map((k) => (
            <g key={k}>
              <line x1={k * r * 0.08} y1={-r * 0.21} x2={k * r * 0.08} y2={r * 0.21} stroke="#e8112d" strokeWidth={r * 0.03} />
              <line x1={-r * 0.21} y1={k * r * 0.08} x2={r * 0.21} y2={k * r * 0.08} stroke="#e8112d" strokeWidth={r * 0.03} />
            </g>
          ))}
        </>
      );
    case 'unknown':
      return (
        <>
          {bg('#2b2b33')}
          <text x={0} y={r * 0.42} textAnchor="middle" fontFamily={COMIC} fontSize={r * 1.2} fill="#8a8aa0">
            ?
          </text>
        </>
      );
  }
};

// =====================================================================
// countryball: lit sphere, flag, eyes, little arms
// =====================================================================

export type Eyes = 'normal' | 'wide' | 'closed' | 'happy' | 'smug' | 'angry' | 'shock';
export type Pose = 'idle' | 'wave' | 'up' | 'point' | 'hips' | 'flex' | 'shrug' | 'rub' | 'stretch';

export const Ball: React.FC<{
  id: string;
  flag: FlagName;
  x: number;
  y: number;
  r: number;
  eyes?: Eyes;
  look?: number;
  rot?: number;
  squash?: number;
  pose?: Pose;
  light?: number; // light direction angle in degrees (where light comes FROM)
  tint?: string; // ambient light colour multiplied over the ball
  shadow?: boolean;
  seed?: number;
  children?: React.ReactNode;
}> = ({ id, flag, x, y, r, eyes = 'normal', look = 0, rot = 0, squash = 0, pose = 'idle', light = -130, tint, shadow = true, seed = 0, children }) => {
  const f = useCurrentFrame();
  const sw = r * 0.05;
  // auto blink
  const bt = (f + seed * 53) % 140;
  const blinking = bt < 5 && eyes !== 'closed' && eyes !== 'happy';
  const ex = r * 0.3;
  const ey = -r * 0.12;
  const lx = look * r * 0.14;
  const la = (light * Math.PI) / 180;
  const hx = Math.cos(la) * 0.35 + 0.5;
  const hy = Math.sin(la) * 0.35 + 0.5;

  const eye = (side: number) => {
    const cx = side * ex + lx;
    const rx = r * 0.16;
    const ry = r * 0.23;
    if (blinking) return <path d={`M${cx - rx} ${ey} Q${cx} ${ey + ry * 0.35} ${cx + rx} ${ey}`} fill="none" stroke="#111" strokeWidth={sw} strokeLinecap="round" />;
    switch (eyes) {
      case 'wide':
        return <ellipse cx={cx} cy={ey - r * 0.04} rx={rx * 1.3} ry={ry * 1.35} fill="#fff" stroke="#111" strokeWidth={sw} />;
      case 'shock':
        return (
          <g>
            <ellipse cx={cx} cy={ey - r * 0.05} rx={rx * 1.45} ry={ry * 1.5} fill="#fff" stroke="#111" strokeWidth={sw} />
          </g>
        );
      case 'closed':
        return <path d={`M${cx - rx} ${ey} Q${cx} ${ey + ry * 0.7} ${cx + rx} ${ey}`} fill="none" stroke="#111" strokeWidth={sw} strokeLinecap="round" />;
      case 'happy':
        return <path d={`M${cx - rx} ${ey + ry * 0.2} Q${cx} ${ey - ry} ${cx + rx} ${ey + ry * 0.2}`} fill="none" stroke="#111" strokeWidth={sw * 1.2} strokeLinecap="round" />;
      case 'smug':
        return <path d={`M${cx - rx} ${ey} A${rx} ${ry} 0 0 0 ${cx + rx} ${ey} Z`} fill="#fff" stroke="#111" strokeWidth={sw} strokeLinejoin="round" />;
      case 'angry': {
        // flat slanted top: inner corner lower
        const inner = side < 0 ? cx + rx : cx - rx;
        const outer = side < 0 ? cx - rx : cx + rx;
        return (
          <path
            d={`M${outer} ${ey - ry * 0.55} L${inner} ${ey - ry * 0.05} A${rx} ${ry} 0 0 1 ${outer} ${ey - ry * 0.55} Z`}
            fill="#fff"
            stroke="#111"
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        );
      }
      default:
        return <ellipse cx={cx} cy={ey} rx={rx} ry={ry} fill="#fff" stroke="#111" strokeWidth={sw} />;
    }
  };

  // arms: shoulder at body edge, hand position by pose (angles in degrees, 0 = right, 90 = down)
  const wob = Math.sin(f / 7 + seed) * 6;
  const armAngles: Record<Pose, [number, number]> = {
    idle: [100 + wob * 0.3, 80 - wob * 0.3],
    wave: [110, -60 + Math.sin(f / 3) * 25],
    up: [-120 + wob, -60 - wob],
    point: [110, -10],
    hips: [150, 30],
    flex: [-150 + Math.sin(f / 4) * 10, -30 - Math.sin(f / 4) * 10],
    shrug: [-170 + Math.abs(Math.sin(f / 8)) * 10, -10 - Math.abs(Math.sin(f / 8)) * 10],
    rub: [-110 + Math.sin(f / 2) * 15, -70 - Math.sin(f / 2) * 15],
    stretch: [-110 + Math.sin(f / 20) * 10, -70 - Math.sin(f / 20) * 10],
  };
  const [aL, aR] = armAngles[pose];
  const arm = (side: number, angle: number) => {
    const sx = side * r * 0.92;
    const sy = r * 0.2;
    const a = (angle * Math.PI) / 180;
    const len = r * 0.55;
    const elbow = pose === 'flex' || pose === 'hips' ? r * 0.25 : r * 0.08;
    const hxp = sx + Math.cos(a) * len;
    const hyp = sy + Math.sin(a) * len;
    const mx = (sx + hxp) / 2 + side * elbow;
    const my = (sy + hyp) / 2 + elbow * 0.5;
    return (
      <g key={side}>
        <path d={`M${sx} ${sy} Q${mx} ${my} ${hxp} ${hyp}`} stroke="#111" strokeWidth={r * 0.07} fill="none" strokeLinecap="round" />
        <circle cx={hxp} cy={hyp} r={r * 0.11} fill="#f4f1ea" stroke="#111" strokeWidth={r * 0.04} />
      </g>
    );
  };

  return (
    <g transform={`translate(${x} ${y + r * squash})`}>
      {shadow && <ellipse cx={r * 0.25} cy={r * 0.98 - r * squash} rx={r * 0.95} ry={r * 0.14} fill="rgba(20,10,30,0.28)" />}
      <g transform={`rotate(${rot}) scale(${1 + squash * 0.6} ${1 - squash})`}>
        <defs>
          <clipPath id={`bc-${id}`}>
            <circle r={r} />
          </clipPath>
          <radialGradient id={`bl-${id}`} cx={hx} cy={hy} r="0.85">
            <stop offset="0" stopColor="#fff" stopOpacity={0.38} />
            <stop offset="0.45" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.75" stopColor="#000" stopOpacity={0.05} />
            <stop offset="1" stopColor="#000" stopOpacity={0.42} />
          </radialGradient>
        </defs>
        {arm(-1, aL)}
        {arm(1, aR)}
        <g clipPath={`url(#bc-${id})`}>
          <Flag name={flag} r={r} />
          <circle r={r} fill={`url(#bl-${id})`} />
          {tint && <rect x={-r} y={-r} width={r * 2} height={r * 2} fill={tint} style={{ mixBlendMode: 'multiply' }} />}
        </g>
        <circle r={r} fill="none" stroke="#111" strokeWidth={sw} />
        {eye(-1)}
        {eye(1)}
        {children}
      </g>
    </g>
  );
};

// =====================================================================
// speech bubble with word-by-word reveal (screen coordinates)
// =====================================================================

export type Word = { w: string; f: number };

export const Bubble: React.FC<{ x: number; y: number; words: Word[]; from: number; to: number; size?: number; shout?: boolean; who: string }> = ({
  x,
  y,
  words,
  from,
  to,
  size = 54,
  shout,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (f < from || f >= to) return null;
  const s = spring({ frame: f - from, fps, config: { damping: 12, stiffness: 220 } });
  const out = interpolate(f, [to - 6, to], [1, 0], clamp);
  const cx = Math.min(Math.max(x, 400), 1520);
  const tail = Math.max(-260, Math.min(260, x - cx));
  const by = Math.max(170, y);
  return (
    <div
      style={{
        position: 'absolute',
        left: cx,
        top: by,
        transform: `translate(-50%, -100%) scale(${s * out}) rotate(${shout ? Math.sin(f / 2) * 1.2 : 0}deg)`,
        transformOrigin: `calc(50% + ${tail}px) 100%`,
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '6px solid #111',
          borderRadius: shout ? 18 : 40,
          padding: '16px 30px 10px',
          fontFamily: COMIC,
          fontSize: size * (shout ? 1.12 : 1),
          width: 'max-content',
          maxWidth: 720,
          textAlign: 'center',
          lineHeight: 1.05,
          letterSpacing: 1.2,
          color: '#111',
          boxShadow: '0 10px 0 rgba(0,0,0,0.2)',
        }}
      >
        {words.map((w, i) => (
          <span key={i} style={{ opacity: f >= w.f - 1 ? 1 : 0.22 }}>
            {w.w.toUpperCase()}{' '}
          </span>
        ))}
      </div>
      <svg width={70} height={60} style={{ position: 'absolute', left: `calc(50% + ${tail}px - 35px)`, bottom: -50, overflow: 'visible' }}>
        <path d="M10 0 L35 52 L60 0" fill="#fff" stroke="#111" strokeWidth={6} strokeLinejoin="round" />
        <rect x={13} y={-8} width={44} height={13} fill="#fff" />
      </svg>
    </div>
  );
};

/** narrator subtitle (bottom), words highlight as spoken */
export const NarratorCaption: React.FC<{ words: Word[]; from: number; to: number }> = ({ words, from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f >= to) return null;
  const o = interpolate(f, [from, from + 8, to - 8, to], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: 160, right: 160, bottom: 70, textAlign: 'center', opacity: o }}>
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          fontSize: 44,
          lineHeight: 1.35,
          color: '#fff',
          background: 'rgba(5,8,20,0.55)',
          padding: '6px 18px',
          borderRadius: 10,
          boxDecorationBreak: 'clone',
          WebkitBoxDecorationBreak: 'clone',
        }}
      >
        {words.map((w, i) => (
          <span key={i} style={{ color: f >= w.f ? '#fff' : 'rgba(255,255,255,0.35)' }}>
            {w.w}{' '}
          </span>
        ))}
      </span>
    </div>
  );
};

export const BigText: React.FC<{ lines: string[]; size: number; color?: string; top: number; scale?: number; opacity?: number; stroke?: number }> = ({
  lines,
  size,
  color = '#fff',
  top,
  scale = 1,
  opacity = 1,
  stroke = 12,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 60,
      right: 60,
      top,
      textAlign: 'center',
      fontFamily: COMIC,
      fontSize: size,
      lineHeight: 1.02,
      color,
      WebkitTextStroke: `${stroke}px #111`,
      paintOrder: 'stroke fill',
      letterSpacing: 2,
      transform: `scale(${scale})`,
      opacity,
      textShadow: '0 10px 0 rgba(0,0,0,0.3)',
    }}
  >
    {lines.map((l) => (
      <div key={l}>{l}</div>
    ))}
  </div>
);

export const easeIO = Easing.bezier(0.45, 0, 0.25, 1);
