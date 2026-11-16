/* Generic chapter engine for "COUNTRYBALLS: THE ISLAND OF ALL COUNTRIES" (chapters 2-9).
   A chapter is a timeline (beats with voice timing) + spec fields: set, tod, weather, act, screen, move. */
import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  interpolateColors,
  random,
  spring,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { BigText, Ball, Bubble, COMIC, CROWD_FLAGS, Eyes, FlagName, NarratorCaption, Pose, Word, clamp, easeIO } from './Cast';

const fh = delayRender('Bangers-engine');
const ff = new FontFace('Bangers', `url(${staticFile('fonts/Bangers-Regular.ttf')})`);
ff.load()
  .then(() => {
    document.fonts.add(ff);
    continueRender(fh);
  })
  .catch((e) => cancelRender(e));

// =====================================================================
// types / state
// =====================================================================

export type Beat = {
  i: number;
  act?: string;
  who?: string;
  text?: string;
  emo?: Eyes;
  pose?: Pose;
  set?: string;
  tod?: number;
  weather?: string;
  screen?: string;
  cam?: string;
  move?: Record<string, [number, number]>;
  start: number;
  len: number;
  audio?: string;
  voiceAt?: number;
  voiceEnd?: number;
  words?: Word[];
};
export type Timeline = { id: string; num: number; title: string; total: number; beats: Beat[] };
export type Spec = { id: string; num: number; title: string; next: string | null; places: Record<string, Record<string, number>> };

type St = { set: string; tod: number; weather: string; screen: string; prevSet: string; setStart: number };

const FLAG: Record<string, FlagName> = { usa: 'usa', rus: 'rus', chn: 'chn', jpn: 'jpn', kgz: 'kgz', ger: 'ger', fra: 'fra', uk: 'uk', ita: 'ita' };
const R = 86;
const GY = 880;

type Cam = { x: number; y: number; z: number };
const CamCtx = React.createContext<Cam>({ x: 1480, y: 560, z: 0.72 });

const Layer: React.FC<{ depth: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ depth, children, style }) => {
  const c = React.useContext(CamCtx);
  const s = Math.pow(c.z, depth);
  return (
    <AbsoluteFill style={{ transform: `translate(960px, 540px) scale(${s}) translate(${-c.x * depth}px, ${-c.y * depth}px)`, transformOrigin: '0 0', ...style }}>
      <svg width={1} height={1} style={{ position: 'absolute', overflow: 'visible' }}>
        {children}
      </svg>
    </AbsoluteFill>
  );
};
const toScreen = (c: Cam, x: number, y: number): [number, number] => [(x - c.x) * c.z + 960, (y - c.y) * c.z + 540];

// =====================================================================
// environment pieces
// =====================================================================

const todSky = (tod: number, storm: number) => {
  // 0 dawn, 1 day, 2 sunset, 3 night
  const tops = ['#5b6fb8', '#4fb3f0', '#3b3f8f', '#0b1030'];
  const mids = ['#ff9e7a', '#9fdcff', '#ff7a5c', '#1b2552'];
  const bots = ['#ffd59a', '#e8f7ff', '#ffc27a', '#2c3a6a'];
  const pick = (arr: string[]) => interpolateColors(tod, [0, 1, 2, 3], arr);
  return [pick(tops), pick(mids), pick(bots)].map((c) => interpolateColors(storm, [0, 1], [c, '#2a2838']));
};

const Sky: React.FC<{ tod: number; storm: number }> = ({ tod, storm }) => {
  const f = useCurrentFrame();
  const c = React.useContext(CamCtx);
  const [top, mid, bot] = todSky(tod, storm);
  const sunY = interpolate(tod, [0, 1, 2, 3], [430, 150, 420, 700], clamp);
  const sx = 1500 - c.x * 0.05;
  const night = interpolate(tod, [2, 3], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top} 0%, ${mid} 55%, ${bot} 100%)` }} />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        {night > 0 &&
          Array.from({ length: 90 }).map((_, i) => (
            <circle key={i} cx={random(`st${i}`) * 1920} cy={random(`su${i}`) * 520} r={1 + random(`sv${i}`) * 1.8} fill="#fff" opacity={night * (1 - storm) * (0.4 + 0.6 * Math.abs(Math.sin(f / 20 + i)))} />
          ))}
        {night > 0 && (
          <g opacity={night * (1 - storm * 0.8)}>
            <circle cx={420} cy={170} r={90} fill="#fff8d6" opacity={0.12} />
            <circle cx={420} cy={170} r={52} fill="#f4f0dc" />
            <circle cx={440} cy={160} r={46} fill={top} opacity={0.35} />
          </g>
        )}
        <circle cx={sx} cy={sunY} r={70} fill={interpolateColors(tod, [0, 1, 2], ['#ffcf8a', '#fff6d6', '#ff9a5a'])} opacity={(1 - night) * (1 - storm * 0.8)} />
        <circle cx={sx} cy={sunY} r={200} fill="#fff2c0" opacity={(1 - night) * (1 - storm) * 0.25} />
      </svg>
    </AbsoluteFill>
  );
};

const Clouds: React.FC<{ storm: number; tod: number }> = ({ storm, tod }) => {
  const f = useCurrentFrame();
  const night = interpolate(tod, [2, 3], [0, 1], clamp);
  const col = interpolateColors(storm, [0, 1], [interpolateColors(night, [0, 1], ['#ffffff', '#3a4570']), '#45404f']);
  return (
    <Layer depth={0.12}>
      {Array.from({ length: 7 }).map((_, i) => {
        const x = -900 + i * 520 + ((f * (0.3 + i * 0.05 + storm * 0.6)) % 600);
        const y = -330 + (i % 3) * 70;
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${0.8 + (i % 3) * 0.25 + storm * 0.6})`} opacity={0.88}>
            <ellipse rx={150} ry={50} fill={col} />
            <ellipse cx={-90} cy={15} rx={90} ry={40} fill={col} />
            <ellipse cx={95} cy={10} rx={110} ry={44} fill={col} />
            <ellipse cx={20} cy={-35} rx={90} ry={50} fill={col} />
          </g>
        );
      })}
    </Layer>
  );
};

const Sea: React.FC<{ tod: number; storm: number }> = ({ tod, storm }) => {
  const f = useCurrentFrame();
  const top = interpolateColors(storm, [0, 1], [interpolateColors(tod, [0, 1, 2, 3], ['#4a6fae', '#1f8fd6', '#5a4f8f', '#0e1f45']), '#1f2c40']);
  return (
    <Layer depth={0.35}>
      <defs>
        <linearGradient id="e-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={interpolateColors(tod, [0, 3], ['#0b4f8a', '#061530'])} />
        </linearGradient>
      </defs>
      <rect x={-2000} y={80} width={6000} height={900} fill="url(#e-sea)" />
      {Array.from({ length: 40 }).map((_, i) => {
        const x = -1500 + ((i * 173 + f * (1.2 + storm * 3)) % 5000);
        const y = 100 + (i % 8) * 22;
        return <line key={i} x1={x} y1={y} x2={x + 40 + (i % 4) * 20} y2={y} stroke="#e8f7ff" strokeWidth={3} opacity={(0.35 + 0.3 * Math.sin(f / 15 + i)) * interpolate(tod, [2, 3], [1, 0.4], clamp)} strokeLinecap="round" />;
      })}
    </Layer>
  );
};

const Headland: React.FC<{ tod: number; storm: number; light?: number }> = ({ tod, storm, light = 0 }) => {
  const f = useCurrentFrame();
  const g1 = interpolateColors(storm, [0, 1], [interpolateColors(tod, [0, 1, 2, 3], ['#3c6b4a', '#3f8f4f', '#4a5a3a', '#14261f']), '#22362b']);
  const g2 = interpolateColors(tod, [0, 1, 2, 3], ['#2f5a3c', '#2f7a42', '#3a4a30', '#0e1d18']);
  return (
    <Layer depth={0.55}>
      <g transform="translate(-700 250)">
        <path d="M200 -40 L520 -330 L600 -330 L940 -40Z" fill={interpolateColors(tod, [0, 1, 3], ['#6e5a62', '#7d6a64', '#2a2430'])} />
        {[0, 1, 2].map((k) => {
          const t = ((f + k * 60) % 180) / 180;
          return <circle key={k} cx={560 + t * 60} cy={-350 - t * 160} r={20 + t * 50} fill="#c9c2c6" opacity={(1 - t) * 0.45} />;
        })}
        <path d="M-1400 40 Q-900 -160 -300 -20 Q300 -200 760 -60 Q1100 20 1300 120 L1300 200 L-1400 200Z" fill={g1} />
        {Array.from({ length: 34 }).map((_, i) => {
          const x = -1300 + i * 62 + random(`tr${i}`) * 30;
          const y = -40 + Math.sin(i * 0.7) * 40 + random(`ty${i}`) * 30;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect x={-4} y={0} width={8} height={40} fill="#3a2a20" />
              <circle cx={0} cy={-6} r={30 + random(`tz${i}`) * 14} fill={i % 3 ? g2 : g1} />
            </g>
          );
        })}
        {light > 0 && (
          <g opacity={light * (0.55 + 0.45 * Math.abs(Math.sin(f / 7)))}>
            <circle cx={150} cy={-30} r={70} fill="#9fffd8" opacity={0.25} />
            <circle cx={150} cy={-30} r={14} fill="#eafff6" />
          </g>
        )}
      </g>
    </Layer>
  );
};

const Shore: React.FC = () => {
  const f = useCurrentFrame();
  const pts: string[] = [];
  for (let x = -1800; x <= 5200; x += 40) pts.push(`${x},${552 + Math.sin((x + f * 4) / 90) * 7}`);
  return (
    <Layer depth={0.85}>
      <rect x={-2000} y={540} width={7500} height={200} fill="#d9be86" />
      <path d={`M${pts.join('L')} L5200 500 L-1800 500Z`} fill="#6fc2e8" opacity={0.6} />
      <path d={`M${pts.join('L')}`} stroke="#fff" strokeWidth={6} fill="none" opacity={0.7} />
    </Layer>
  );
};

const Sand: React.FC<{ dark: number }> = ({ dark }) => (
  <Layer depth={1}>
    <defs>
      <linearGradient id="e-sand" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={interpolateColors(dark, [0, 1], ['#f0d49a', '#4a4560'])} />
        <stop offset="1" stopColor={interpolateColors(dark, [0, 1], ['#e3b96e', '#38334a'])} />
      </linearGradient>
    </defs>
    <rect x={-2500} y={670} width={8000} height={1200} fill="url(#e-sand)" />
    {Array.from({ length: 120 }).map((_, i) => (
      <ellipse key={i} cx={-1500 + random(`sd${i}`) * 6000} cy={700 + random(`se${i}`) * 500} rx={4 + random(`sf${i}`) * 8} ry={2} fill="#b98f4e" opacity={0.25 * (1 - dark)} />
    ))}
  </Layer>
);

/** the cliff from chapter 1 (sign stays red) with a cave mouth at its base */
const Cliff: React.FC<{ dark: number; days: string }> = ({ dark, days }) => (
  <Layer depth={1}>
    <path d="M3380 900 L3420 300 Q3460 120 3620 90 L4300 60 Q4520 80 4600 260 L4700 900Z" fill={interpolateColors(dark, [0, 1], ['#7d726d', '#2c2834'])} stroke="#111" strokeWidth={7} />
    <path d="M3470 900 Q3480 720 3580 700 Q3690 690 3700 900Z" fill="#0b0a10" stroke="#111" strokeWidth={6} />
    <g transform="translate(3990 300)" fontFamily={COMIC} textAnchor="middle" opacity={0.85}>
      <text fontSize={110} fill="#ff2a3a">
        YOU HAVE
      </text>
      <text y={140} fontSize={150} fill="#ff2a3a">
        {days}
      </text>
    </g>
  </Layer>
);

const Rain: React.FC<{ amt: number }> = ({ amt }) => {
  const f = useCurrentFrame();
  if (amt <= 0) return null;
  const flash = f % 97 < 3 || f % 151 < 2 ? 0.55 : 0;
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080}>
        {Array.from({ length: 220 }).map((_, i) => {
          const x = (random(`rx${i}`) * 2300 + f * 9) % 2300 - 200;
          const y = (random(`ry${i}`) * 1200 + f * 38) % 1200 - 60;
          return <line key={i} x1={x} y1={y} x2={x - 12} y2={y + 44} stroke="#cfe3ff" strokeWidth={2.5} opacity={0.5 * amt} />;
        })}
      </svg>
      <AbsoluteFill style={{ background: '#e8f0ff', opacity: flash * amt }} />
    </AbsoluteFill>
  );
};

// ----- forest -----
const ForestSet: React.FC<{ light: number; bunker: number }> = ({ light, bunker }) => {
  const f = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #071226 0%, #0d2233 60%, #10261e 100%)' }} />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <circle cx={1500} cy={140} r={50} fill="#f2efd8" opacity={0.9} />
        <circle cx={1500} cy={140} r={140} fill="#bcd6ff" opacity={0.08} />
      </svg>
      {[0.25, 0.5, 0.75].map((d, k) => (
        <Layer key={d} depth={d}>
          {Array.from({ length: 30 }).map((_, i) => {
            const x = -1200 + i * 190 + random(`fx${k}${i}`) * 80;
            const h = 500 + random(`fh${k}${i}`) * 300;
            const col = ['#0c1d22', '#10282a', '#143230'][k];
            const base = 700 - 300 * (1 - d) + 600 * d;
            return (
              <g key={i}>
                <rect x={x - 14 - k * 4} y={base - h} width={28 + k * 8} height={h} fill={col} />
                <circle cx={x} cy={base - h} r={110 + k * 30} fill={col} />
                <circle cx={x - 80} cy={base - h + 70} r={80 + k * 20} fill={col} />
                <circle cx={x + 80} cy={base - h + 60} r={90 + k * 20} fill={col} />
              </g>
            );
          })}
        </Layer>
      ))}
      {/* moonlight shafts */}
      <AbsoluteFill style={{ background: 'linear-gradient(115deg, rgba(180,210,255,0) 30%, rgba(180,210,255,0.08) 40%, rgba(180,210,255,0) 50%, rgba(180,210,255,0.06) 62%, rgba(180,210,255,0) 70%)' }} />
      <Layer depth={1}>
        <rect x={-2500} y={GY - 10} width={8000} height={1200} fill="#16281e" />
        <path d={`M-2500 ${GY - 10} ${Array.from({ length: 120 }).map((_, i) => `L${-2500 + i * 70} ${GY - 10 - (i % 2) * 18}`).join(' ')} L6000 ${GY - 10}Z`} fill="#1d3a26" />
        {/* the bunker */}
        <g opacity={bunker} transform="translate(2050 0)">
          <path d={`M-260 ${GY} L-220 ${GY - 260} L240 ${GY - 260} L280 ${GY}Z`} fill="#4a5050" stroke="#111" strokeWidth={6} />
          <rect x={-90} y={GY - 210} width={180} height={210} fill="#232a2a" stroke="#111" strokeWidth={6} />
          <rect x={-70} y={GY - 190} width={140} height={14} fill={`rgba(120,255,200,${0.4 + 0.4 * Math.abs(Math.sin(f / 9))})`} />
          {Array.from({ length: 9 }).map((_, i) => (
            <path key={i} d={`M${-250 + i * 60} ${GY - 260} q${10 + (i % 3) * 8} ${60 + (i % 4) * 30} ${-6} ${120 + (i % 3) * 40}`} stroke="#2f6a3a" strokeWidth={10} fill="none" strokeLinecap="round" />
          ))}
          <text x={0} y={GY - 225} textAnchor="middle" fontFamily="monospace" fontSize={26} fill="#9fb2b2">
            LAB-07
          </text>
        </g>
        {Array.from({ length: 24 }).map((_, i) => {
          const x = -400 + random(`ffx${i}`) * 3200 + Math.sin(f / 40 + i) * 40;
          const y = 400 + random(`ffy${i}`) * 450 + Math.cos(f / 33 + i) * 30;
          return <circle key={i} cx={x} cy={y} r={4} fill="#d8ff8a" opacity={(0.4 + 0.6 * Math.abs(Math.sin(f / 12 + i))) * light} />;
        })}
      </Layer>
    </>
  );
};

// ----- laboratory interior -----
const LabSet: React.FC<{ g: number; on: number; mapGlow: number; message: number; screen: number; dark: number; small?: string }> = ({ g, on, mapGlow, message, screen, dark, small }) => {
  const flick = 0.85 + 0.15 * Math.sin(g * 1.7) * Math.sin(g * 0.3);
  const lit = on * flick;
  const msg = 'THE ISLAND WAS BUILT TO TEST HUMANITY.';
  const shown = Math.floor(message * msg.length);
  return (
    <>
      <AbsoluteFill style={{ background: interpolateColors(lit, [0, 1], ['#05070a', '#24302f']) }} />
      <Layer depth={0.9}>
        {Array.from({ length: 14 }).map((_, i) => (
          <g key={i}>
            <rect x={-300 + i * 260} y={120} width={250} height={640} fill={interpolateColors(lit, [0, 1], ['#070a0c', '#34413f'])} stroke="#111" strokeWidth={4} />
            <rect x={-280 + i * 260} y={150} width={210} height={40} fill="#000" opacity={0.15} />
          </g>
        ))}
        <rect x={-600} y={70} width={4600} height={40} fill="#3c3c3c" />
        {[300, 1100, 1900, 2700].map((x, i) => (
          <g key={x}>
            <rect x={x - 70} y={110} width={140} height={14} fill={`rgba(220,255,240,${lit * (i === 2 ? 0.4 + 0.6 * (Math.sin(g / 3) > 0 ? 1 : 0.2) : 1)})`} />
            <path d={`M${x - 70} 124 L${x - 360} 900 L${x + 360} 900 L${x + 70} 124Z`} fill="#dffff2" opacity={0.05 * lit} />
          </g>
        ))}
        {/* island map on the wall */}
        <g transform="translate(1250 320)" opacity={0.3 + 0.7 * Math.max(lit, mapGlow)}>
          <rect x={-260} y={-190} width={520} height={360} fill="#d9cfae" stroke="#111" strokeWidth={6} />
          <path d="M-170 -10 Q-160 -120 -40 -130 Q90 -150 170 -70 Q230 -20 180 70 Q120 140 0 130 Q-120 130 -170 60Z" fill="#7fb36a" stroke="#3a5a30" strokeWidth={4} />
          <circle cx={40} cy={-40} r={34} fill="#8a7a6a" />
          <circle cx={40} cy={-40} r={12} fill="#c44a2a" />
          {[[-110, 20], [120, 40], [40, -40]].map(([x, y], i) => (
            <text key={i} x={x} y={y + 10} textAnchor="middle" fontFamily={COMIC} fontSize={34} fill="#b0201a">
              X
            </text>
          ))}
          <rect x={-260} y={-190} width={520} height={360} fill="#9fffe0" opacity={mapGlow * 0.25} />
        </g>
        {/* symbols */}
        {Array.from({ length: 10 }).map((_, i) => (
          <text key={i} x={600 + i * 120} y={660} fontFamily="monospace" fontSize={52} fill="#7ff5d4" opacity={0.25 + mapGlow * 0.75 * Math.abs(Math.sin(g / 10 + i))}>
            {'◇△⊕⌬⟁◈⌖⏃⎔⟟'[i]}
          </text>
        ))}
        {/* message on the wall */}
        {message > 0 && (
          <text x={1250} y={590} textAnchor="middle" fontFamily={COMIC} fontSize={64} fill="#9fffe0" style={{ filter: 'drop-shadow(0 0 12px #3fffc0)' }}>
            {msg.slice(0, shown)}
          </text>
        )}
        {/* old CRT */}
        <g transform="translate(2050 470)">
          <rect x={-190} y={-150} width={380} height={300} rx={24} fill="#3b3b36" stroke="#111" strokeWidth={6} />
          <rect x={-160} y={-120} width={320} height={230} rx={16} fill={screen > 0 ? '#0c1f18' : '#0a0c0b'} />
          {screen > 0 && (
            <g opacity={screen}>
              {Array.from({ length: 30 }).map((_, i) => (
                <rect key={i} x={-160} y={-120 + i * 8} width={320} height={3} fill="#5fffb0" opacity={random(`cr${g}${i}`) * 0.25} />
              ))}
              {small ? (
                <g fontFamily="monospace" fontWeight={700} textAnchor="middle" fill="#ff5a5a" opacity={0.75 + 0.25 * Math.sin(g / 4)}>
                  <text y={-30} fontSize={40}>PROJECT</text>
                  <text y={20} fontSize={40}>EARTH 2</text>
                  <text y={70} fontSize={30}>ACTIVATED</text>
                </g>
              ) : (
                <>
                  <circle cx={0} cy={-10} r={50} fill="#0c1f18" stroke="#7fffc8" strokeWidth={4} />
                  <circle cx={-18} cy={-18} r={9} fill="#d8fff0" />
                  <circle cx={18} cy={-18} r={9} fill="#d8fff0" />
                  <text x={0} y={95} textAnchor="middle" fontFamily="monospace" fontSize={22} fill="#7fffc8">
                    TRANSMISSION
                  </text>
                </>
              )}
            </g>
          )}
        </g>
        <rect x={-2500} y={760} width={8000} height={600} fill={interpolateColors(lit, [0, 1], ['#040506', '#1d2423'])} />
      </Layer>
      <AbsoluteFill style={{ background: '#000', opacity: dark }} />
    </>
  );
};

// ----- cave -----
const CaveSet: React.FC<{ g: number }> = ({ g }) => (
  <>
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 20%, #3a3040 0%, #120e16 60%, #050407 100%)' }} />
    <Layer depth={0.6}>
      {Array.from({ length: 26 }).map((_, i) => (
        <path key={i} d={`M${-600 + i * 180} -200 l40 ${160 + random(`ct${i}`) * 200} l40 ${-160 - random(`ct${i}`) * 200}Z`} fill="#241c28" />
      ))}
      {Array.from({ length: 8 }).map((_, i) => {
        const t = ((g + i * 13) % 50) / 50;
        return <circle key={`d${i}`} cx={-300 + i * 520} cy={-40 + t * 900} r={5} fill="#7fa7c9" opacity={1 - t} />;
      })}
    </Layer>
    <AbsoluteFill style={{ background: 'linear-gradient(160deg, rgba(255,220,160,0.18) 0%, rgba(255,220,160,0) 40%)' }} />
    <Layer depth={1}>
      <rect x={-2500} y={GY - 10} width={8000} height={1200} fill="#1c1720" />
      {Array.from({ length: 40 }).map((_, i) => (
        <ellipse key={i} cx={-1200 + i * 140} cy={GY + 20 + (i % 3) * 30} rx={40} ry={14} fill="#2a2230" />
      ))}
    </Layer>
  </>
);

// ----- underground city -----
const isTimer = (s: string) => /^\d\d:\d\d:\d\d$/.test(s);
const tickTimer = (s: string, secs: number) => {
  const [h, m, x] = s.split(':').map(Number);
  let t = Math.max(0, h * 3600 + m * 60 + x - secs);
  const hh = Math.floor(t / 3600);
  t -= hh * 3600;
  const mm = Math.floor(t / 60);
  const ss = t - mm * 60;
  return [hh, mm, ss].map((v) => String(v).padStart(2, '0')).join(':');
};

const CitySet: React.FC<{ g: number; screen: string; screenSince: number; alarm: number; hologram: number; keysFound: number; volcano: number; creator: number; stopped: boolean }> = ({
  g,
  screen,
  screenSince,
  alarm,
  hologram,
  keysFound,
  volcano,
  creator,
  stopped,
}) => {
  const txt = isTimer(screen) && !stopped ? tickTimer(screen, Math.floor((g - screenSince) / 30)) : screen;
  const red = alarm * (Math.sin(g / 5) > 0 ? 1 : 0.3);
  const scrCol = stopped ? '#7fffa0' : screen.includes('DISAPPEAR') || alarm > 0 ? '#ff4a4a' : '#7fe8ff';
  return (
    <>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 30%, #1d2a3a 0%, #0b0f18 60%, #05060a 100%)' }} />
      <Layer depth={0.3}>
        {Array.from({ length: 30 }).map((_, i) => (
          <path key={i} d={`M${-1200 + i * 160} -400 l50 ${120 + random(`cs${i}`) * 160} l50 ${-120 - random(`cs${i}`) * 160}Z`} fill="#121826" />
        ))}
      </Layer>
      <Layer depth={0.5}>
        {Array.from({ length: 22 }).map((_, i) => {
          const x = -600 + i * 190;
          const h = 300 + random(`bh${i}`) * 420;
          return (
            <g key={i}>
              <rect x={x} y={650 - h} width={150} height={h} fill="#1a2232" stroke="#0b0f18" strokeWidth={4} />
              {Array.from({ length: Math.floor(h / 60) }).map((__, k) =>
                [0, 1, 2].map((c) => (
                  <rect key={`${k}${c}`} x={x + 18 + c * 42} y={650 - h + 20 + k * 60} width={26} height={30} fill={random(`bw${i}${k}${c}`) > 0.8 ? '#ffd27a' : '#0e131d'} opacity={0.8} />
                )),
              )}
            </g>
          );
        })}
      </Layer>
      <Layer depth={0.85}>
        {/* world maps on panels */}
        {[-200, 3100].map((x) => (
          <g key={x} transform={`translate(${x} 260)`}>
            <rect x={-200} y={-120} width={400} height={240} fill="#0d1a24" stroke="#3a5a6a" strokeWidth={5} />
            {[[-120, -30, 60, 40], [-60, 40, 30, 50], [30, -40, 90, 45], [60, 40, 40, 30], [130, 60, 35, 25]].map(([cx, cy, rx, ry], i) => (
              <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill="#2f6a7a" opacity={0.8} />
            ))}
          </g>
        ))}
        {/* central screen */}
        <g transform="translate(1500 250)">
          <rect x={-560} y={-210} width={1120} height={420} rx={20} fill="#0a1018" stroke="#3a4a5a" strokeWidth={10} />
          <rect x={-530} y={-180} width={1060} height={360} rx={10} fill={interpolateColors(creator, [0, 1], ['#04121a', '#120410'])} />
          {creator > 0 ? (
            <g opacity={creator}>
              <circle cx={0} cy={20} r={150} fill="#000" />
              <circle cx={0} cy={20} r={170} fill="none" stroke="#ff3a6a" strokeWidth={4} opacity={0.4 + 0.3 * Math.sin(g / 6)} />
              <ellipse cx={-50} cy={0} rx={22} ry={30} fill="#ff6a8a" />
              <ellipse cx={50} cy={0} rx={22} ry={30} fill="#ff6a8a" />
              <text x={0} y={-130} textAnchor="middle" fontFamily="monospace" fontSize={30} fill="#ff6a8a">
                THE CREATOR
              </text>
            </g>
          ) : hologram > 0 ? (
            <g opacity={hologram}>
              <path d="M-300 0 Q-280 -150 -60 -160 Q170 -180 290 -70 Q360 10 280 100 Q160 170 0 160 Q-200 160 -300 60Z" fill="none" stroke="#7fe8ff" strokeWidth={5} />
              {[[-170, 50], [180, 60], [60, -60]].map(([x, y], i) => {
                const found = i < keysFound;
                const isVol = i === 2;
                const pulse = isVol ? volcano * (0.5 + 0.5 * Math.sin(g / 4)) : 0;
                return (
                  <g key={i} transform={`translate(${x} ${y})`}>
                    {isVol && <circle r={60} fill="#ff4a2a" opacity={pulse * 0.4} />}
                    <circle r={26} fill={found ? '#7fffa0' : isVol && volcano > 0 ? '#ff6a3a' : '#2a4a5a'} stroke="#cfffff" strokeWidth={3} />
                    <text y={60} textAnchor="middle" fontFamily={COMIC} fontSize={30} fill="#cfffff">
                      {`KEY ${i + 1}`}
                    </text>
                  </g>
                );
              })}
              {volcano > 0 && (
                <path d="M30 -110 L60 -60 L90 -110Z" fill="#ff6a3a" opacity={volcano} />
              )}
            </g>
          ) : (
            <text x={0} y={isTimer(txt) ? 50 : 30} textAnchor="middle" fontFamily={isTimer(txt) ? 'monospace' : COMIC} fontWeight={700} fontSize={isTimer(txt) ? 150 : 84} fill={scrCol} style={{ filter: `drop-shadow(0 0 18px ${scrCol})` }}>
              {txt}
            </text>
          )}
          {isTimer(screen) && creator === 0 && hologram === 0 && (
            <text x={0} y={-110} textAnchor="middle" fontFamily="monospace" fontSize={34} fill={scrCol} opacity={0.8}>
              {stopped ? 'COUNTDOWN STOPPED' : 'HOURS REMAINING'}
            </text>
          )}
        </g>
        {/* consoles */}
        {[400, 1100, 1900, 2600].map((x, i) => (
          <g key={x} transform={`translate(${x} 700)`}>
            <path d="M-150 0 L-120 -90 L120 -90 L150 0Z" fill="#26303e" stroke="#111" strokeWidth={5} />
            {Array.from({ length: 8 }).map((_, k) => (
              <circle key={k} cx={-90 + k * 26} cy={-50} r={7} fill={['#ff5a5a', '#7fffa0', '#ffd27a', '#7fe8ff'][(k + i) % 4]} opacity={Math.sin(g / (4 + k) + i) > 0 ? 1 : 0.25} />
            ))}
          </g>
        ))}
      </Layer>
      <Layer depth={1}>
        <rect x={-2500} y={GY - 20} width={8000} height={1200} fill="#141a24" />
        {Array.from({ length: 30 }).map((_, i) => (
          <line key={i} x1={-1000 + i * 200} y1={GY - 20} x2={-1300 + i * 260} y2={1500} stroke="#1e2634" strokeWidth={4} />
        ))}
      </Layer>
      <AbsoluteFill style={{ background: '#ff1a2a', opacity: red * 0.22, mixBlendMode: 'screen' }} />
    </>
  );
};

// ----- volcano -----
const VolcanoSet: React.FC<{ g: number; inner: number; erupt: number; lava: number; keyX: number }> = ({ g, inner, erupt, lava, keyX }) => (
  <>
    <AbsoluteFill style={{ background: interpolateColors(inner, [0, 1], ['#3a0f12', '#140608']) }} />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 110%, rgba(255,110,40,${0.55 + 0.15 * Math.sin(g / 5)}) 0%, rgba(255,60,20,0) 70%)` }} />
    <Layer depth={0.4}>
      {inner < 0.5 && (
        <>
          <path d="M600 600 L1500 -260 L1700 -260 L2600 600Z" fill="#2a1a1c" />
          <path d="M1500 -260 L1700 -260 L1650 -220 L1550 -220Z" fill="#ff6a2a" />
          {erupt > 0 &&
            Array.from({ length: 30 }).map((_, i) => {
              const t = ((g * 1.5 + i * 11) % 90) / 90;
              const a = -Math.PI / 2 + (random(`ea${i}`) - 0.5) * 1.4;
              return <circle key={i} cx={1600 + Math.cos(a) * t * 700} cy={-260 + Math.sin(a) * t * 700 + t * t * 500} r={14 * (1 - t) + 4} fill={t < 0.5 ? '#ffd27a' : '#ff5a2a'} opacity={erupt * (1 - t)} />;
            })}
        </>
      )}
    </Layer>
    <Layer depth={0.75}>
      {Array.from({ length: 48 }).map((_, i) => (
        <path key={i} d={`M${-900 + i * 230} 760 l80 ${-200 - random(`vr${i}`) * 300} l90 ${200 + random(`vr${i}`) * 300}Z`} fill="#1e1214" />
      ))}
    </Layer>
    <Layer depth={1}>
      <rect x={-2500} y={GY - 10} width={14000} height={1200} fill="#24161a" />
      <path d={`M-2500 ${GY + 120} ${Array.from({ length: 160 }).map((_, i) => `L${-2500 + i * 60} ${GY + 120 + Math.sin(i / 2 + g / 10) * 10}`).join(' ')} L7000 1500 L-2500 1500Z`} fill="#ff6a1a" />
      <rect x={7000} y={GY + 120} width={6000} height={600} fill="#ff6a1a" />
      <path d={`M-2500 ${GY + 140} ${Array.from({ length: 160 }).map((_, i) => `L${-2500 + i * 60} ${GY + 140 + Math.sin(i / 3 - g / 8) * 8}`).join(' ')} L7000 1500 L-2500 1500Z`} fill="#ffb03a" opacity={0.6} />
      {lava > 0 && <rect x={-2500} y={GY - 10} width={lava} height={140} fill="#ff4a1a" opacity={0.9} />}
      {Array.from({ length: 40 }).map((_, i) => {
        const t = ((g + i * 9) % 80) / 80;
        return <circle key={i} cx={-500 + random(`em${i}`) * 4500} cy={GY + 100 - t * 700} r={4} fill="#ffcf6a" opacity={1 - t} />;
      })}
      {inner > 0 && (
        <g opacity={inner} transform={`translate(${keyX} 0)`}>
          <rect x={-60} y={GY - 120} width={120} height={120} fill="#3a2a2c" stroke="#111" strokeWidth={5} />
          <circle cx={0} cy={GY - 200} r={140} fill="#ffe08a" opacity={0.25 + 0.1 * Math.sin(g / 5)} />
          <g transform={`translate(0 ${GY - 200 + Math.sin(g / 10) * 10}) rotate(${Math.sin(g / 20) * 10})`}>
            <circle cx={0} cy={-30} r={28} fill="none" stroke="#ffd04a" strokeWidth={14} />
            <rect x={-7} y={-4} width={14} height={80} fill="#ffd04a" />
            <rect x={0} y={40} width={26} height={12} fill="#ffd04a" />
            <rect x={0} y={60} width={20} height={12} fill="#ffd04a" />
          </g>
        </g>
      )}
    </Layer>
  </>
);

// ----- sky (ending) + home map -----
const SkySet: React.FC<{ g: number; t: number; fly: number }> = ({ g, t, fly }) => {
  const z = interpolate(t, [0, 1], [1.4, 0.5], { ...clamp, easing: easeIO });
  const isl = 'M-520 -40 Q-480 -330 -120 -360 Q260 -420 520 -220 Q700 -60 560 200 Q380 400 20 380 Q-360 380 -500 200 Z';
  return (
    <AbsoluteFill style={{ background: '#0a3d6b' }}>
      <AbsoluteFill style={{ transform: `translate(960px, 540px) scale(${z}) rotate(${t * 20}deg)`, transformOrigin: '0 0' }}>
        <svg width={1} height={1} style={{ position: 'absolute', overflow: 'visible' }}>
          <rect x={-4000} y={-4000} width={8000} height={8000} fill="#0d4a78" />
          <path d={isl} fill="#f0d49a" transform="scale(1.06)" />
          <path d={isl} fill="#3f8f4f" />
          <path d={isl} fill="#bfffe8" opacity={0.5 + 0.3 * Math.sin(g / 6)} />
          <circle r={700} fill="#dffff4" opacity={0.25} />
          {Array.from({ length: 16 }).map((_, i) => (
            <path key={i} d="M0 0 L-40 -1600 L40 -1600Z" fill="#eafff8" opacity={0.18} transform={`rotate(${i * 22.5 + g * 0.5})`} />
          ))}
          {Array.from({ length: 40 }).map((_, i) => {
            const a = (i / 40) * Math.PI * 2;
            const d = 300 + fly * (1500 + random(`fl${i}`) * 1500);
            const c = ['#d52b1e', '#ffffff', '#0039a6', '#ffce00', '#009246', '#de2910'][i % 6];
            return (
              <g key={i} opacity={fly > 0 ? 1 : 0}>
                <line x1={Math.cos(a) * (d - 220)} y1={Math.sin(a) * (d - 220)} x2={Math.cos(a) * d} y2={Math.sin(a) * d} stroke={c} strokeWidth={14} strokeLinecap="round" opacity={0.7} />
                <circle cx={Math.cos(a) * d} cy={Math.sin(a) * d} r={22} fill={c} stroke="#fff" strokeWidth={4} />
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const HomeSet: React.FC = () => (
  <>
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #1f6fb0 0%, #0f4a80 100%)' }} />
    <Layer depth={0.9}>
      {/* stylised continents */}
      <path d="M200 300 Q300 120 600 160 Q820 200 780 380 Q700 520 560 560 Q460 700 380 640 Q300 520 200 300Z" fill="#6aa65a" stroke="#2f5a30" strokeWidth={6} />
      <path d="M1000 180 Q1300 60 1800 120 Q2200 160 2300 320 Q2250 480 1950 520 Q1700 560 1550 480 Q1300 520 1150 420 Q980 320 1000 180Z" fill="#7ab060" stroke="#2f5a30" strokeWidth={6} />
      <path d="M1150 500 Q1250 480 1300 600 Q1300 800 1220 820 Q1140 760 1150 500Z" fill="#8ab868" stroke="#2f5a30" strokeWidth={6} />
      <path d="M700 620 Q780 640 760 820 Q700 900 660 820 Q640 700 700 620Z" fill="#7ab060" stroke="#2f5a30" strokeWidth={6} />
    </Layer>
  </>
);

// =====================================================================
// beach props for chapter 2 (ballot/door) and 3 (buildings / flood)
// =====================================================================

const Building: React.FC<{ x: number; w: number; h: number; col: string; seed: string; night: number }> = ({ x, w, h, col, seed, night }) => (
  <g>
    <rect x={x - w / 2} y={GY - h} width={w} height={h} fill={col} stroke="#111" strokeWidth={5} />
    {Array.from({ length: Math.max(1, Math.floor((h - 30) / 50)) }).map((_, r) =>
      Array.from({ length: Math.max(2, Math.floor(w / 40)) }).map((__, c) => (
        <rect key={`${r}${c}`} x={x - w / 2 + 12 + c * ((w - 16) / Math.max(2, Math.floor(w / 40)))} y={GY - h + 18 + r * 50} width={20} height={26} fill={night > 0.5 && random(`${seed}${r}${c}`) > 0.4 ? '#ffd76a' : '#b3e5fc'} />
      )),
    )}
  </g>
);

const BeachProps: React.FC<{ g: number; tl: Timeline; night: number; flood: number }> = ({ g, tl, night, flood }) => {
  const at = (act: string) => tl.beats.find((b) => b.act === act);
  const grow = (act: string) => {
    const b = at(act);
    if (!b) return 0;
    return spring({ frame: g - b.start - 10, fps: 30, config: { damping: 12 } });
  };
  const sink = (k: number) => interpolate(flood, [0, 1], [0, k]);
  const tilt = (k: number) => interpolate(flood, [0, 1], [0, k]);
  const usa = grow('build-usa');
  const chn = grow('build-chn');
  const ger = grow('build-ger');
  const kgz = grow('build-kgz');
  const fra = grow('build-fra');
  const rus = grow('build-rus');
  return (
    <Layer depth={0.95}>
      {fra > 0 && (
        <g transform={`translate(0 ${sink(260)}) rotate(${tilt(-14)} 640 ${GY})`} opacity={1}>
          <g transform={`translate(640 ${GY}) scale(1 ${fra}) translate(-640 ${-GY})`}>
            <rect x={520} y={GY - 200} width={240} height={200} fill="#f6e8d0" stroke="#111" strokeWidth={5} />
            <path d={`M500 ${GY - 200} L780 ${GY - 200} L760 ${GY - 250} L520 ${GY - 250}Z`} fill="#e04050" stroke="#111" strokeWidth={5} />
            {Array.from({ length: 7 }).map((_, i) => (
              <rect key={i} x={522 + i * 36} y={GY - 250} width={18} height={50} fill="#fff" opacity={0.85} />
            ))}
            <text x={640} y={GY - 120} textAnchor="middle" fontFamily={COMIC} fontSize={40} fill="#0055a4">
              CAFE
            </text>
          </g>
        </g>
      )}
      {usa > 0 && (
        <g transform={`translate(0 ${sink(500)}) rotate(${tilt(18)} 900 ${GY})`}>
          <g transform={`translate(900 ${GY}) scale(1 ${usa}) translate(-900 ${-GY})`}>
            <Building x={900} w={220} h={760} col="#8fa4b4" seed="u" night={night} />
          </g>
        </g>
      )}
      {rus > 0 && (
        <g transform={`translate(0 ${sink(140)})`}>
          <g transform={`translate(1180 ${GY}) scale(1 ${rus}) translate(-1180 ${-GY})`}>
            <rect x={1030} y={GY - 240} width={300} height={240} fill={interpolateColors(flood, [0, 1], ['#a8545a', '#6a3a40'])} stroke="#111" strokeWidth={5} />
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={i} x={1030 + i * 54} y={GY - 280} width={34} height={40} fill="#a8545a" stroke="#111" strokeWidth={4} />
            ))}
            <path d={`M1160 ${GY - 240} q20 -100 40 0`} fill="#4aa86a" stroke="#111" strokeWidth={4} />
          </g>
        </g>
      )}
      {chn > 0 && (
        <g transform={`translate(0 ${sink(420)}) rotate(${tilt(-8)} 1460 ${GY})`}>
          {[
            [1380, 70, 300, '#ef9a9a'],
            [1450, 70, 460, '#ffcc80'],
            [1520, 70, 360, '#a5d6a7'],
            [1590, 70, 240, '#90caf9'],
            [1330, 60, 200, '#ce93d8'],
          ].map(([x, w, h, c], i) => {
            const s = spring({ frame: g - (at('build-chn')?.start ?? 0) - 10 - i * 5, fps: 30, config: { damping: 9 } });
            return (
              <g key={i} transform={`translate(${x} ${GY}) scale(1 ${Math.max(0, s)}) translate(${-(x as number)} ${-GY})`}>
                <Building x={x as number} w={w as number} h={h as number} col={c as string} seed={`c${i}`} night={night} />
              </g>
            );
          })}
        </g>
      )}
      {ger > 0 && (
        <g transform={`translate(${flood * 400} ${sink(60)})`}>
          {Array.from({ length: 6 }).map((_, i) => {
            const x = 2180 + (i % 3) * 110;
            const y = GY - 40 - Math.floor(i / 3) * 70;
            const s = spring({ frame: g - (at('build-ger')?.start ?? 0) - 10 - i * 4, fps: 30, config: { damping: 10 } });
            return <path key={i} d={`M${x - 50} ${y} L${x} ${y - 90 * s} L${x + 50} ${y}Z`} fill="#6a8a4a" stroke="#111" strokeWidth={4} transform={`rotate(${flood * 25 * (i % 2 ? 1 : -1)} ${x} ${y})`} />;
          })}
        </g>
      )}
      {kgz > 0 && (
        <g transform={`translate(2650 ${GY}) scale(${kgz}) translate(-2650 ${-GY})`}>
          <rect x={2530} y={GY - 180} width={240} height={180} fill="#f5efe0" stroke="#111" strokeWidth={6} />
          <rect x={2530} y={GY - 150} width={240} height={28} fill="#c62828" />
          <path d={`M2510 ${GY - 180} Q2560 ${GY - 290} 2650 ${GY - 310} Q2740 ${GY - 290} 2790 ${GY - 180}Z`} fill="#fbf7ee" stroke="#111" strokeWidth={6} />
          {[-90, -45, 0, 45, 90].map((dx) => (
            <path key={dx} d={`M${2650 + dx * 1.4} ${GY - 180} Q${2650 + dx * 0.7} ${GY - 260} 2650 ${GY - 306}`} stroke="#c62828" strokeWidth={7} fill="none" />
          ))}
          <rect x={2615} y={GY - 110} width={70} height={110} rx={6} fill="#8e1b1b" stroke="#111" strokeWidth={5} />
          {flood > 0.5 && <circle cx={2650} cy={GY - 200} r={260} fill="#fff3c0" opacity={0.12 + 0.06 * Math.sin(g / 6)} />}
        </g>
      )}
    </Layer>
  );
};

// =====================================================================
// the chapter component
// =====================================================================

const DAYS: Record<number, string> = { 2: '30 DAYS', 3: '30 DAYS', 4: '29 DAYS', 5: '28 DAYS', 6: '27 DAYS', 7: '27 DAYS', 8: '27 DAYS', 9: '26 DAYS' };

export const makeChapter = (tl: Timeline, spec: Spec): React.FC => {
  const B = tl.beats;
  // persistent state per beat
  const states: St[] = [];
  let cur: St = { set: 'beach', tod: 1, weather: 'none', screen: '', prevSet: 'beach', setStart: 0 };
  for (const b of B) {
    const nb: St = { ...cur };
    if (b.set && b.set !== cur.set) {
      nb.prevSet = cur.set;
      nb.set = b.set;
      nb.setStart = b.start;
    }
    if (b.tod !== undefined) nb.tod = b.tod;
    if (b.weather) nb.weather = b.weather;
    if (b.screen) nb.screen = b.screen;
    states.push(nb);
    cur = nb;
  }
  const beatAt = (g: number) => B.find((b) => g >= b.start && g < b.start + b.len) ?? B[B.length - 1];
  const first = (act: string) => B.find((b) => b.act === act);
  const places = (set: string) => spec.places[set] ?? {};
  const screenSinceFor = (idx: number) => {
    let k = idx;
    while (k > 0 && B[k - 1].screen === undefined && !B[k].screen) k--;
    return B[k].start;
  };

  const groupCam = (set: string): { x: number; y: number; z: number } => {
    const xs = Object.values(places(set));
    if (!xs.length) return { x: 1480, y: 560, z: 0.8 };
    const mn = Math.min(...xs);
    const mx = Math.max(...xs);
    const z = Math.max(0.6, Math.min(1.15, 1700 / (mx - mn + 600)));
    return { x: (mn + mx) / 2, y: 620 - 80 / z, z };
  };

  // the group travels through the volcano: speed per beat between 'climb' and 'passage'
  const iClimb = B.findIndex((b) => b.act === 'climb');
  const iPass = B.findIndex((b) => b.act === 'passage');
  const speedOf = (b: Beat) => (b.act === 'run' ? 6 : b.act === 'climb' || b.act === 'erupt' ? 2 : 3);
  const volShift = (g: number) => {
    if (iClimb < 0) return 0;
    let sh = 0;
    for (let k = iClimb; k < (iPass < 0 ? B.length : iPass); k++) {
      const bb = B[k];
      if (g <= bb.start) break;
      sh += speedOf(bb) * Math.min(bb.len, g - bb.start);
    }
    return sh;
  };
  const VOL_END = iPass >= 0 ? volShift(B[iPass].start) : 0;
  const PASSAGE_X = 1450 + VOL_END + 700;
  const KEY_X = 1450 + VOL_END + 1100;
  const runningAt = (g: number) => {
    const bb = beatAt(g);
    return iClimb >= 0 && bb.i >= iClimb && bb.i < iPass;
  };

  const posOf = (who: string, set: string, g: number): number | undefined => {
    let x = places(set)[who];
    if (set === 'volcano' && x !== undefined) {
      x += volShift(g);
      if (iPass >= 0 && g >= B[iPass].start + 30) {
        // squeeze through the passage into the key chamber
        const kf = B.find((bb) => bb.act === 'key-found');
        const into = kf ? easeIO(Math.min(1, Math.max(0, (g - kf.start) / 50))) : 0;
        x = x + (KEY_X - 450 + (places(set)[who] - 1450) * 0.6 - x) * into;
      }
      return x;
    }
    for (const b of B) {
      if (b.move && b.move[who] && g >= b.start) {
        const [a, c] = b.move[who];
        x = g >= b.start + b.len ? c : a + (c - a) * easeIO((g - b.start) / b.len);
      }
    }
    return x;
  };

  const target = (b: Beat, g: number): Cam => {
    const st = states[b.i];
    const t = g - b.start;
    const grp = groupCam(st.set);
    const a = b.act ?? '';
    if (a === 'title' || a === 'recap' || a === 'next') return { ...grp, z: grp.z * 0.9 };
    if (a === 'door') return { x: 3050, y: 430, z: 1.0 };
    if (a === 'tally' || a === 'ballot') return { x: 1480, y: 560, z: 1.0 };
    if (a === 'flashback') return { x: 1600, y: 640, z: 1.45 };
    if (a === 'forest-light') return { x: -200, y: 420, z: 1.2 };
    if (a === 'lab-found') return { x: 2050, y: 620, z: 1.05 };
    if (a === 'map' || a === 'message') return { x: 1250, y: 520, z: 1.25 };
    if (a === 'screen-on' || a === 'screen-talk') return { x: 2050, y: 520, z: 1.35 };
    if (a === 'thief' || a === 'footprints') return { x: 2700 + (a === 'thief' ? t * 3 : 0), y: 600, z: 1.0 };
    if (a === 'timer' || a === 'disappear' || a === 'keys' || a === 'volcano-key' || a === 'creator' || a === 'timer-stop' || a === 'screen') return { x: 1500, y: 360, z: 1.2 };
    if (a === 'suspect') {
      const keys = Object.keys(places(st.set));
      const k = keys[Math.floor(t / 26) % keys.length];
      return { x: places(st.set)[k], y: 640, z: 1.9 };
    }
    if (a === 'teamwork') {
      const order = ['chn', 'jpn', 'usa', 'rus', 'uk', 'fra'];
      const k = order[Math.floor(t / 60) % order.length];
      return { x: posOf(k, st.set, g) ?? 1500, y: 640, z: 1.6 };
    }
    if (st.set === 'volcano' && runningAt(g)) return { x: 1450 + volShift(g) + 150, y: 600, z: b.who ? 1.05 : 0.85 };
    if (a === 'passage') return { x: PASSAGE_X - 200, y: 620, z: 1.1 };
    if (a === 'key-found' || a === 'fail' || a === 'freeze' || (st.set === 'volcano' && iPass >= 0 && b.i > iPass)) return { x: KEY_X - 200, y: 600, z: b.who ? 1.3 : 1.0 };
    if (a === 'lab-screen' || a === 'lab-voice') return { x: 2050, y: 470, z: 2.3 };
    if (a === 'yurt-proud') return { x: 2620, y: 640, z: 1.7 };
    if (a.startsWith('build-')) {
      const who = a.slice(6);
      return { x: places(st.set)[who] ?? 1480, y: 520, z: 1.05 };
    }
    if (b.who && b.who !== 'narr' && b.who !== 'voice') {
      const x = posOf(b.who, st.set, g);
      if (x !== undefined) return { x: x + 60, y: 620, z: 1.5 };
    }
    return grp;
  };

  const camAt = (g: number): Cam => {
    const b = beatAt(g);
    const t = g - b.start;
    const curT = target(b, g);
    const prevB = b.i > 0 ? B[b.i - 1] : b;
    const setChanged = b.i > 0 && states[b.i].set !== states[b.i - 1].set;
    const prev = setChanged ? curT : target(prevB, prevB.start + prevB.len - 1);
    const k = easeIO(Math.min(1, t / 24));
    const drift = t / Math.max(1, b.len);
    return {
      x: prev.x + (curT.x - prev.x) * k + Math.sin(g / 90) * 16,
      y: prev.y + (curT.y - prev.y) * k + Math.cos(g / 110) * 7,
      z: (prev.z + (curT.z - prev.z) * k) * (1 + 0.035 * drift),
    };
  };

  const Chapter: React.FC = () => {
    const g = useCurrentFrame();
    const b = beatAt(g);
    const st = states[b.i];
    const a = b.act ?? '';
    const t = g - b.start;

    // shake
    const shakeAmt =
      (a === 'quake' ? 1.6 : 0) + (a === 'erupt' ? 1.4 : 0) + (a === 'fail' && t < 25 ? 1.2 : 0) + (a === 'shock' && t < 25 ? 1.2 : 0) + (a === 'panic' ? 0.5 : 0) + (a === 'run' ? 0.5 : 0);
    const c0 = camAt(g);
    const cam: Cam = { ...c0, x: c0.x + (random(`kx${g}`) - 0.5) * 22 * shakeAmt, y: c0.y + (random(`ky${g}`) - 0.5) * 16 * shakeAmt };

    // continuous parameters
    const nightfall = first('nightfall');
    const tod = nightfall && b.i >= nightfall.i ? interpolate(g, [nightfall.start, nightfall.start + nightfall.len], [2, 3], clamp) : st.tod;
    const rainBeat = first('rain');
    const storm = st.weather === 'storm' ? interpolate(g, [rainBeat?.start ?? 0, (rainBeat?.start ?? 0) + 40], [0, 0.9], clamp) : 0;
    const floodB = first('flood');
    const flood = floodB && b.i >= floodB.i ? interpolate(g, [floodB.start, floodB.start + floodB.len * 0.8], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) }) : 0;
    const night = interpolate(tod, [2, 3], [0, 1], clamp);
    const setFade = interpolate(g, [st.setStart, st.setStart + 14], [0, 1], clamp);

    const castKeys = Object.keys(places(st.set));
    const speakerX = b.who ? posOf(b.who, st.set, g) : undefined;

    const castLayer = (tint?: string, frozen = false) => (
      <Layer depth={1}>
        {castKeys.map((key, idx) => {
          let x = posOf(key, st.set, g)!;
          const speaking = b.who === key && b.voiceAt !== undefined && g >= b.voiceAt && g < (b.voiceEnd ?? 0);
          let talk = 0;
          if (speaking && b.words) {
            const lw = [...b.words].reverse().find((w) => g >= w.f);
            if (lw) talk = Math.max(0, 1 - (g - lw.f) / 5) * 0.06;
          }
          let eyes: Eyes = 'normal';
          let pose: Pose = 'idle';
          let jump = 0;
          let jitter = 0;
          let y = GY - R;
          if (b.who === key) {
            eyes = b.emo ?? 'normal';
            pose = b.pose ?? 'idle';
          }
          const walking = B.some((bb) => bb.move && bb.move[key] && g >= bb.start && g < bb.start + bb.len);
          if (walking) jump = Math.abs(Math.sin(g / 4 + idx)) * 16;
          if (a === 'laugh') {
            eyes = 'happy';
            jump = Math.abs(Math.sin((g + idx * 4) / 4)) * 26;
            pose = 'up';
          }
          if (a === 'argue') {
            eyes = 'angry';
            pose = idx % 2 ? 'up' : 'point';
            jitter = (random(`aj${g}${key}`) - 0.5) * 12;
            jump = Math.abs(Math.sin((g + idx * 4) / 3.5)) * 18;
          }
          if (a === 'shock' || a === 'disappear' || a === 'fail') {
            eyes = 'shock';
            if (a !== 'fail') pose = 'up';
          }
          if (a === 'panic') {
            eyes = 'shock';
            pose = 'up';
            x += Math.sin(g / 8 + idx * 1.7) * 160;
            jump = Math.abs(Math.sin((g + idx * 5) / 3)) * 20;
          }
          if (a === 'quake') {
            eyes = 'wide';
            jitter = (random(`qj${g}${key}`) - 0.5) * 16;
          }
          if (a === 'door' || a === 'timer' || a === 'forest-light') eyes = b.who === key ? eyes : 'wide';
          if (a === 'suspect') {
            eyes = 'smug';
          }
          if (a === 'quiet' || a === 'freeze') {
            eyes = a === 'freeze' ? 'wide' : 'normal';
          }
          if (a === 'teamwork') pose = (['wave', 'point', 'up', 'flex'] as Pose[])[idx % 4];
          if (st.set === 'volcano' && runningAt(g)) {
            jump = Math.abs(Math.sin(g / (a === 'run' ? 2.5 : 4) + idx)) * (a === 'run' ? 26 : 14);
            if (a !== 'climb') eyes = b.who === key ? eyes : 'shock';
          }
          if (flood > 0 && st.set === 'beach' && key !== 'kgz') {
            // everyone floats next to the yurt
            const fx = 2350 + ((idx * 97) % 520) - 200;
            x = x + (fx - x) * flood;
            y = GY - R + flood * 50 + Math.sin(g / 12 + idx) * 10 * flood;
          }
          if (key === 'kgz' && flood > 0) x = 2650 + flood * 0;
          const lookTarget = a === 'door' ? 3050 : a === 'forest-light' ? -400 : a === 'message' || a === 'map' ? 1250 : a === 'timer' || a === 'disappear' || a === 'creator' ? 1500 : speakerX;
          const look = frozen ? 0 : lookTarget !== undefined && b.who !== key ? Math.max(-0.9, Math.min(0.9, (lookTarget - x) / 300)) : b.who === key ? 0 : Math.sin(g / 30 + idx) * 0.7;
          const bob = frozen || a === 'quiet' ? 0 : Math.sin(g / 9 + idx) * 4;
          return (
            <Ball
              key={key}
              id={`e-${key}`}
              flag={FLAG[key]}
              x={x + jitter}
              y={y + bob - jump}
              r={R}
              squash={frozen ? 0 : talk}
              eyes={eyes}
              look={look}
              pose={pose}
              seed={idx * 11}
              tint={tint}
            >
              {a === 'teamwork' && key === 'usa' && <path d={`M${R * 0.9} ${-R * 0.2} l70 -30 l0 60Z`} fill="#ffd04a" stroke="#111" strokeWidth={4} />}
              {a === 'teamwork' && key === 'rus' && <rect x={-R * 0.8} y={-R * 2.1} width={R * 1.6} height={R * 0.9} fill="#a07a4a" stroke="#111" strokeWidth={5} />}
              {a === 'teamwork' && key === 'uk' && <path d={`M${R * 0.8} ${-R * 0.1} q30 -10 50 10 q-10 40 -50 20Z`} fill="#fff" stroke="#111" strokeWidth={4} />}
              {a === 'teamwork' && key === 'jpn' && <rect x={R * 0.6} y={-R * 0.1} width={R * 0.9} height={R * 0.6} rx={6} fill="#cfd8dc" stroke="#111" strokeWidth={4} />}
              {a === 'teamwork' && key === 'chn' && (
                <g>
                  <rect x={R * 0.8} y={-R * 0.4} width={14} height={R * 0.8} fill="#90a4ae" stroke="#111" strokeWidth={3} transform={`rotate(${Math.sin(g / 2) * 30} ${R * 0.8} 0)`} />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <circle key={i} cx={R * 1.1 + random(`sp${g}${i}`) * 50} cy={-R * 0.4 - random(`sq${g}${i}`) * 50} r={4} fill="#ffe08a" />
                  ))}
                </g>
              )}
              {(a === 'teamwork' && (key === 'fra' || key === 'ita')) && <ellipse cx={0} cy={-R * 1.15} rx={R * 0.8} ry={R * 0.15} fill="#e0e0e0" stroke="#111" strokeWidth={4} />}
            </Ball>
          );
        })}
      </Layer>
    );

    // ---------- set rendering ----------
    const renderSet = (set: string) => {
      switch (set) {
        case 'beach':
          return (
            <>
              <Sky tod={tod} storm={storm} />
              <Clouds storm={storm} tod={tod} />
              <Sea tod={tod} storm={storm} />
              <Headland tod={tod} storm={storm} light={a === 'forest-light' ? 1 : 0} />
              <Shore />
              <Sand dark={night * 0.8} />
              <Cliff dark={night} days={DAYS[tl.num] ?? '30 DAYS'} />
              {tl.num === 3 && <BeachProps g={g} tl={tl} night={night} flood={flood} />}
              {tl.num === 2 && <Ch2Props g={g} />}
              {tl.num === 5 && <Ch5Props g={g} />}
              <Crowd g={g} act={a} night={night} />
              {castLayer(night > 0.3 ? `rgba(60,70,140,${night * 0.5})` : undefined)}
              {flood > 0 && (
                <Layer depth={1.02}>
                  <rect x={-2500} y={GY + 40 - flood * 150 + Math.sin(g / 10) * 6} width={8000} height={1000} fill="#2a5a8a" opacity={0.78} />
                  <path d={`M-2500 ${GY + 40 - flood * 150} ${Array.from({ length: 140 }).map((_, i) => `L${-2500 + i * 60} ${GY + 40 - flood * 150 + Math.sin(i / 2 + g / 6) * 9}`).join(' ')}`} stroke="#cfe8ff" strokeWidth={6} fill="none" opacity={0.7} />
                </Layer>
              )}
              <Rain amt={storm} />
              <AbsoluteFill style={{ background: `rgba(20,30,90,${night * 0.35})`, mixBlendMode: 'multiply' }} />
            </>
          );
        case 'forest':
          return (
            <>
              <ForestSet light={1} bunker={first('lab-found') && g >= first('lab-found')!.start ? 1 : 0} />
              {castLayer('rgba(60,80,150,0.45)')}
              {/* flashlight cones */}
              <AbsoluteFill style={{ background: 'radial-gradient(ellipse 30% 40% at 55% 70%, rgba(255,240,200,0.12) 0%, rgba(0,0,0,0) 70%)' }} />
              {a === 'watched' && (
                <Layer depth={1.1}>
                  {[0, 1].map((k) => {
                    const op = interpolate(t, [20, 40], [0, 1], clamp) * (g % 80 < 4 ? 0 : 1);
                    return (
                      <g key={k} opacity={op} transform={`translate(${1150 + k * 900} 700)`}>
                        <circle r={90} fill="#0a140e" />
                        <ellipse cx={-16} cy={0} rx={9} ry={6} fill="#ffef6a" />
                        <ellipse cx={16} cy={0} rx={9} ry={6} fill="#ffef6a" />
                      </g>
                    );
                  })}
                </Layer>
              )}
            </>
          );
        case 'lab': {
          const lightsOff = first('lights-off');
          const labScreen = first('lab-screen');
          const off = (lightsOff && g >= lightsOff.start) || !!labScreen;
          const on = labScreen ? 0 : first('lab-enter') && g < (first('lab-enter')!.start + 40) ? interpolate(g, [first('lab-enter')!.start, first('lab-enter')!.start + 40], [0, 1], clamp) : off ? 0 : 1;
          const mapGlow = first('map') && g >= first('map')!.start ? 1 : 0;
          const msgB = first('message');
          const message = msgB && g >= msgB.start ? interpolate(g, [msgB.start + 10, msgB.start + msgB.len - 30], [0, 1], clamp) : 0;
          const scr = (first('screen-on') && g >= first('screen-on')!.start && !off) || labScreen ? 1 : 0;
          return (
            <>
              <LabSet g={g} on={on} mapGlow={mapGlow * (off ? 0 : 1)} message={off ? 0 : message} screen={scr} dark={off && !labScreen ? 0.94 : 0} small={labScreen ? 'PROJECT EARTH 2 — ACTIVATED' : undefined} />
              {!labScreen && castLayer(off ? 'rgba(0,0,0,0.85)' : 'rgba(40,90,80,0.25)')}
              {!off && (
                <AbsoluteFill style={{ background: `conic-gradient(from ${200 + Math.sin(g / 25) * 20}deg at 40% 85%, rgba(255,245,210,0) 0deg, rgba(255,245,210,0.14) 12deg, rgba(255,245,210,0) 24deg)` }} />
              )}
            </>
          );
        }
        case 'cave': {
          const desc = first('descend');
          return (
            <>
              <CaveSet g={g} />
              {castLayer('rgba(40,20,60,0.45)')}
              {desc && a === 'descend' && <AbsoluteFill style={{ background: `rgba(0,0,0,${interpolate(t, [0, desc.len], [0.3, 0])})` }} />}
            </>
          );
        }
        case 'city': {
          const alarm = a === 'panic' ? 1 : 0;
          const kb = first('keys');
          const keysPhase = B.filter((x) => x.act === 'keys');
          const keysFound = keysPhase.filter((x) => x.who && g >= (x.voiceAt ?? x.start)).length;
          const holo = (a === 'keys' || a === 'volcano-key') && kb ? 1 : 0;
          const vk = first('volcano-key');
          const volcano = vk && g >= vk.start ? 1 : 0;
          const creator = a === 'creator' ? 1 : 0;
          const ts = first('timer-stop');
          const stopped = !!ts && g >= ts.start + 20;
          const screen = ts && g >= ts.start ? (g >= ts.start + 60 ? 'SYSTEM STABLE' : '00:00:07') : st.screen;
          return (
            <>
              <CitySet g={g} screen={screen} screenSince={screenSinceFor(b.i)} alarm={alarm} hologram={holo} keysFound={a === 'volcano-key' ? 2 : keysFound} volcano={volcano} creator={creator} stopped={stopped} />
              {castLayer('rgba(40,70,120,0.3)')}
              {first('keys-insert') && g >= first('keys-insert')!.start && (
                <Layer depth={1}>
                  {[0, 1, 2].map((k) => {
                    const p = spring({ frame: g - first('keys-insert')!.start - 15 - k * 25, fps: 30, config: { damping: 12 } });
                    return (
                      <g key={k} transform={`translate(${1300 + k * 200} ${GY - 260})`}>
                        <rect x={-50} y={-30} width={100} height={60} rx={10} fill="#1e2a3a" stroke="#7fe8ff" strokeWidth={4} />
                        <rect x={-8} y={-60 + (1 - p) * -80} width={16} height={60} fill="#ffd04a" opacity={p} />
                        <circle r={70} fill="#7fffa0" opacity={p * 0.25} />
                      </g>
                    );
                  })}
                </Layer>
              )}
            </>
          );
        }
        case 'volcano': {
          const inner = first('key-found') && g >= first('key-found')!.start ? 1 : 0;
          const erupt = a === 'erupt' || a === 'run' || (first('erupt') && g >= first('erupt')!.start && !inner) ? 1 : 0;
          const lava = a === 'run' ? 400 + t * 7 : 0;
          return (
            <>
              <VolcanoSet g={g} inner={inner} erupt={erupt} lava={lava > 0 ? lava + volShift(g) : 0} keyX={KEY_X} />
              {castLayer(a === 'freeze' ? 'rgba(80,80,90,0.6)' : 'rgba(255,90,40,0.25)', a === 'freeze')}
              {a === 'passage' && (
                <Layer depth={1}>
                  <path d={`M${PASSAGE_X - 60} ${GY} L${PASSAGE_X - 30} ${GY - 260} L${PASSAGE_X + 40} ${GY - 250} L${PASSAGE_X + 50} ${GY}Z`} fill="#000" stroke="#ffcf6a" strokeWidth={4} />
                  <circle cx={PASSAGE_X - 5} cy={GY - 120} r={60} fill="#ffe08a" opacity={0.2 + 0.2 * Math.sin(g / 4)} />
                </Layer>
              )}
            </>
          );
        }
        case 'sky': {
          const glow = first('glow')!;
          const fh2 = first('fly-home');
          return <SkySet g={g} t={(g - glow.start) / (glow.len + (fh2?.len ?? 0))} fly={fh2 && g >= fh2.start ? interpolate(g, [fh2.start, fh2.start + fh2.len], [0, 1], clamp) : 0} />;
        }
        case 'home':
          return (
            <>
              <HomeSet />
              {castLayer()}
            </>
          );
        default:
          return null;
      }
    };

    const recap = a === 'recap';
    const freeze = a === 'freeze';
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        <CamCtx.Provider value={cam}>
          <AbsoluteFill style={{ opacity: setFade, filter: recap ? 'sepia(0.85) contrast(1.1) brightness(0.9)' : freeze ? 'grayscale(0.85) contrast(1.2)' : a === 'flashback' ? 'sepia(0.7)' : undefined }}>
            {renderSet(st.set)}
            {a === 'argue' && <ArgueCloud g={g} b={b} />}
            {a === 'ballot' && <BallotBox g={g} b={b} />}
            {a === 'flashback' && <Flashback g={g} b={b} />}
            {a === 'quake' && <QuakeCracks g={g} b={b} />}
            {a === 'door' && <Door g={g} b={b} />}
            {(a === 'footprints' || a === 'thief') && <Footprints g={g} b={b} />}
          </AbsoluteFill>
        </CamCtx.Provider>
        {/* screen-space overlays */}
        {a === 'tally' && <Tally g={g} b={b} />}
        {a === 'laugh' &&
          Array.from({ length: 8 }).map((_, i) => {
            const life = ((t + i * 7) % 40) / 40;
            return (
              <div key={i} style={{ position: 'absolute', left: 200 + ((i * 237) % 1500), top: 200 + ((i * 131) % 300) - life * 60, opacity: 1 - life, fontFamily: COMIC, fontSize: 70, color: '#fff', WebkitTextStroke: '6px #111', paintOrder: 'stroke fill' }}>
                HA HA
              </div>
            );
          })}
        {a === 'shock' &&
          castKeys.map((key, i) => {
            const [sx, sy] = toScreen(cam, posOf(key, st.set, g)!, GY - R * 2 - 70);
            const p = spring({ frame: t - i * 2, fps: 30, config: { damping: 8 } });
            return (
              <div key={key} style={{ position: 'absolute', left: sx, top: sy, transform: `translate(-50%,-50%) scale(${p})`, fontFamily: COMIC, fontSize: 80, color: '#ff3a3a', WebkitTextStroke: '6px #111', paintOrder: 'stroke fill' }}>
                !!!
              </div>
            );
          })}
        {a.startsWith('build-') && (
          <div style={{ position: 'absolute', left: 60, top: 60, transform: `rotate(-3deg) scale(${spring({ frame: t - 5, fps: 30, config: { damping: 10 } })})`, background: '#ffd600', border: '6px solid #111', borderRadius: 18, padding: '10px 26px 4px', fontFamily: COMIC, fontSize: 58, color: '#111' }}>
            {({ 'build-usa': 'USA: SKYSCRAPER', 'build-chn': 'CHINA: A WHOLE CITY', 'build-ger': 'GERMANY: PERFECT CAMP', 'build-kgz': 'KYRGYZSTAN: YURT', 'build-fra': 'FRANCE: CAFE', 'build-rus': 'RUSSIA: FORTRESS' } as Record<string, string>)[a]}
          </div>
        )}
        {a === 'yurt-proud' &&
          Array.from({ length: 10 }).map((_, i) => {
            const life = ((t + i * 5) % 30) / 30;
            return <div key={i} style={{ position: 'absolute', left: 800 + Math.cos(i) * 300, top: 400 + Math.sin(i * 2) * 200 - life * 40, opacity: 1 - life, fontSize: 50, color: '#fff7a0' }}>✦</div>;
          })}
        {(a === 'fail' || a === 'lights-off' || a === 'freeze') && a === 'fail' && <AbsoluteFill style={{ background: '#ff0020', opacity: interpolate(t, [0, 4, 30], [0, 0.45, 0.12], clamp), mixBlendMode: 'screen' }} />}
        {recap && (
          <div style={{ position: 'absolute', left: 60, top: 50, fontFamily: COMIC, fontSize: 64, color: '#fff3d0', WebkitTextStroke: '6px #111', paintOrder: 'stroke fill', letterSpacing: 3 }}>PREVIOUSLY...</div>
        )}
        {a === 'flashback' && (
          <div style={{ position: 'absolute', right: 60, top: 50, fontFamily: COMIC, fontSize: 56, color: '#fff3d0', WebkitTextStroke: '6px #111', paintOrder: 'stroke fill' }}>EARLIER...</div>
        )}
        {/* speech */}
        {B.filter((x) => x.who && x.who !== 'narr' && x.who !== 'voice' && x.words).map((x) => {
          const sst = states[x.i];
          const px = posOf(x.who!, sst.set, x.voiceAt ?? x.start);
          if (px === undefined || g < (x.voiceAt ?? 0) - 2 || g >= x.start + x.len) return null;
          const curX = posOf(x.who!, sst.set, g) ?? px;
          let bx = curX;
          if (flood > 0 && x.who !== 'kgz' && st.set === 'beach') {
            const idx = castKeys.indexOf(x.who!);
            const fx = 2350 + ((idx * 97) % 520) - 200;
            bx = curX + (fx - curX) * flood;
          }
          const [sx, sy] = toScreen(cam, bx, GY - R * 2 - 40);
          return <Bubble key={x.i} who={x.who!} x={sx} y={sy} words={x.words!} from={x.voiceAt! - 2} to={x.start + x.len} shout={/!/.test(x.text ?? '') || x.text === x.text?.toUpperCase()} />;
        })}
        {B.filter((x) => x.who === 'narr').map((x) => (
          <NarratorCaption key={x.i} words={x.words!} from={x.voiceAt! - 4} to={x.start + x.len} />
        ))}
        {B.filter((x) => x.who === 'voice').map((x) => (
          <VoiceCaption key={x.i} words={x.words!} from={x.voiceAt! - 4} to={x.start + x.len} />
        ))}
        {/* titles */}
        {a === 'title' && (
          <AbsoluteFill style={{ opacity: interpolate(t, [0, 10, b.len - 10, b.len], [0, 1, 1, 0], clamp), background: 'rgba(0,0,0,0.25)' }}>
            <BigText lines={['COUNTRYBALLS: THE ISLAND OF ALL COUNTRIES']} size={48} top={300} color="#ffe27a" stroke={9} />
            <BigText lines={[`CHAPTER ${tl.num}`]} size={70} top={380} stroke={10} />
            <BigText lines={[tl.title]} size={tl.title.length > 22 ? 120 : 150} top={460} scale={spring({ frame: t, fps: 30, config: { damping: 10 } })} />
          </AbsoluteFill>
        )}
        {(a === 'next' || a === 'tbc') && (
          <AbsoluteFill style={{ background: `rgba(8,6,18,${interpolate(t, [0, 15], [0, 0.9], clamp)})` }}>
            {a === 'next' && spec.next ? (
              <>
                <BigText lines={['NEXT TIME']} size={60} top={300} color="#ffe27a" opacity={interpolate(t, [8, 20], [0, 1], clamp)} stroke={8} />
                <BigText lines={[`CHAPTER ${tl.num + 1}:`, spec.next]} size={spec.next.length > 22 ? 100 : 120} top={390} scale={spring({ frame: t - 12, fps: 30, config: { damping: 11 } })} />
              </>
            ) : (
              <BigText lines={['TO BE', 'CONTINUED...']} size={170} top={300} color="#ffe27a" scale={spring({ frame: t - 6, fps: 30, config: { damping: 10 } })} />
            )}
          </AbsoluteFill>
        )}
        {a === 'lights-off' && <AbsoluteFill style={{ background: '#000', opacity: interpolate(t, [0, 3], [0, 0.96], clamp) }} />}
        {/* finishing */}
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 75% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)' }} />
        <AbsoluteFill style={{ background: '#000', opacity: interpolate(g, [0, 12, tl.total - 12, tl.total], [1, 0, 0, 1], clamp) }} />
        {B.filter((x) => x.audio).map((x) => (
          <Sequence key={`a${x.i}`} from={x.voiceAt!} layout="none">
            <Audio src={staticFile(`cb/${tl.id}/${x.audio}`)} />
          </Sequence>
        ))}
        <Audio src={staticFile(`cb/${tl.id}/sound.wav`)} />
      </AbsoluteFill>
    );
  };
  return Chapter;
};

// =====================================================================
// small act overlays
// =====================================================================

const Crowd: React.FC<{ g: number; act: string; night: number }> = ({ g, act, night }) => (
  <Layer depth={0.9}>
    {Array.from({ length: 54 }).map((_, i) => {
      const row = i % 2;
      const r = row ? 50 : 42;
      const x = -500 + Math.floor(i / 2) * 135 + row * 60 + random(`cx${i}`) * 40;
      const y = (row ? 760 : 715) - r;
      const excited = ['shock', 'quake', 'laugh', 'argue', 'panic'].includes(act);
      const jump = excited ? Math.abs(Math.sin((g + i * 3) / 4)) * 18 : Math.sin(g / 10 + i) * 3;
      const eyes: Eyes = act === 'laugh' ? 'happy' : act === 'shock' || act === 'quake' ? 'shock' : act === 'argue' ? 'angry' : 'normal';
      return (
        <Ball key={i} id={`ecr${i}`} flag={CROWD_FLAGS[(i * 7) % CROWD_FLAGS.length]} x={x} y={y - jump} r={r} eyes={eyes} look={Math.sin(g / 40 + i)} seed={i} tint={`rgba(${night > 0.3 ? '60,70,140' : '200,200,230'},${0.18 + night * 0.4})`} />
      );
    })}
  </Layer>
);

const ArgueCloud: React.FC<{ g: number; b: Beat }> = ({ g, b }) => {
  const t = g - b.start;
  const o = interpolate(t, [0, 10, b.len - 10, b.len], [0, 1, 1, 0], clamp);
  const words = ['#@%!', 'NO!', 'LIAR!', '!!!', 'NON!', 'NYET!', 'MINE!', '?!', 'NEIN!', 'STOP!'];
  return (
    <Layer depth={1}>
      <g opacity={o}>
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2 + g / 20;
          const rr = 150 + Math.sin(g / 3 + i) * 25;
          return <circle key={i} cx={1150 + Math.cos(a) * rr} cy={700 + Math.sin(a) * rr * 0.6} r={90 + Math.sin(g / 2 + i) * 14} fill="#e9e2d6" stroke="#111" strokeWidth={5} />;
        })}
        <ellipse cx={1150} cy={700} rx={200} ry={120} fill="#e9e2d6" />
        {Array.from({ length: 5 }).map((_, i) => {
          const slot = Math.floor((t + i * 9) / 18);
          const k = (slot * 5 + i) % words.length;
          const life = ((t + i * 9) % 18) / 18;
          return (
            <text key={i} x={300 + random(`ax${slot}${i}`) * 2100} y={420 + random(`ay${slot}${i}`) * 200} textAnchor="middle" fontFamily={COMIC} fontSize={56 + life * 20} fill="#fff" stroke="#111" strokeWidth={8} paintOrder="stroke" opacity={1 - life}>
              {words[k]}
            </text>
          );
        })}
      </g>
    </Layer>
  );
};

const BallotBox: React.FC<{ g: number; b: Beat }> = ({ g, b }) => {
  const t = g - b.start;
  return (
    <Layer depth={1}>
      <g transform="translate(1480 760)">
        <rect x={-110} y={-120} width={220} height={150} fill="#3b6fd8" stroke="#111" strokeWidth={6} />
        <rect x={-60} y={-128} width={120} height={14} fill="#111" />
        <text x={0} y={-30} textAnchor="middle" fontFamily={COMIC} fontSize={44} fill="#fff">
          VOTE
        </text>
        {Array.from({ length: 6 }).map((_, i) => {
          const life = ((t + i * 14) % 40) / 40;
          return <rect key={i} x={-30 + Math.sin(i) * 20} y={-360 + life * 240} width={60} height={40} fill="#fff" stroke="#111" strokeWidth={3} transform={`rotate(${Math.sin(i + t / 10) * 30} 0 ${-340 + life * 240})`} opacity={life < 0.95 ? 1 : 0} />;
        })}
      </g>
    </Layer>
  );
};

const Tally: React.FC<{ g: number; b: Beat }> = ({ g, b }) => {
  const t = g - b.start;
  const ws = b.words ?? [];
  const wf = (w: string) => ws.find((x) => x.w.toLowerCase().replace(/[^a-z]/g, '') === w)?.f ?? b.start + 9999;
  const rows: [string, FlagName, number, number][] = [
    ['USA', 'usa', 3, wf('usa')],
    ['RUSSIA', 'rus', 3, wf('russia')],
    ['CHINA', 'chn', 3, wf('china')],
    ['KYRGYZSTAN', 'kgz', 1, wf('kyrgyzstan')],
  ];
  const p = spring({ frame: t, fps: 30, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${p})`, background: '#20402c', border: '14px solid #7a5a3a', borderRadius: 20, padding: '30px 60px', width: 1100, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: COMIC, fontSize: 70, color: '#f5f5e8', textAlign: 'center', marginBottom: 10 }}>ELECTION RESULTS</div>
        {rows.map(([name, flag, n, at]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 30, height: 110, opacity: g >= at - 4 ? 1 : 0.15 }}>
            <svg width={90} height={90} viewBox="-50 -50 100 100">
              <clipPath id={`tf-${flag}`}>
                <circle r={44} />
              </clipPath>
              <g clipPath={`url(#tf-${flag})`}>
                <FlagIcon name={flag} />
              </g>
              <circle r={44} fill="none" stroke="#111" strokeWidth={4} />
            </svg>
            <div style={{ fontFamily: COMIC, fontSize: 64, color: '#f5f5e8', width: 420 }}>{name}</div>
            <div style={{ fontFamily: COMIC, fontSize: 80, color: '#fff', letterSpacing: 14 }}>
              {Array.from({ length: n }).map((_, k) => (
                <span key={k} style={{ opacity: g >= at + k * 6 ? 1 : 0 }}>
                  |
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

import { Flag } from './Cast';
const FlagIcon: React.FC<{ name: FlagName }> = ({ name }) => <Flag name={name} r={44} />;

const Flashback: React.FC<{ g: number; b: Beat }> = ({ g, b }) => {
  const t = g - b.start;
  const x = interpolate(t, [0, 60, 110, b.len], [1900, 1600, 1600, 2100], clamp);
  const drop = interpolate(t, [70, 100], [0, 1], clamp);
  return (
    <Layer depth={1}>
      <AbsoluteFillRect />
      <g transform="translate(1480 760)">
        <rect x={-110} y={-120} width={220} height={150} fill="#3b6fd8" stroke="#111" strokeWidth={6} />
        <rect x={-60} y={-128} width={120} height={14} fill="#111" />
      </g>
      <Ball id="fb-kgz" flag="kgz" x={x} y={GY - R - Math.abs(Math.sin(t / 4)) * 10} r={R} eyes="smug" look={-0.9} pose={t > 60 && t < 100 ? 'point' : 'idle'} />
      {drop < 1 && t > 60 && (
        <g transform={`translate(${1480 + (1 - drop) * 100} ${560 + drop * 80})`}>
          <rect x={-40} y={-26} width={80} height={52} fill="#fff" stroke="#111" strokeWidth={3} />
          <text y={12} textAnchor="middle" fontFamily={COMIC} fontSize={28} fill="#e8112d">
            KGZ
          </text>
        </g>
      )}
      {[0, 1, 2].map((k) => {
        const life = ((t + k * 12) % 36) / 36;
        return (
          <text key={k} x={x + 80 + life * 40} y={GY - 230 - life * 60} fontFamily={COMIC} fontSize={50} fill="#111" opacity={1 - life}>
            ♪
          </text>
        );
      })}
    </Layer>
  );
};
const AbsoluteFillRect: React.FC = () => <rect x={-3000} y={-2000} width={9000} height={5000} fill="#000" opacity={0.15} />;

const QuakeCracks: React.FC<{ g: number; b: Beat }> = ({ g, b }) => {
  const t = g - b.start;
  const p = interpolate(t, [10, b.len], [0, 1], clamp);
  return (
    <Layer depth={1}>
      {[0, 1, 2, 3].map((k) => (
        <path
          key={k}
          d={`M${600 + k * 700} ${GY + 60} l60 30 l-40 40 l80 30 l-30 50`}
          stroke="#3a2a1a"
          strokeWidth={8}
          fill="none"
          strokeDasharray={400}
          strokeDashoffset={400 * (1 - p)}
        />
      ))}
      {Array.from({ length: 12 }).map((_, i) => {
        const life = ((t + i * 6) % 30) / 30;
        return <circle key={i} cx={400 + i * 220} cy={GY + 20 - life * 80} r={10 + life * 20} fill="#d9c49a" opacity={(1 - life) * 0.7} />;
      })}
    </Layer>
  );
};

const Door: React.FC<{ g: number; b: Beat }> = ({ g, b }) => {
  const t = g - b.start;
  const rise = interpolate(t, [0, 70], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const open = interpolate(t, [110, 170], [0, 1], { ...clamp, easing: easeIO });
  const h = 520;
  return (
    <Layer depth={1}>
      <g transform={`translate(3050 ${GY + 40 + (1 - rise) * h})`}>
        <rect x={-230} y={-h} width={460} height={h} fill="#6e6458" stroke="#111" strokeWidth={8} />
        <rect x={-180} y={-h + 120} width={360} height={h - 120} fill="#120d0a" />
        <rect x={-180} y={-h + 120} width={180 * (1 - open)} height={h - 120} fill="#8a7e70" stroke="#111" strokeWidth={5} />
        <rect x={180 - 180 * (1 - open)} y={-h + 120} width={180 * (1 - open)} height={h - 120} fill="#8a7e70" stroke="#111" strokeWidth={5} />
        {open > 0 && <path d={`M-170 ${-h + 120} L170 ${-h + 120} L500 0 L-500 0Z`} fill="#fff3c0" opacity={open * 0.35} />}
        <text x={0} y={-h + 80} textAnchor="middle" fontFamily={COMIC} fontSize={58} fill="#ffd36a" style={{ filter: 'drop-shadow(0 0 10px #ffb02a)' }}>
          THE FIRST CHALLENGE
        </text>
      </g>
      {Array.from({ length: 10 }).map((_, i) => {
        const life = ((t + i * 5) % 30) / 30;
        return rise < 1 ? <circle key={i} cx={2800 + i * 55} cy={GY + 30 - life * 120} r={14 + life * 30} fill="#d9c49a" opacity={(1 - life) * 0.8} /> : null;
      })}
    </Layer>
  );
};

const Footprints: React.FC<{ g: number; b: Beat }> = ({ g, b }) => {
  const t = g - b.start;
  const thief = b.act === 'thief';
  const tx = interpolate(t, [10, b.len - 30], [1600, 3560], clamp);
  return (
    <Layer depth={1}>
      {Array.from({ length: 18 }).map((_, i) => (
        <ellipse key={i} cx={1700 + i * 105} cy={GY + 40 + (i % 2) * 22} rx={16} ry={8} fill="#a5844e" opacity={0.7} />
      ))}
      {thief && tx < 3540 && (
        <g>
          <Ball id="thief" flag="unknown" x={tx} y={GY - 50 - Math.abs(Math.sin(t / 3)) * 12} r={50} eyes="smug" look={0.9}>
            <rect x={-30} y={-90} width={70} height={44} fill="#d9cfae" stroke="#111" strokeWidth={3} transform="rotate(-8)" />
          </Ball>
        </g>
      )}
    </Layer>
  );
};

const Ch2Props: React.FC<{ g: number }> = () => null;
const Ch5Props: React.FC<{ g: number }> = ({ g }) => (
  <Layer depth={1}>
    <g transform="translate(1480 820)">
      <rect x={-160} y={-30} width={320} height={22} fill="#8a6a4a" stroke="#111" strokeWidth={5} />
      <rect x={-140} y={-8} width={16} height={70} fill="#6a4a2a" />
      <rect x={124} y={-8} width={16} height={70} fill="#6a4a2a" />
      <MapOnTable g={g} />
    </g>
  </Layer>
);
let MAP_GONE_AT = Infinity;
export const setMapGoneAt = (f: number) => {
  MAP_GONE_AT = f;
};
const MapOnTable: React.FC<{ g: number }> = ({ g }) => {
  if (g >= MAP_GONE_AT + 20) {
    const life = (g - MAP_GONE_AT - 20) / 20;
    return life < 1 ? <circle cx={0} cy={-50} r={40 + life * 60} fill="#fff" opacity={1 - life} /> : null;
  }
  return <rect x={-100} y={-56} width={200} height={26} fill="#d9cfae" stroke="#111" strokeWidth={4} transform="skewX(-20)" />;
};

const VoiceCaption: React.FC<{ words: Word[]; from: number; to: number }> = ({ words, from, to }) => {
  const f = useCurrentFrame();
  if (f < from || f >= to) return null;
  const o = interpolate(f, [from, from + 6, to - 8, to], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: 200, right: 200, bottom: 80, display: 'flex', justifyContent: 'center', opacity: o }}>
      <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 48, lineHeight: 1.3, textAlign: 'center', color: '#ff4a6a', background: 'rgba(10,0,6,0.8)', padding: '12px 28px', border: '3px solid #ff4a6a', textShadow: `${(random(`vg${f}`) - 0.5) * 6}px 0 #00e5ff` }}>
        {words.map((w, i) => (
          <span key={i} style={{ opacity: f >= w.f ? 1 : 0.15 }}>
            {w.w.toUpperCase()}{' '}
          </span>
        ))}
      </div>
    </div>
  );
};
