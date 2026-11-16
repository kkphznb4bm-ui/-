import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  interpolateColors,
  random,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import timeline from '../public/star/timeline.json';

// =====================================================================
// timeline
// =====================================================================

type Word = { w: string; f: number; e: number };
type SceneT = { key: string; start: number; len: number; voiceAt: number; words: Word[] };
const TL = timeline as { fps: number; total: number; scenes: SceneT[] };
export const STAR_FRAMES = TL.total;
const XF = 20; // half-length of the cross-dissolve between scenes

const scene = (key: string) => TL.scenes.find((s) => s.key === key)!;
/** local frame (relative to scene start) at which `word` is spoken */
const wordAt = (key: string, word: string, nth = 0) => {
  const s = scene(key);
  const hits = s.words.filter((w) => w.w.toLowerCase().replace(/[^a-z]/g, '') === word);
  return (hits[nth] ?? hits[0] ?? s.words[0]).f - s.start;
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ease = Easing.bezier(0.45, 0, 0.25, 1);
const lerp = (f: number, a: number, b: number, from: number, to: number, e = ease) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: e });

// =====================================================================
// camera + parallax
// =====================================================================

type Cam = { x: number; y: number; z: number; r: number };
type Key = [number, Partial<Cam>];

const camAt = (keys: Key[], f: number): Cam => {
  const full: [number, Cam][] = [];
  let prev: Cam = { x: 0, y: 0, z: 1, r: 0 };
  for (const [kf, c] of keys) {
    prev = { ...prev, ...c };
    full.push([kf, prev]);
  }
  if (f <= full[0][0]) return full[0][1];
  for (let i = 0; i < full.length - 1; i++) {
    const [fa, a] = full[i];
    const [fb, b] = full[i + 1];
    if (f <= fb) {
      const t = ease((f - fa) / (fb - fa));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, r: a.r + (b.r - a.r) * t };
    }
  }
  return full[full.length - 1][1];
};

const CamCtx = React.createContext<Cam>({ x: 0, y: 0, z: 1, r: 0 });

/** A world layer. depth < 1 = far (moves less), depth > 1 = near (moves more). */
const Layer: React.FC<{ depth: number; blend?: React.CSSProperties['mixBlendMode']; opacity?: number; children: React.ReactNode }> = ({
  depth,
  blend,
  opacity = 1,
  children,
}) => {
  const c = React.useContext(CamCtx);
  const s = Math.pow(c.z, depth);
  return (
    <AbsoluteFill
      style={{
        transform: `translate(540px, 960px) rotate(${c.r * Math.min(1, depth)}deg) scale(${s}) translate(${-c.x * depth}px, ${-c.y * depth}px)`,
        transformOrigin: '0 0',
        mixBlendMode: blend,
        opacity,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** SVG canvas whose origin is the world origin of the enclosing Layer */
const W: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg width={1} height={1} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style }}>
    {children}
  </svg>
);

// =====================================================================
// environment
// =====================================================================

const Starfield: React.FC<{ seed: string; n: number; depth: number; spread?: number; size?: number; tint?: number }> = ({
  seed,
  n,
  depth,
  spread = 1,
  size = 1,
  tint = 0,
}) => {
  const f = useCurrentFrame();
  const stars = React.useMemo(
    () =>
      Array.from({ length: n }).map((_, i) => ({
        x: (random(`${seed}x${i}`) - 0.5) * 3200 * spread,
        y: (random(`${seed}y${i}`) - 0.5) * 4600 * spread,
        r: (0.6 + Math.pow(random(`${seed}r${i}`), 4) * 3.2) * size,
        ph: random(`${seed}p${i}`) * 6.28,
        sp: 0.03 + random(`${seed}s${i}`) * 0.08,
        hue: random(`${seed}h${i}`),
      })),
    [seed, n, spread, size],
  );
  return (
    <Layer depth={depth}>
      <W>
        <defs>
          <radialGradient id={`sg-${seed}`}>
            <stop offset="0" stopColor="#fff" stopOpacity={1} />
            <stop offset="0.25" stopColor="#dbe8ff" stopOpacity={0.55} />
            <stop offset="1" stopColor="#9fb8ff" stopOpacity={0} />
          </radialGradient>
        </defs>
        {stars.map((s, i) => {
          const tw = 0.55 + 0.45 * Math.sin(f * s.sp + s.ph);
          const col = s.hue < 0.2 + tint ? '#ffd9b0' : s.hue > 0.8 ? '#b9ccff' : '#ffffff';
          return (
            <g key={i} opacity={tw}>
              <circle cx={s.x} cy={s.y} r={s.r * 4} fill={`url(#sg-${seed})`} />
              <circle cx={s.x} cy={s.y} r={s.r * 0.7} fill={col} />
              {s.r > 2.6 * size && (
                <g stroke={col} strokeWidth={1.2} opacity={0.7 * tw}>
                  <line x1={s.x - s.r * 9} y1={s.y} x2={s.x + s.r * 9} y2={s.y} />
                  <line x1={s.x} y1={s.y - s.r * 9} x2={s.x} y2={s.y + s.r * 9} />
                </g>
              )}
            </g>
          );
        })}
      </W>
    </Layer>
  );
};

const Nebula: React.FC<{ src: string; depth: number; opacity: number; scale?: number; drift?: number; hue?: number; bright?: number }> = ({
  src,
  depth,
  opacity,
  scale = 1.3,
  drift = 0.15,
  hue = 0,
  bright = 1,
}) => {
  const f = useCurrentFrame();
  const w = 1600 * scale;
  const h = 2840 * scale;
  return (
    <Layer depth={depth} blend="screen" opacity={opacity}>
      <Img
        src={staticFile(`star/${src}.jpg`)}
        style={{
          position: 'absolute',
          left: -w / 2 + Math.sin(f / 300) * 40 * drift * 10,
          top: -h / 2 - f * drift,
          width: w,
          height: h,
          filter: `hue-rotate(${hue}deg) brightness(${bright}) saturate(1.15)`,
        }}
      />
    </Layer>
  );
};

/** Bokeh dust drifting in front of the camera (depth of field) */
const Dust: React.FC<{ seed: string; n: number; color?: string; depth?: number; size?: number; opacity?: number }> = ({
  seed,
  n,
  color = '#cfe0ff',
  depth = 1.6,
  size = 1,
  opacity = 1,
}) => {
  const f = useCurrentFrame();
  return (
    <Layer depth={depth} blend="screen" opacity={opacity}>
      <W>
        <defs>
          <radialGradient id={`dg-${seed}`}>
            <stop offset="0" stopColor={color} stopOpacity={0.55} />
            <stop offset="0.6" stopColor={color} stopOpacity={0.18} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </radialGradient>
        </defs>
        {Array.from({ length: n }).map((_, i) => {
          const x0 = (random(`${seed}a${i}`) - 0.5) * 1800;
          const y0 = (random(`${seed}b${i}`) - 0.5) * 2600;
          const sp = 0.2 + random(`${seed}c${i}`) * 0.6;
          const r = (6 + random(`${seed}d${i}`) * 30) * size;
          const x = x0 + Math.sin(f / 90 + i) * 30;
          const y = ((y0 - f * sp + 1300) % 2600 + 2600) % 2600 - 1300;
          return <circle key={i} cx={x} cy={y} r={r} fill={`url(#dg-${seed})`} opacity={0.4 + 0.6 * Math.abs(Math.sin(f / 60 + i))} />;
        })}
      </W>
    </Layer>
  );
};

/** Soft volumetric light rays radiating from a point (world coords) */
const Rays: React.FC<{ x?: number; y?: number; color: string; n?: number; len?: number; opacity?: number; speed?: number; width?: number; seed?: string }> = ({
  x = 0,
  y = 0,
  color,
  n = 14,
  len = 1600,
  opacity = 0.5,
  speed = 0.08,
  width = 0.09,
  seed = 'r',
}) => {
  const f = useCurrentFrame();
  const id = `ray-${seed}`;
  return (
    <W>
      <defs>
        <radialGradient id={id} cx={0} cy={0} r={len} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color} stopOpacity={0.9} />
          <stop offset="0.35" stopColor={color} stopOpacity={0.25} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={`translate(${x} ${y}) rotate(${f * speed})`} style={{ mixBlendMode: 'screen' }} opacity={opacity}>
        {Array.from({ length: n }).map((_, i) => {
          const a = (i / n) * Math.PI * 2 + random(`${seed}${i}`) * 0.4;
          const w = width * (0.4 + random(`${seed}w${i}`)) * (0.75 + 0.25 * Math.sin(f / 40 + i));
          const l = len * (0.6 + random(`${seed}l${i}`) * 0.4);
          const p1 = [Math.cos(a - w) * l, Math.sin(a - w) * l];
          const p2 = [Math.cos(a + w) * l, Math.sin(a + w) * l];
          return <path key={i} d={`M0 0 L${p1[0]} ${p1[1]} L${p2[0]} ${p2[1]} Z`} fill={`url(#${id})`} />;
        })}
      </g>
    </W>
  );
};

const Glow: React.FC<{ x?: number; y?: number; r: number; color: string; opacity?: number; id: string }> = ({ x = 0, y = 0, r, color, opacity = 1, id }) => (
  <W>
    <defs>
      <radialGradient id={id}>
        <stop offset="0" stopColor={color} stopOpacity={1} />
        <stop offset="0.25" stopColor={color} stopOpacity={0.45} />
        <stop offset="0.6" stopColor={color} stopOpacity={0.12} />
        <stop offset="1" stopColor={color} stopOpacity={0} />
      </radialGradient>
    </defs>
    <circle cx={x} cy={y} r={r} fill={`url(#${id})`} opacity={opacity} style={{ mixBlendMode: 'screen' }} />
  </W>
);

// =====================================================================
// the main character: "Stella" the star
// =====================================================================

type Mood = 'sleep' | 'open' | 'happy' | 'tired' | 'shock' | 'wonder';
type Pal = { core: string; mid: string; edge: string; glow: string };

const PAL = {
  proto: { core: '#ffb27a', mid: '#e0573a', edge: '#5a1628', glow: '#ff6a4d' },
  main: { core: '#fffbe8', mid: '#ffd36b', edge: '#f08a24', glow: '#ffcf6e' },
  giant: { core: '#ffc08a', mid: '#f0582c', edge: '#7a1410', glow: '#ff5a2e' },
  hot: { core: '#ffffff', mid: '#cfe6ff', edge: '#6aa8ff', glow: '#bcd9ff' },
};
const mixPal = (a: Pal, b: Pal, t: number): Pal => ({
  core: interpolateColors(t, [0, 1], [a.core, b.core]),
  mid: interpolateColors(t, [0, 1], [a.mid, b.mid]),
  edge: interpolateColors(t, [0, 1], [a.edge, b.edge]),
  glow: interpolateColors(t, [0, 1], [a.glow, b.glow]),
});

const Stella: React.FC<{
  id: string;
  r: number;
  pal: Pal;
  mood: Mood;
  glow?: number;
  look?: [number, number];
  squash?: number;
  face?: number;
  rays?: number;
}> = ({ id, r, pal, mood, glow = 1, look = [0, 0], squash = 0, face = 1, rays = 1 }) => {
  const f = useCurrentFrame();
  const pulse = 1 + 0.012 * Math.sin(f / 14) + 0.006 * Math.sin(f / 5.3);
  const R = r * pulse;
  // blink every ~3.5s, 6 frames
  const bt = (f + id.length * 37) % 105;
  const blink = bt < 6 ? Math.sin((bt / 6) * Math.PI) : 0;
  const ex = R * 0.31;
  const ey = -R * 0.04;
  const erx = R * 0.135;
  const ery = R * 0.175;
  const lid = mood === 'sleep' ? 1 : mood === 'tired' ? Math.max(0.5, blink) : mood === 'shock' || mood === 'wonder' ? blink * 0.6 : blink;
  const big = mood === 'shock' ? 1.18 : mood === 'wonder' ? 1.1 : 1;
  const pr = erx * 0.62 * (mood === 'shock' ? 0.7 : 1);
  const lx = look[0] * erx * 0.35;
  const ly = look[1] * ery * 0.3;

  const eye = (side: number) => {
    const cx = side * ex;
    return (
      <g key={side}>
        <ellipse cx={cx} cy={ey + R * 0.03} rx={erx * big * 1.15} ry={ery * big * 1.1} fill={pal.edge} opacity={0.28} />
        <clipPath id={`${id}-eye${side}`}>
          <ellipse cx={cx} cy={ey} rx={erx * big} ry={ery * big} />
        </clipPath>
        <g clipPath={`url(#${id}-eye${side})`}>
          <ellipse cx={cx} cy={ey} rx={erx * big} ry={ery * big} fill="#fffaf2" />
          <circle cx={cx + lx} cy={ey + ly + ery * 0.12} r={pr} fill={`url(#${id}-iris)`} />
          <circle cx={cx + lx} cy={ey + ly + ery * 0.12} r={pr * 0.55} fill="#160904" />
          <circle cx={cx + lx - pr * 0.38} cy={ey + ly - pr * 0.25} r={pr * 0.34} fill="#fff" />
          <circle cx={cx + lx + pr * 0.35} cy={ey + ly + pr * 0.4} r={pr * 0.14} fill="#fff" opacity={0.85} />
          {/* eyelid */}
          <rect x={cx - erx * 1.4} y={ey - ery * big * 1.05} width={erx * 2.8} height={ery * big * 2.1 * lid} fill={pal.mid} />
          {lid > 0.02 && (
            <ellipse cx={cx} cy={ey - ery * big * 1.05 + ery * big * 2.1 * lid} rx={erx * 1.2} ry={R * 0.012} fill="#3a1206" opacity={0.6} />
          )}
        </g>
        {mood === 'sleep' && (
          <path d={`M${cx - erx} ${ey} Q${cx} ${ey + ery * 0.7} ${cx + erx} ${ey}`} stroke="#3a1206" strokeWidth={R * 0.022} fill="none" strokeLinecap="round" />
        )}
      </g>
    );
  };

  const my = R * 0.3;
  const mouth = () => {
    switch (mood) {
      case 'happy':
        return (
          <path
            d={`M${-R * 0.16} ${my - R * 0.02} Q0 ${my + R * 0.16} ${R * 0.16} ${my - R * 0.02} Q0 ${my + R * 0.06} ${-R * 0.16} ${my - R * 0.02}Z`}
            fill="#5a160a"
            stroke="#3a0d05"
            strokeWidth={R * 0.012}
          />
        );
      case 'shock':
        return <ellipse cx={0} cy={my + R * 0.03} rx={R * 0.07} ry={R * 0.1} fill="#4a1208" />;
      case 'wonder':
        return <ellipse cx={0} cy={my + R * 0.02} rx={R * 0.05} ry={R * 0.06} fill="#4a1208" />;
      case 'tired':
        return <path d={`M${-R * 0.1} ${my + R * 0.03} Q0 ${my - R * 0.02} ${R * 0.1} ${my + R * 0.03}`} stroke="#3a0d05" strokeWidth={R * 0.022} fill="none" strokeLinecap="round" />;
      case 'sleep':
        return <ellipse cx={0} cy={my} rx={R * 0.035} ry={R * 0.025} fill="#4a1208" opacity={0.8} />;
      default:
        return <path d={`M${-R * 0.12} ${my} Q0 ${my + R * 0.09} ${R * 0.12} ${my}`} stroke="#3a0d05" strokeWidth={R * 0.024} fill="none" strokeLinecap="round" />;
    }
  };

  return (
    <W>
      <defs>
        <radialGradient id={`${id}-surf`} cx="0.42" cy="0.38" r="0.62">
          <stop offset="0" stopColor={pal.core} />
          <stop offset="0.55" stopColor={pal.mid} />
          <stop offset="1" stopColor={pal.edge} />
        </radialGradient>
        <radialGradient id={`${id}-limb`}>
          <stop offset="0.62" stopColor={pal.edge} stopOpacity={0} />
          <stop offset="1" stopColor={pal.edge} stopOpacity={0.85} />
        </radialGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0.3" stopColor={pal.glow} stopOpacity={0.85} />
          <stop offset="0.42" stopColor={pal.glow} stopOpacity={0.35} />
          <stop offset="0.7" stopColor={pal.glow} stopOpacity={0.08} />
          <stop offset="1" stopColor={pal.glow} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-iris`} cx="0.4" cy="0.35">
          <stop offset="0" stopColor="#c8742e" />
          <stop offset="1" stopColor="#5a2a0c" />
        </radialGradient>
        <radialGradient id={`${id}-cheek`}>
          <stop offset="0" stopColor="#ff5f7a" stopOpacity={0.55} />
          <stop offset="1" stopColor="#ff5f7a" stopOpacity={0} />
        </radialGradient>
        <filter id={`${id}-gran`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency={0.9 / Math.max(40, R) * 6} numOctaves={3} seed={4} />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.9  0 0 0 0 0.6  1.6 0 0 0 -0.55" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <circle r={R} />
        </clipPath>
        <radialGradient id={`${id}-key`} cx="0.3" cy="0.25" r="0.55">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.38} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-shade`} cx="0.7" cy="0.85" r="0.75">
          <stop offset="0" stopColor={pal.edge} stopOpacity={0.45} />
          <stop offset="1" stopColor={pal.edge} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={`scale(${1 + squash} ${1 - squash})`}>
        {/* halo / corona */}
        <circle r={R * 3.1 * glow} fill={`url(#${id}-halo)`} style={{ mixBlendMode: 'screen' }} />
        {rays > 0 && (
          <g opacity={0.35 * rays} style={{ mixBlendMode: 'screen' }} transform={`rotate(${f * 0.15})`}>
            {Array.from({ length: 16 }).map((_, i) => {
              const a = (i / 16) * 360;
              const l = R * (1.7 + 0.5 * Math.sin(f / 23 + i * 1.7));
              return <path key={i} d={`M${-R * 0.12} 0 L0 ${-l} L${R * 0.12} 0Z`} fill={pal.glow} transform={`rotate(${a})`} opacity={0.5} />;
            })}
          </g>
        )}
        {/* prominences */}
        {[0, 1, 2].map((k) => {
          const a = (k * 127 + f * 0.05) * (Math.PI / 180) + k;
          const h = R * (0.18 + 0.1 * Math.sin(f / 30 + k * 2));
          const p0 = [Math.cos(a - 0.15) * R, Math.sin(a - 0.15) * R];
          const p1 = [Math.cos(a + 0.15) * R, Math.sin(a + 0.15) * R];
          const c = [Math.cos(a) * (R + h * 2), Math.sin(a) * (R + h * 2)];
          return (
            <path
              key={k}
              d={`M${p0[0]} ${p0[1]} Q${c[0]} ${c[1]} ${p1[0]} ${p1[1]}`}
              stroke={pal.mid}
              strokeWidth={R * 0.035}
              fill="none"
              opacity={0.75}
              strokeLinecap="round"
              style={{ mixBlendMode: 'screen' }}
            />
          );
        })}
        {/* body */}
        <circle r={R} fill={`url(#${id}-surf)`} />
        <g clipPath={`url(#${id}-clip)`}>
          <rect
            x={-R * 1.6}
            y={-R * 1.6}
            width={R * 3.2}
            height={R * 3.2}
            filter={`url(#${id}-gran)`}
            opacity={0.32}
            transform={`translate(${Math.sin(f / 70) * R * 0.15} ${Math.cos(f / 85) * R * 0.15}) rotate(${f * 0.04})`}
            style={{ mixBlendMode: 'overlay' }}
          />
          {/* soft shadow under the face plane + top-left key light */}
          <circle r={R} fill={`url(#${id}-shade)`} />
          <circle r={R} fill={`url(#${id}-key)`} style={{ mixBlendMode: 'screen' }} />
        </g>
        <circle r={R} fill={`url(#${id}-limb)`} />
        {/* face */}
        <g opacity={face}>
          <ellipse cx={-R * 0.48} cy={R * 0.2} rx={R * 0.13} ry={R * 0.08} fill={`url(#${id}-cheek)`} />
          <ellipse cx={R * 0.48} cy={R * 0.2} rx={R * 0.13} ry={R * 0.08} fill={`url(#${id}-cheek)`} />
          {eye(-1)}
          {eye(1)}
          {mood === 'tired' && (
            <g stroke="#3a1206" strokeWidth={R * 0.015} strokeLinecap="round" opacity={0.6}>
              <path d={`M${-ex - erx} ${ey + ery * 1.25} q${erx} ${R * 0.03} ${erx * 2} 0`} fill="none" />
              <path d={`M${ex - erx} ${ey + ery * 1.25} q${erx} ${R * 0.03} ${erx * 2} 0`} fill="none" />
            </g>
          )}
          {mouth()}
        </g>
      </g>
    </W>
  );
};

/** A planet lit by a light source at (lx, ly) in the same world coords */
const Planet: React.FC<{ id: string; x: number; y: number; r: number; color: string; dark: string; lx: number; ly: number; atm?: string; ring?: boolean; light?: number }> = ({
  id,
  x,
  y,
  r,
  color,
  dark,
  lx,
  ly,
  atm,
  ring,
  light = 1,
}) => {
  const a = Math.atan2(ly - y, lx - x);
  const hx = 0.5 + Math.cos(a) * 0.32;
  const hy = 0.5 + Math.sin(a) * 0.32;
  const deg = (a * 180) / Math.PI;
  return (
    <W>
      <defs>
        <radialGradient id={`${id}-p`} cx={hx} cy={hy} r="0.85">
          <stop offset="0" stopColor={color} />
          <stop offset="0.55" stopColor={interpolateColors(0.5, [0, 1], [color, dark])} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
        <linearGradient id={`${id}-term`} gradientTransform={`rotate(${deg} 0.5 0.5)`}>
          <stop offset="0" stopColor="#000" stopOpacity={0.85} />
          <stop offset="0.48" stopColor="#000" stopOpacity={0.55} />
          <stop offset="0.62" stopColor="#000" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={`${id}-atm`}>
          <stop offset="0.75" stopColor={atm ?? color} stopOpacity={0} />
          <stop offset="0.93" stopColor={atm ?? color} stopOpacity={0.7 * light} />
          <stop offset="1" stopColor={atm ?? color} stopOpacity={0} />
        </radialGradient>
      </defs>
      {ring && (
        <ellipse cx={x} cy={y} rx={r * 2.1} ry={r * 0.55} fill="none" stroke="#d8c9a0" strokeWidth={r * 0.22} opacity={0.55} transform={`rotate(-18 ${x} ${y})`} />
      )}
      {atm && <circle cx={x} cy={y} r={r * 1.12} fill={`url(#${id}-atm)`} opacity={0.6} style={{ mixBlendMode: 'screen' }} />}
      <circle cx={x} cy={y} r={r} fill={`url(#${id}-p)`} />
      <circle cx={x} cy={y} r={r} fill={`url(#${id}-term)`} opacity={0.9} />
      {ring && (
        <path
          d={`M${x - r * 2.1} ${y} A${r * 2.1} ${r * 0.55} 0 0 0 ${x + r * 2.1} ${y}`}
          fill="none"
          stroke="#e8dcb8"
          strokeWidth={r * 0.22}
          opacity={0.75}
          transform={`rotate(-18 ${x} ${y})`}
        />
      )}
    </W>
  );
};

// =====================================================================
// captions (word-synced) and title text
// =====================================================================

const chunks = (words: Word[]) => {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= 4 || /[.,!?…]$/.test(w.w)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out;
};

const ALL_CHUNKS = TL.scenes.flatMap((s) => chunks(s.words));

const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const idx = ALL_CHUNKS.findIndex((c, i) => {
    const next = ALL_CHUNKS[i + 1];
    const end = Math.min(next ? next[0].f : Infinity, c[c.length - 1].e + 12);
    return f >= c[0].f - 2 && f < end;
  });
  if (idx < 0) return null;
  const c = ALL_CHUNKS[idx];
  const age = f - (c[0].f - 2);
  const pop = interpolate(age, [0, 6], [0.85, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: 1290, display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0 18px',
          transform: `scale(${pop})`,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 900,
          fontSize: 68,
          lineHeight: 1.15,
          textTransform: 'uppercase',
          letterSpacing: -0.5,
        }}
      >
        {c.map((w, i) => {
          const active = f >= w.f && f < (c[i + 1]?.f ?? w.e + 12);
          return (
            <span
              key={i}
              style={{
                color: active ? '#ffd76a' : '#ffffff',
                textShadow: active
                  ? '0 0 24px rgba(255,190,80,0.9), 0 4px 0 rgba(0,0,0,0.6), 0 0 6px rgba(0,0,0,0.9)'
                  : '0 4px 0 rgba(0,0,0,0.6), 0 0 10px rgba(0,0,0,0.9)',
                transform: active ? 'translateY(-4px) scale(1.06)' : undefined,
                display: 'inline-block',
              }}
            >
              {w.w.replace(/[.,]$/, '')}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const Title: React.FC<{ text: string; sub?: string; at: number; top?: number; size?: number; out?: number }> = ({ text, sub, at, top = 520, size = 120, out = 99999 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [at, at + 20, out, out + 20], [0, 1, 1, 0], clamp);
  const sweep = interpolate(f, [at, at + 70], [-60, 160], clamp);
  const sp = interpolate(f, [at, at + 120], [24, 6], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, textAlign: 'center', opacity: o }}>
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 900,
          fontSize: size,
          letterSpacing: sp,
          lineHeight: 1,
          backgroundImage: `linear-gradient(100deg, #f6d9a8 0%, #ffffff ${sweep - 10}%, #fff7d6 ${sweep}%, #ffffff ${sweep + 10}%, #e9b56a 100%)`,
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          filter: 'drop-shadow(0 0 30px rgba(255,190,110,0.55)) drop-shadow(0 6px 10px rgba(0,0,0,0.8))',
        }}
      >
        {text}
      </div>
      {sub && (
        <div style={{ marginTop: 24, fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 40, letterSpacing: 10, color: '#cfe0ff', textShadow: '0 0 20px rgba(120,160,255,0.8)' }}>
          {sub}
        </div>
      )}
    </div>
  );
};

/** cinematic finishing: vignette + film grain + subtle grade */
const Grade: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 75% 60% at 50% 46%, rgba(0,0,0,0) 55%, rgba(0,0,8,0.55) 100%)' }} />
      <AbsoluteFill style={{ opacity: 0.06, mixBlendMode: 'overlay' }}>
        <svg width={1080} height={1920}>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={f % 30} />
          </filter>
          <rect width={1080} height={1920} filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
    </>
  );
};

// =====================================================================
// scenes. Each receives f = frame relative to its own start (negative while fading in)
// =====================================================================

type SceneProps = { f: number; len: number };

const SpaceBG: React.FC<{ cam: Cam; neb?: string; nebOpacity?: number; nebHue?: number; nebBright?: number; faint?: number; stars?: number }> = ({
  cam,
  neb = 'nebula_cool',
  nebOpacity = 0.7,
  nebHue = 0,
  nebBright = 1,
  faint = 0.8,
  stars = 1,
}) => (
  <CamCtx.Provider value={cam}>
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #0b1030 0%, #04050f 70%)' }} />
    <Nebula src="nebula_faint" depth={0.15} opacity={faint} scale={1.4} drift={0.05} />
    <Starfield seed="far" n={260} depth={0.2} size={0.7} />
    <Nebula src={neb} depth={0.35} opacity={nebOpacity} hue={nebHue} bright={nebBright} />
    <Starfield seed="mid" n={110 * stars} depth={0.5} />
  </CamCtx.Provider>
);

// ---- 1. hook: a spark of iron drifting out of a dying star ----
const HookScene: React.FC<SceneProps> = ({ f }) => {
  const cam = camAt(
    [
      [0, { x: 0, y: -60, z: 1.25, r: -3 }],
      [140, { x: 0, y: -20, z: 1.05, r: 1 }],
      [260, { x: 0, y: 0, z: 0.95, r: 2 }],
    ],
    f,
  );
  const sparkX = Math.sin(f / 40) * 40 - 60 + f * 0.25;
  const sparkY = 260 - f * 0.9;
  const dying = 1 + 0.04 * Math.sin(f / 8);
  return (
    <AbsoluteFill>
      <SpaceBG cam={cam} neb="nebula_remnant" nebOpacity={0.55} nebHue={-10} />
      <CamCtx.Provider value={cam}>
        <Layer depth={0.6}>
          <Glow id="h-dg" x={0} y={-520} r={900 * dying} color="#ff4a26" opacity={0.65} />
          <Stella id="h-star" r={220 * dying} pal={PAL.giant} mood="tired" glow={1.2} rays={0.6} face={0} />
          <Rays x={0} y={0} color="#ff7a40" opacity={0.35} len={1700} seed="hk" />
        </Layer>
        <Layer depth={1}>
          <W>
            <g transform={`translate(${sparkX} ${sparkY})`}>
              <Glow id="h-spark" r={180} color="#ffa34d" />
              <circle r={14} fill="#fff2d6" />
              <g opacity={lerp(f, 30, 60, 0, 1)}>
                <text x={36} y={-24} fill="#ffd9a6" fontFamily="Inter" fontWeight={800} fontSize={54}>
                  Fe
                </text>
                <text x={36} y={14} fill="#ffd9a6" opacity={0.8} fontFamily="Inter" fontWeight={500} fontSize={26}>
                  iron
                </text>
              </g>
            </g>
          </W>
        </Layer>
        <Dust seed="hd" n={26} color="#ffb48a" />
      </CamCtx.Provider>
      <Title text="LIFE OF A STAR" sub="FROM DUST TO DUST" at={8} top={300} size={112} out={scene('hook').len - 30} />
    </AbsoluteFill>
  );
};

// ---- 2. nebula: gravity gathers the gas ----
const NebulaScene: React.FC<SceneProps> = ({ f, len }) => {
  const cam = camAt(
    [
      [-20, { x: -260, y: 300, z: 0.9, r: -4 }],
      [len * 0.55, { x: -60, y: 60, z: 1.15, r: 0 }],
      [len + 20, { x: 0, y: 0, z: 1.8, r: 3 }],
    ],
    f,
  );
  const gather = lerp(f, 40, len, 0, 1, Easing.inOut(Easing.quad));
  return (
    <AbsoluteFill>
      <SpaceBG cam={cam} nebOpacity={0.95} nebBright={1.1} />
      <CamCtx.Provider value={cam}>
        <Layer depth={0.8} blend="screen">
          <W>
            <defs>
              <radialGradient id="n-clump">
                <stop offset="0" stopColor="#ffb6e6" stopOpacity={0.35} />
                <stop offset="1" stopColor="#7a5cff" stopOpacity={0} />
              </radialGradient>
            </defs>
            {Array.from({ length: 140 }).map((_, i) => {
              const r0 = 200 + random(`nr${i}`) * 900;
              const r = r0 * (1 - 0.8 * gather) + 20;
              const a = random(`na${i}`) * 6.28 + f * (0.004 + 0.02 * gather) * (1100 / r0);
              const s = 18 + random(`ns${i}`) * 50;
              return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r * 0.75} r={s * (1 - 0.4 * gather)} fill="url(#n-clump)" />;
            })}
          </W>
          <Glow id="n-core" r={160 + 380 * gather} color="#ff7a55" opacity={0.2 + 0.7 * gather} />
          <Glow id="n-core2" r={60 + 120 * gather} color="#ffd1a8" opacity={gather} />
        </Layer>
        <Starfield seed="near" n={40} depth={1.2} size={1.3} />
        <Dust seed="nd" n={34} color="#c7b5ff" size={1.3} />
      </CamCtx.Provider>
    </AbsoluteFill>
  );
};

// ---- 3. ignition: a star is born ----
const IgniteScene: React.FC<SceneProps> = ({ f, len }) => {
  const fuse = wordAt('ignite', 'fuse');
  const born = wordAt('ignite', 'born');
  const cam = camAt(
    [
      [-20, { x: 0, y: 0, z: 1.5, r: 3 }],
      [fuse - 10, { x: 0, y: 20, z: 1.85, r: 0 }],
      [fuse + 40, { x: 0, y: 0, z: 1.25, r: -2 }],
      [len + 20, { x: 0, y: 10, z: 1.35, r: -3 }],
    ],
    f,
  );
  const ig = lerp(f, fuse - 6, fuse + 30, 0, 1, Easing.out(Easing.cubic));
  const flash = interpolate(f, [fuse - 4, fuse + 2, fuse + 40], [0, 0.85, 0], clamp);
  const shock = lerp(f, fuse, fuse + 70, 0, 1, Easing.out(Easing.quad));
  const pal = mixPal(PAL.proto, PAL.main, ig);
  const mood: Mood = f < fuse + 8 ? 'sleep' : f < born ? 'wonder' : 'happy';
  const shake = f > fuse && f < fuse + 25 ? (random(`is${f}`) - 0.5) * 18 * (1 - (f - fuse) / 25) : 0;
  return (
    <AbsoluteFill>
      <SpaceBG cam={{ ...cam, x: cam.x + shake }} nebOpacity={0.6 + 0.5 * ig} nebBright={0.8 + 0.6 * ig} />
      <CamCtx.Provider value={{ ...cam, x: cam.x + shake, y: cam.y + shake * 0.6 }}>
        <Layer depth={1}>
          <Rays color={pal.glow} opacity={0.15 + 0.5 * ig} len={1500} n={18} seed="ig" />
          <Glow id="i-glow" r={700 + 400 * ig} color={pal.glow} opacity={0.45 + 0.4 * ig} />
          <W>
            <g opacity={f >= fuse ? 1 : 0}>
              <circle r={200 + shock * 1300} fill="none" stroke="#fff3d0" strokeWidth={40 * (1 - shock)} opacity={(1 - shock) * 0.8} style={{ mixBlendMode: 'screen' }} />
              <circle r={150 + shock * 900} fill="none" stroke="#9fd0ff" strokeWidth={18 * (1 - shock)} opacity={(1 - shock) * 0.6} style={{ mixBlendMode: 'screen' }} />
            </g>
          </W>
          <Stella id="stella-i" r={210} pal={pal} mood={mood} glow={0.8 + 0.4 * ig} rays={ig} />
        </Layer>
        <Dust seed="id" n={24} color="#ffd8b0" />
      </CamCtx.Provider>
      <AbsoluteFill style={{ background: '#fff6e0', opacity: flash, mixBlendMode: 'screen' }} />
    </AbsoluteFill>
  );
};

// ---- 4. main sequence: balance + planets form ----
const PLANETS = [
  { id: 'p1', d: 420, r: 26, c: '#d9b38c', k: '#2a1c12', sp: 0.012, ph: 0.6, atm: undefined },
  { id: 'p2', d: 620, r: 46, c: '#7fc4ff', k: '#0b1a3a', sp: 0.008, ph: 2.4, atm: '#8fd3ff' },
  { id: 'p3', d: 860, r: 34, c: '#ff8a5c', k: '#3a120a', sp: 0.006, ph: 4.2, atm: '#ffb08a' },
  { id: 'p4', d: 1150, r: 70, c: '#f2d39b', k: '#2c2210', sp: 0.0045, ph: 1.1, atm: '#ffe6b0', ring: true },
];

const MainScene: React.FC<SceneProps> = ({ f, len }) => {
  const planetsAt = wordAt('main', 'planets');
  const cam = camAt(
    [
      [-20, { x: 0, y: 0, z: 1.35, r: -3 }],
      [planetsAt - 30, { x: 0, y: 40, z: 1.05, r: 0 }],
      [len + 20, { x: 0, y: 120, z: 0.62, r: 6 }],
    ],
    f,
  );
  const balance = interpolate(f, [40, 70, planetsAt - 40, planetsAt - 10], [0, 1, 1, 0], clamp);
  const form = lerp(f, planetsAt - 20, planetsAt + 50, 0, 1);
  return (
    <AbsoluteFill>
      <SpaceBG cam={cam} nebOpacity={0.55} nebHue={20} />
      <CamCtx.Provider value={cam}>
        <Layer depth={1}>
          <W>
            {/* protoplanetary disk */}
            <g transform="scale(1 0.38)" opacity={0.25 + 0.35 * (1 - form)} style={{ mixBlendMode: 'screen' }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <circle key={i} r={380 + i * 130} fill="none" stroke="#ffcf8a" strokeWidth={50 - i * 4} opacity={0.12} strokeDasharray={`${120 + i * 30} ${60 + i * 10}`} strokeDashoffset={-f * (2 - i * 0.2)} />
              ))}
            </g>
            {PLANETS.map((p) => (
              <ellipse key={p.id} rx={p.d} ry={p.d * 0.38} fill="none" stroke="#9fb8ff" strokeOpacity={0.16 * form} strokeWidth={2} />
            ))}
          </W>
          <Rays color="#ffe2a0" opacity={0.35} len={1800} n={16} seed="ms" speed={0.05} />
          <Glow id="m-glow" r={1100} color="#ffcf6e" opacity={0.6} />
          {/* planets behind the star (upper half of the orbit) */}
          {PLANETS.map((p) => {
            const a = p.ph + f * p.sp;
            const x = Math.cos(a) * p.d;
            const y = Math.sin(a) * p.d * 0.38;
            if (y >= 0) return null;
            return (
              <g key={p.id} opacity={form}>
                <Planet id={p.id} x={x} y={y} r={p.r * (0.92 + 0.08 * Math.sin(a))} color={p.c} dark={p.k} lx={0} ly={0} atm={p.atm} ring={p.ring} />
              </g>
            );
          })}
          <Stella id="stella-m" r={200} pal={PAL.main} mood="happy" look={[Math.sin(f / 50) * 0.6, 0.1]} />
          {PLANETS.map((p) => {
            const a = p.ph + f * p.sp;
            const x = Math.cos(a) * p.d;
            const y = Math.sin(a) * p.d * 0.38;
            if (y < 0) return null;
            return (
              <g key={p.id} opacity={form}>
                <Planet id={p.id} x={x} y={y} r={p.r * (0.92 + 0.08 * Math.sin(a))} color={p.c} dark={p.k} lx={0} ly={0} atm={p.atm} ring={p.ring} />
              </g>
            );
          })}
          {/* gravity vs pressure */}
          <W>
            <g opacity={balance}>
              {Array.from({ length: 8 }).map((_, i) => {
                const a = (i / 8) * Math.PI * 2 + 0.2;
                const t = (f % 40) / 40;
                const rin = 420 - t * 120;
                const rout = 250 + t * 120;
                return (
                  <g key={i}>
                    <line x1={Math.cos(a) * (rin + 60)} y1={Math.sin(a) * (rin + 60)} x2={Math.cos(a) * rin} y2={Math.sin(a) * rin} stroke="#7fb2ff" strokeWidth={8} strokeLinecap="round" opacity={0.9 - t * 0.5} />
                    <line
                      x1={Math.cos(a + 0.39) * rout}
                      y1={Math.sin(a + 0.39) * rout}
                      x2={Math.cos(a + 0.39) * (rout + 60)}
                      y2={Math.sin(a + 0.39) * (rout + 60)}
                      stroke="#ffb35a"
                      strokeWidth={8}
                      strokeLinecap="round"
                      opacity={0.9 - t * 0.5}
                    />
                  </g>
                );
              })}
              <text x={0} y={-470} textAnchor="middle" fill="#9fc4ff" fontFamily="Inter" fontWeight={800} fontSize={38} letterSpacing={4}>
                GRAVITY ⟶ IN
              </text>
              <text x={0} y={510} textAnchor="middle" fill="#ffc27a" fontFamily="Inter" fontWeight={800} fontSize={38} letterSpacing={4}>
                FUSION ⟶ OUT
              </text>
            </g>
          </W>
        </Layer>
        <Dust seed="md" n={22} color="#ffe6b8" />
      </CamCtx.Provider>
    </AbsoluteFill>
  );
};

// ---- 5. red supergiant ----
const GiantScene: React.FC<SceneProps> = ({ f, len }) => {
  const runs = wordAt('giant', 'out');
  const swell = lerp(f, runs, len - 30, 0, 1, Easing.inOut(Easing.cubic));
  const cam = camAt(
    [
      [-20, { x: 0, y: 120, z: 0.75, r: 6 }],
      [runs, { x: 0, y: 60, z: 0.85, r: 2 }],
      [len + 20, { x: 0, y: -40, z: 0.42, r: -4 }],
    ],
    f,
  );
  const pal = mixPal(PAL.main, PAL.giant, Math.min(1, swell * 1.6));
  const r = 200 + 820 * swell;
  return (
    <AbsoluteFill>
      <SpaceBG cam={cam} neb="nebula_remnant" nebOpacity={0.25 + 0.35 * swell} nebHue={-20} nebBright={0.8} />
      <CamCtx.Provider value={cam}>
        <Layer depth={1}>
          <Glow id="g-glow" r={r * 3.2} color={pal.glow} opacity={0.55} />
          <Rays color={pal.glow} opacity={0.3} len={r * 4} n={14} seed="gs" speed={-0.04} />
          {PLANETS.map((p) => {
            const a = p.ph + (f + 330) * p.sp;
            const x = Math.cos(a) * p.d;
            const y = Math.sin(a) * p.d * 0.38;
            const swallowed = p.d * 0.9 < r;
            return (
              <g key={p.id} opacity={swallowed ? 0 : 1}>
                <Planet id={`g${p.id}`} x={x} y={y} r={p.r} color={interpolateColors(swell, [0, 1], [p.c, '#ff9a6a'])} dark={p.k} lx={0} ly={0} atm={p.atm} ring={p.ring} />
              </g>
            );
          })}
          <Stella id="stella-g" r={r} pal={pal} mood={swell > 0.15 ? 'tired' : 'open'} glow={1} look={[0, 0.2]} />
        </Layer>
        <Dust seed="gd" n={20} color="#ff9a70" />
      </CamCtx.Provider>
    </AbsoluteFill>
  );
};

// ---- 6. core collapse ----
const CollapseScene: React.FC<SceneProps> = ({ f, len }) => {
  const col = wordAt('collapse', 'collapses');
  const cam = camAt(
    [
      [-20, { x: 0, y: -40, z: 0.42, r: -4 }],
      [col - 10, { x: 0, y: 0, z: 0.7, r: -1 }],
      [len + 20, { x: 0, y: 0, z: 2.4, r: 8 }],
    ],
    f,
  );
  const rumble = lerp(f, 0, col, 0.2, 1) * (f < col + 20 ? 1 : 0);
  const sh = (random(`cs${f}`) - 0.5) * 22 * rumble;
  const implode = lerp(f, col, col + 18, 0, 1, Easing.in(Easing.cubic));
  const r = 1020 * (1 - implode * 0.97);
  const coreGlow = lerp(f, 0, col, 0.2, 1);
  return (
    <AbsoluteFill>
      <SpaceBG cam={{ ...cam, x: cam.x + sh }} neb="nebula_remnant" nebOpacity={0.5} nebHue={-20} nebBright={0.7} />
      <CamCtx.Provider value={{ ...cam, x: cam.x + sh, y: cam.y - sh }}>
        <Layer depth={1}>
          <Glow id="c-glow" r={r * 3} color="#ff5a2e" opacity={0.5 * (1 - implode)} />
          <Stella id="stella-c" r={r} pal={PAL.giant} mood={f > col - 40 ? 'shock' : 'tired'} squash={Math.sin(f / 2) * 0.01 * rumble} />
          <Glow id="c-core" r={260 * coreGlow + implode * 200} color="#dff0ff" opacity={0.25 + 0.75 * coreGlow} />
          <W>
            {implode > 0 &&
              Array.from({ length: 36 }).map((_, i) => {
                const a = (i / 36) * Math.PI * 2;
                const r0 = 1400 * (1 - implode) + 80;
                return (
                  <line key={i} x1={Math.cos(a) * (r0 + 500)} y1={Math.sin(a) * (r0 + 500)} x2={Math.cos(a) * r0} y2={Math.sin(a) * r0} stroke="#ffe0c0" strokeWidth={6} opacity={0.7 * (1 - implode * 0.5)} style={{ mixBlendMode: 'screen' }} />
                );
              })}
          </W>
        </Layer>
      </CamCtx.Provider>
    </AbsoluteFill>
  );
};

// ---- 7. supernova ----
const GALAXY = Array.from({ length: 1400 }).map((_, i) => {
  const arm = i % 2;
  const t = Math.pow(random(`gt${i}`), 0.7);
  const a = t * 7.5 + arm * Math.PI + (random(`gj${i}`) - 0.5) * 0.7;
  const rr = 40 + t * 520 + (random(`gr${i}`) - 0.5) * 50;
  return { x: Math.cos(a) * rr, y: Math.sin(a) * rr * 0.45, s: 1 + random(`gs${i}`) * 2.6, c: t < 0.25 ? '#ffe2b0' : random(`gc${i}`) > 0.5 ? '#b8ccff' : '#e6d9ff' };
});

const SupernovaScene: React.FC<SceneProps> = ({ f, len }) => {
  const outshine = wordAt('supernova', 'outshines');
  const galaxyAt = outshine - 30;
  const cam = camAt(
    [
      [-20, { x: 0, y: 0, z: 2.2, r: 8 }],
      [30, { x: 0, y: 0, z: 1.3, r: 2 }],
      [galaxyAt, { x: 0, y: 0, z: 0.7, r: -2 }],
      [len + 20, { x: 0, y: 0, z: 0.12, r: -10 }],
    ],
    f,
  );
  const flash = interpolate(f, [0, 3, 60], [1, 1, 0], clamp);
  const ex = lerp(f, 0, len, 0, 1, Easing.out(Easing.cubic));
  const shake = f < 45 ? (random(`ss${f}`) - 0.5) * 40 * (1 - f / 45) : 0;
  const gal = lerp(f, galaxyAt - 20, galaxyAt + 40, 0, 1);
  const c = { ...cam, x: cam.x + shake, y: cam.y + shake * 0.7 };
  return (
    <AbsoluteFill>
      <SpaceBG cam={c} neb="nebula_remnant" nebOpacity={0.4 + 0.5 * ex} nebBright={1.2} />
      <CamCtx.Provider value={c}>
        <Layer depth={0.9} opacity={gal}>
          <W>
            <defs>
              <radialGradient id="gal-core">
                <stop offset="0" stopColor="#fff1d0" stopOpacity={0.9} />
                <stop offset="1" stopColor="#fff1d0" stopOpacity={0} />
              </radialGradient>
            </defs>
            <g transform={`translate(1500 900) rotate(${-20 + f * 0.03})`} style={{ mixBlendMode: 'screen' }}>
              <ellipse rx={260} ry={130} fill="url(#gal-core)" />
              {GALAXY.map((s, i) => (
                <circle key={i} cx={s.x * 2.4} cy={s.y * 2.4} r={s.s * 2.2} fill={s.c} opacity={0.55} />
              ))}
            </g>
          </W>
        </Layer>
        <Layer depth={1}>
          <Rays color="#ffffff" opacity={0.6 * (1 - ex * 0.6)} len={2600} n={22} seed="sn" speed={0.12} width={0.06} />
          <Glow id="s-core" r={900 + ex * 1200} color="#ffffff" opacity={0.9 - ex * 0.3} />
          <Glow id="s-blue" r={500 + ex * 2200} color="#7fc0ff" opacity={0.5} />
          <W>
            {[0, 1, 2].map((k) => {
              const t = Math.min(1, ex * (1.3 - k * 0.2));
              return (
                <circle key={k} r={100 + t * (2600 - k * 500)} fill="none" stroke={['#ffffff', '#ffb36b', '#ff5a8a'][k]} strokeWidth={60 * (1 - t) + 6} opacity={(1 - t) * 0.85} style={{ mixBlendMode: 'screen' }} />
              );
            })}
            {Array.from({ length: 420 }).map((_, i) => {
              const a = random(`sa${i}`) * Math.PI * 2;
              const v = 0.4 + random(`sv${i}`) * 0.6;
              const d = 60 + ex * 3000 * v;
              const col = ['#ffffff', '#ffd27a', '#ff7a4a', '#ff4f8a', '#6fd3ff'][Math.floor(random(`sc${i}`) * 5)];
              return (
                <line
                  key={i}
                  x1={Math.cos(a) * d}
                  y1={Math.sin(a) * d}
                  x2={Math.cos(a) * (d - 60 * v * (1 - ex) - 8)}
                  y2={Math.sin(a) * (d - 60 * v * (1 - ex) - 8)}
                  stroke={col}
                  strokeWidth={3 + v * 5}
                  strokeLinecap="round"
                  opacity={1 - ex * 0.7}
                  style={{ mixBlendMode: 'screen' }}
                />
              );
            })}
          </W>
        </Layer>
        <Dust seed="sd" n={24} color="#ffd6c2" depth={1.8} />
      </CamCtx.Provider>
      <AbsoluteFill style={{ background: '#ffffff', opacity: flash }} />
    </AbsoluteFill>
  );
};

// ---- 8. black hole (Stella's eyes stay with her) ----
const BlackHole: React.FC<{ r: number; f: number; eyes: number }> = ({ r, f, eyes }) => {
  const disk = (front: boolean) => (
    <g transform="scale(1 0.28)">
      {Array.from({ length: 9 }).map((_, i) => {
        const rr = r * (1.6 + i * 0.32);
        const col = interpolateColors(i, [0, 4, 8], ['#fff4dc', '#ffb35a', '#c2361c']);
        return (
          <path
            key={i}
            d={front ? `M${-rr} 0 A${rr} ${rr} 0 0 0 ${rr} 0` : `M${-rr} 0 A${rr} ${rr} 0 0 1 ${rr} 0`}
            fill="none"
            stroke={col}
            strokeWidth={r * 0.36}
            opacity={0.42 - i * 0.035}
            style={{ mixBlendMode: 'screen' }}
          />
        );
      })}
      {Array.from({ length: 6 }).map((_, i) => {
        const rr = r * (1.7 + i * 0.45);
        return (
          <path
            key={`s${i}`}
            d={front ? `M${-rr} 0 A${rr} ${rr} 0 0 0 ${rr} 0` : `M${-rr} 0 A${rr} ${rr} 0 0 1 ${rr} 0`}
            fill="none"
            stroke="#fff1d6"
            strokeWidth={r * 0.05}
            strokeLinecap="round"
            strokeDasharray={`${rr * 0.25} ${rr * 0.55}`}
            strokeDashoffset={-f * (16 - i * 2)}
            opacity={0.35}
            style={{ mixBlendMode: 'screen' }}
          />
        );
      })}
    </g>
  );
  const bt = f % 120;
  const blink = bt < 6 ? Math.sin((bt / 6) * Math.PI) : 0;
  return (
    <W>
      <defs>
        <radialGradient id="bh-ring">
          <stop offset="0.82" stopColor="#ffd9a0" stopOpacity={0} />
          <stop offset="0.9" stopColor="#fff2d6" stopOpacity={1} />
          <stop offset="1" stopColor="#ff9a4a" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="bh-doppler" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.5} />
          <stop offset="1" stopColor="#000" stopOpacity={0.25} />
        </linearGradient>
      </defs>
      {disk(false)}
      {/* lensed far side of the disk arcing over the top */}
      <ellipse rx={r * 1.55} ry={r * 1.25} fill="none" stroke="#ffcf8a" strokeWidth={r * 0.18} opacity={0.5} style={{ mixBlendMode: 'screen' }} />
      <circle r={r * 1.18} fill="url(#bh-ring)" style={{ mixBlendMode: 'screen' }} />
      <circle r={r} fill="#000" />
      <g opacity={eyes}>
        {[-1, 1].map((s) => (
          <g key={s}>
            <ellipse cx={s * r * 0.32} cy={-r * 0.05} rx={r * 0.13} ry={r * 0.17 * (1 - blink)} fill="#cfe6ff" opacity={0.95} />
            <ellipse cx={s * r * 0.32} cy={-r * 0.05} rx={r * 0.22} ry={r * 0.26} fill="#7fb8ff" opacity={0.2} style={{ mixBlendMode: 'screen' }} />
          </g>
        ))}
        <path d={`M${-r * 0.1} ${r * 0.28} Q0 ${r * 0.36} ${r * 0.1} ${r * 0.28}`} stroke="#cfe6ff" strokeWidth={r * 0.025} fill="none" strokeLinecap="round" opacity={0.8} />
      </g>
      {disk(true)}
      <rect x={-r * 4.5} y={-r * 1.4} width={r * 9} height={r * 2.8} fill="url(#bh-doppler)" opacity={0.25} style={{ mixBlendMode: 'overlay' }} />
    </W>
  );
};

const RemnantScene: React.FC<SceneProps> = ({ f, len }) => {
  const bh = wordAt('remnant', 'black');
  const cam = camAt(
    [
      [-20, { x: 0, y: 0, z: 0.5, r: -8 }],
      [bh, { x: 0, y: 0, z: 1.1, r: -2 }],
      [len + 20, { x: 0, y: 0, z: 1.35, r: 4 }],
    ],
    f,
  );
  const form = lerp(f, 10, bh, 0, 1, Easing.inOut(Easing.cubic));
  return (
    <AbsoluteFill>
      <SpaceBG cam={cam} neb="nebula_remnant" nebOpacity={0.75} nebBright={0.9} />
      <CamCtx.Provider value={cam}>
        <Layer depth={1}>
          <Glow id="r-glow" r={900} color="#ff9a4a" opacity={0.35 * form} />
          <W>
            {Array.from({ length: 90 }).map((_, i) => {
              const a = random(`ra${i}`) * 6.28 + f * 0.03 * (1 + random(`rs${i}`));
              const d = (1 - form) * (300 + random(`rd${i}`) * 700) + 150;
              return <circle key={i} cx={Math.cos(a) * d} cy={Math.sin(a) * d * 0.4} r={4 + random(`rr${i}`) * 6} fill="#ffcf9a" opacity={0.6 * (1 - form * 0.6)} style={{ mixBlendMode: 'screen' }} />;
            })}
            <g transform={`scale(${0.2 + 0.8 * form})`}>
              <BlackHole r={140} f={f} eyes={lerp(f, bh, bh + 20, 0, 1)} />
            </g>
          </W>
        </Layer>
        <Dust seed="rd" n={22} color="#ffc69a" />
      </CamCtx.Provider>
    </AbsoluteFill>
  );
};

// ---- 9. legacy: ashes become new stars, planets... and you ----
const ELEMENTS = [
  { s: 'C', n: 'carbon', c: '#9fd0ff' },
  { s: 'O', n: 'oxygen', c: '#8fffd0' },
  { s: 'Fe', n: 'iron', c: '#ffb36b' },
];

const LegacyScene: React.FC<SceneProps> = ({ f, len }) => {
  const carbon = wordAt('legacy', 'carbon');
  const newStars = wordAt('legacy', 'stars', 1);
  const planets = wordAt('legacy', 'planets');
  const you = wordAt('legacy', 'you');
  const cam = camAt(
    [
      [-20, { x: 0, y: 0, z: 1.2, r: 4 }],
      [newStars - 10, { x: 0, y: -80, z: 0.85, r: 0 }],
      [planets, { x: 160, y: 280, z: 1.05, r: -2 }],
      [you, { x: 220, y: 380, z: 2.3, r: -4 }],
      [len + 20, { x: 220, y: 380, z: 2.6, r: -5 }],
    ],
    f,
  );
  const babies = lerp(f, newStars - 15, newStars + 30, 0, 1);
  const earth = lerp(f, planets - 15, planets + 30, 0, 1);
  const end = lerp(f, you + 30, you + 70, 0, 1);
  return (
    <AbsoluteFill>
      <SpaceBG cam={cam} neb="nebula_remnant" nebOpacity={0.85} nebHue={40} />
      <CamCtx.Provider value={cam}>
        <Layer depth={1}>
          <W>
            {ELEMENTS.map((e, k) => {
              const show = lerp(f, carbon + k * 12, carbon + k * 12 + 15, 0, 1);
              const x = -260 + k * 260 + Math.sin(f / 50 + k) * 30;
              const y = -420 + Math.cos(f / 60 + k) * 20 - f * 0.15;
              return (
                <g key={e.s} opacity={show * (1 - babies * 0.9)} transform={`translate(${x} ${y})`}>
                  <circle r={70} fill={e.c} opacity={0.15} style={{ mixBlendMode: 'screen' }} />
                  <circle r={44} fill="none" stroke={e.c} strokeWidth={4} />
                  <text y={16} textAnchor="middle" fill="#fff" fontFamily="Inter" fontWeight={900} fontSize={44}>
                    {e.s}
                  </text>
                  <text y={92} textAnchor="middle" fill={e.c} fontFamily="Inter" fontWeight={700} fontSize={28}>
                    {e.n}
                  </text>
                </g>
              );
            })}
          </W>
          {[
            [-300, -260, 60],
            [260, -420, 46],
            [-60, -620, 38],
          ].map(([x, y, r], i) => (
            <div key={i} style={{ position: 'absolute', transform: `translate(${x}px, ${y}px) scale(${babies})` }}>
              <Stella id={`baby${i}`} r={r} pal={i === 1 ? PAL.hot : PAL.main} mood="happy" glow={1.2} look={[0.3, 0.4]} />
            </div>
          ))}
          <div style={{ position: 'absolute', transform: `translate(220px, 380px) scale(${earth})` }}>
            <Planet id="earth" x={0} y={0} r={90} color="#5fb4ff" dark="#06142e" lx={-500} ly={-900} atm="#9fd8ff" />
            <W>
              <clipPath id="earth-c">
                <circle r={88} />
              </clipPath>
              <g opacity={0.55} clipPath="url(#earth-c)">
                <g transform={`translate(${-60 + ((f * 0.5) % 120)} 0)`}>
                  <ellipse cx={-30} cy={-30} rx={50} ry={22} fill="#5aa860" />
                  <ellipse cx={30} cy={30} rx={40} ry={26} fill="#4f9a56" />
                  <ellipse cx={-80} cy={20} rx={40} ry={10} fill="#fff" opacity={0.7} />
                  <ellipse cx={60} cy={-40} rx={50} ry={12} fill="#fff" opacity={0.7} />
                </g>
              </g>
            </W>
          </div>
          <Glow id="l-sun" x={-500} y={-900} r={500} color="#ffd38a" opacity={0.5} />
        </Layer>
        <Dust seed="ld" n={30} color="#ffd6a8" />
      </CamCtx.Provider>
      <AbsoluteFill style={{ background: '#03040c', opacity: end * 0.75 }} />
      <Title text="YOU ARE" sub="" at={you + 40} top={720} size={90} />
      <Title text="STARDUST" sub="SUBSCRIBE FOR MORE SPACE" at={you + 55} top={830} size={150} />
    </AbsoluteFill>
  );
};

// =====================================================================
// composition
// =====================================================================

const SCENES: Record<string, React.FC<SceneProps>> = {
  hook: HookScene,
  nebula: NebulaScene,
  ignite: IgniteScene,
  main: MainScene,
  giant: GiantScene,
  collapse: CollapseScene,
  supernova: SupernovaScene,
  remnant: RemnantScene,
  legacy: LegacyScene,
};

const Shell: React.FC<{ s: SceneT; first: boolean; last: boolean }> = ({ s, first, last }) => {
  const g = useCurrentFrame();
  const f = g - XF; // local frame relative to the scene start
  const Comp = SCENES[s.key];
  const fadeIn = first ? interpolate(f, [-XF, 0], [0, 1], clamp) : interpolate(f, [-XF, XF], [0, 1], { ...clamp, easing: ease });
  const push = first ? 1 : interpolate(f, [-XF, XF], [1.1, 1], { ...clamp, easing: ease });
  const pushOut = last ? 1 : interpolate(f, [s.len - XF, s.len + XF], [1, 1.06], { ...clamp, easing: ease });
  const blur = first ? 0 : interpolate(f, [-XF, XF], [8, 0], clamp);
  const endFade = last ? interpolate(f, [s.len - 25, s.len], [1, 0], clamp) : 1;
  return (
    <AbsoluteFill style={{ opacity: fadeIn * endFade, transform: `scale(${push * pushOut})`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
      <Comp f={f} len={s.len} />
    </AbsoluteFill>
  );
};

export const LifeOfAStar: React.FC = () => (
  <AbsoluteFill style={{ background: '#02030a' }}>
    {TL.scenes.map((s, i) => (
      <Sequence key={s.key} from={s.start - XF} durationInFrames={s.len + XF * 2}>
        <Shell s={s} first={i === 0} last={i === TL.scenes.length - 1} />
      </Sequence>
    ))}
    <Grade />
    <Captions />
    {TL.scenes.map((s) => (
      <Sequence key={`v-${s.key}`} from={s.voiceAt} layout="none">
        <Audio src={staticFile(`star/${s.key}.mp3`)} />
      </Sequence>
    ))}
    <Audio src={staticFile('star/score.wav')} volume={0.9} />
  </AbsoluteFill>
);
