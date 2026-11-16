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
import tl from '../../public/cb/ch01/timeline.json';
import { BigText, Ball, Bubble, COMIC, CROWD_FLAGS, Eyes, FlagName, NarratorCaption, Pose, Word, clamp, easeIO } from './Cast';

// ---------- font ----------
const fh = delayRender('Bangers');
const ff = new FontFace('Bangers', `url(${staticFile('fonts/Bangers-Regular.ttf')})`);
ff.load()
  .then(() => {
    document.fonts.add(ff);
    continueRender(fh);
  })
  .catch((e) => cancelRender(e));

// ---------- timeline ----------
type Beat = {
  i: number;
  act?: string;
  who?: string;
  text?: string;
  emo?: Eyes;
  pose?: Pose;
  start: number;
  len: number;
  audio?: string;
  voiceAt?: number;
  voiceEnd?: number;
  words?: Word[];
};
const T = tl as unknown as { total: number; beats: Beat[] };
export const CH01_FRAMES = T.total;
const B = T.beats;
const beatAt = (g: number) => B.find((b) => g >= b.start && g < b.start + b.len) ?? B[B.length - 1];
const firstAct = (act: string) => B.find((b) => b.act === act)!;

// ---------- cast & world ----------
const CAST: Record<string, { flag: FlagName; x: number }> = {
  uk: { flag: 'uk', x: 380 },
  fra: { flag: 'fra', x: 640 },
  usa: { flag: 'usa', x: 900 },
  rus: { flag: 'rus', x: 1180 },
  chn: { flag: 'chn', x: 1460 },
  jpn: { flag: 'jpn', x: 1740 },
  ita: { flag: 'ita', x: 2020 },
  ger: { flag: 'ger', x: 2300 },
  kgz: { flag: 'kgz', x: 2580 },
};
const R = 86;
const GY = 880; // ground line (world y at depth 1)
const ROCK_H = 70;
const SIGN_X = 3920;
const CROWD = Array.from({ length: 54 }).map((_, i) => {
  const row = i % 2;
  return {
    flag: CROWD_FLAGS[(i * 7) % CROWD_FLAGS.length],
    x: -500 + Math.floor(i / 2) * 135 + row * 60 + random(`cx${i}`) * 40,
    row,
    seed: i,
  };
});

type Cam = { x: number; y: number; z: number };
const GROUP: Cam = { x: 1480, y: 560, z: 0.72 };

const targetFor = (b: Beat): Cam => {
  if (b.act === 'sign1' || b.act === 'sign2') return { x: SIGN_X - 120, y: 470, z: 1.05 };
  if (b.act === 'shock') return { x: 1480, y: 560, z: 0.78 };
  if (b.act === 'argue') return { x: 1150, y: 600, z: 0.95 };
  if (b.act === 'silence') return { x: 2200, y: 620, z: 1.15 };
  if (b.act === 'wake') return { x: 1300, y: 640, z: 1.0 };
  if (b.who && CAST[b.who]) {
    const lift = b.act === 'usa-rock' ? ROCK_H : 0;
    return { x: CAST[b.who].x + 60, y: 620 - lift * 0.6, z: 1.5 };
  }
  return GROUP;
};

const camAt = (g: number): Cam => {
  const b = beatAt(g);
  const idx = b.i;
  const t = g - b.start;
  const cur = targetFor(b);
  const prev = idx > 0 ? targetFor(B[idx - 1]) : cur;
  const dur = b.act === 'shock' ? 10 : b.act === 'sign1' ? 50 : 24;
  const k = easeIO(Math.min(1, t / dur));
  const drift = t / Math.max(1, b.len);
  return {
    x: prev.x + (cur.x - prev.x) * k + Math.sin(g / 90) * 18,
    y: prev.y + (cur.y - prev.y) * k + Math.cos(g / 110) * 8,
    z: (prev.z + (cur.z - prev.z) * k) * (1 + 0.04 * drift),
  };
};

const CamCtx = React.createContext<Cam>(GROUP);

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

// ---------- environment ----------

const Sky: React.FC<{ day: number; storm: number }> = ({ day, storm }) => {
  const f = useCurrentFrame();
  const top = interpolateColors(storm, [0, 1], [interpolateColors(day, [0, 1], ['#5b6fb8', '#4fb3f0']), '#3a3550']);
  const mid = interpolateColors(storm, [0, 1], [interpolateColors(day, [0, 1], ['#ff9e7a', '#9fdcff']), '#6b5a6e']);
  const bot = interpolateColors(storm, [0, 1], [interpolateColors(day, [0, 1], ['#ffd59a', '#e8f7ff']), '#a8848a']);
  const sunY = interpolate(day, [0, 1], [430, 150]);
  const c = React.useContext(CamCtx);
  const sx = 1500 - c.x * 0.05;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top} 0%, ${mid} 55%, ${bot} 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${sx}px ${sunY}px, rgba(255,240,200,${0.9 - storm * 0.7}) 0px, rgba(255,220,150,${0.35 - storm * 0.3}) 120px, rgba(255,200,120,0) 520px)` }} />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <circle cx={sx} cy={sunY} r={70} fill={interpolateColors(day, [0, 1], ['#ffcf8a', '#fff6d6'])} opacity={1 - storm * 0.8} />
        {/* soft god rays from the sun */}
        <g opacity={(0.18 - storm * 0.15) * (1 - day * 0.4)} style={{ mixBlendMode: 'screen' }} transform={`translate(${sx} ${sunY}) rotate(${f * 0.03})`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <path key={i} d="M0 0 L-60 1400 L60 1400Z" fill="#fff3d0" transform={`rotate(${i * 30 + 15})`} />
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const Clouds: React.FC<{ storm: number }> = ({ storm }) => {
  const f = useCurrentFrame();
  return (
    <Layer depth={0.12}>
      {Array.from({ length: 7 }).map((_, i) => {
        const x = -900 + i * 520 + ((f * (0.3 + i * 0.05)) % 600);
        const y = -330 + (i % 3) * 70;
        const col = interpolateColors(storm, [0, 1], ['#ffffff', '#5a5266']);
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${0.8 + (i % 3) * 0.25 + storm * 0.4})`} opacity={0.85}>
            <ellipse rx={150} ry={50} fill={col} />
            <ellipse cx={-90} cy={15} rx={90} ry={40} fill={col} />
            <ellipse cx={95} cy={10} rx={110} ry={44} fill={col} />
            <ellipse cx={20} cy={-35} rx={90} ry={50} fill={col} />
            <ellipse cx={0} cy={30} rx={190} ry={26} fill="#000" opacity={0.06} />
          </g>
        );
      })}
    </Layer>
  );
};

const Sea: React.FC<{ day: number; storm: number }> = ({ day, storm }) => {
  const f = useCurrentFrame();
  const top = interpolateColors(storm, [0, 1], [interpolateColors(day, [0, 1], ['#4a6fae', '#1f8fd6']), '#2c3d55']);
  return (
    <Layer depth={0.35}>
      <defs>
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor="#0b4f8a" />
        </linearGradient>
      </defs>
      <rect x={-2000} y={80} width={6000} height={900} fill="url(#sea)" />
      {Array.from({ length: 40 }).map((_, i) => {
        const x = -1500 + ((i * 173 + f * 1.2) % 5000);
        const y = 100 + (i % 8) * 22;
        return <line key={i} x1={x} y1={y} x2={x + 40 + (i % 4) * 20} y2={y} stroke="#e8f7ff" strokeWidth={3} opacity={0.35 + 0.3 * Math.sin(f / 15 + i)} strokeLinecap="round" />;
      })}
    </Layer>
  );
};

const IslandBack: React.FC<{ day: number; storm: number }> = ({ day, storm }) => {
  const f = useCurrentFrame();
  const g1 = interpolateColors(storm, [0, 1], [interpolateColors(day, [0, 1], ['#3c6b4a', '#3f8f4f']), '#2c4436']);
  const g2 = interpolateColors(storm, [0, 1], [interpolateColors(day, [0, 1], ['#2f5a3c', '#2f7a42']), '#22362b']);
  return (
    <Layer depth={0.55}>
      <g transform="translate(-700 250)">
      {/* volcano (foreshadowing) */}
      <path d="M200 -40 L520 -330 L600 -330 L940 -40Z" fill={interpolateColors(day, [0, 1], ['#6e5a62', '#7d6a64'])} />
      <path d="M520 -330 L600 -330 L640 -290 L480 -290Z" fill="#4b3a3a" />
      {[0, 1, 2].map((k) => {
        const t = ((f + k * 60) % 180) / 180;
        return <circle key={k} cx={560 + t * 60} cy={-350 - t * 160} r={20 + t * 50} fill="#c9c2c6" opacity={(1 - t) * 0.5} />;
      })}
      <path d="M-1400 40 Q-900 -160 -300 -20 Q300 -200 760 -60 Q1100 20 1300 120 L1300 200 L-1400 200Z" fill={g1} />
      {Array.from({ length: 34 }).map((_, i) => {
        const x = -1300 + i * 62 + random(`tr${i}`) * 30;
        const y = -40 + Math.sin(i * 0.7) * 40 + random(`ty${i}`) * 30;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <rect x={-4} y={0} width={8} height={40} fill="#4a3426" />
            <circle cx={0} cy={-6} r={30 + random(`tz${i}`) * 14} fill={i % 3 ? g2 : g1} />
            <circle cx={-10} cy={-16} r={14} fill="#fff" opacity={0.07} />
          </g>
        );
      })}
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

const Sand: React.FC<{ storm: number }> = ({ storm }) => (
  <Layer depth={1}>
    <defs>
      <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={interpolateColors(storm, [0, 1], ['#f0d49a', '#a99a7c'])} />
        <stop offset="1" stopColor={interpolateColors(storm, [0, 1], ['#e3b96e', '#8a7a5e'])} />
      </linearGradient>
    </defs>
    <rect x={-2500} y={670} width={8000} height={1200} fill="url(#sand)" />
    {Array.from({ length: 120 }).map((_, i) => (
      <ellipse key={i} cx={-1500 + random(`sd${i}`) * 6000} cy={700 + random(`se${i}`) * 500} rx={4 + random(`sf${i}`) * 8} ry={2} fill="#b98f4e" opacity={0.25} />
    ))}
    {/* rock under USA */}
    <path d={`M${900 - 130} ${GY + 6} Q${900 - 120} ${GY - ROCK_H - 10} ${900} ${GY - ROCK_H - 14} Q${900 + 125} ${GY - ROCK_H - 6} ${900 + 135} ${GY + 6}Z`} fill="#8c8a8f" stroke="#111" strokeWidth={5} />
    <path d={`M${900 - 90} ${GY - ROCK_H + 6} Q${900} ${GY - ROCK_H - 6} ${900 + 80} ${GY - ROCK_H + 4}`} stroke="#b9b7bd" strokeWidth={8} fill="none" strokeLinecap="round" />
  </Layer>
);

const Cliff: React.FC<{ g: number }> = ({ g }) => {
  const s1 = firstAct('sign1');
  const s2 = firstAct('sign2');
  const glitch = g >= s2.start && g < s2.start + 28;
  const changed = g >= s2.start + 28;
  const pulse = 0.6 + 0.4 * Math.sin(g / 6);
  const off = glitch ? (random(`gl${g}`) - 0.5) * 30 : 0;
  const scramble = (s: string) =>
    s
      .split('')
      .map((ch, i) => (ch === ' ' ? ' ' : random(`sc${g}${i}`) > 0.5 ? '#%&@$X01?'[Math.floor(random(`sk${g}${i}`) * 9)] : ch))
      .join('');
  const line1 = changed ? 'YOU HAVE' : glitch ? scramble('WELCOME TO') : 'WELCOME TO';
  const line2 = changed ? '30 DAYS.' : glitch ? scramble('THE ISLAND.') : 'THE ISLAND.';
  const dust = g >= s1.start && g < s1.start + 90;
  return (
    <Layer depth={1}>
      <defs>
        <linearGradient id="cliff" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9a8f88" />
          <stop offset="0.5" stopColor="#7d726d" />
          <stop offset="1" stopColor="#5f5552" />
        </linearGradient>
        <filter id="glow-red" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="10" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d="M3380 900 L3420 300 Q3460 120 3620 90 L4300 60 Q4520 80 4600 260 L4700 900Z" fill="url(#cliff)" stroke="#111" strokeWidth={7} />
      {[
        'M3480 380 l60 70 l-20 80',
        'M4400 200 l-50 90 l30 70',
        'M3600 700 l80 -40 l40 60',
        'M4450 640 l-60 50',
      ].map((d) => (
        <path key={d} d={d} stroke="#4a4240" strokeWidth={6} fill="none" strokeLinecap="round" />
      ))}
      {/* carved sign */}
      <g transform={`translate(${SIGN_X + off} 330)`} fontFamily={COMIC} textAnchor="middle">
        {!changed ? (
          <>
            <text y={4} fontSize={120} fill="#3c3432">
              {line1}
            </text>
            <text y={0} fontSize={120} fill="#e7ddd2">
              {line1}
            </text>
            <text y={134} fontSize={140} fill="#3c3432">
              {line2}
            </text>
            <text y={130} fontSize={140} fill="#e7ddd2">
              {line2}
            </text>
            {glitch && (
              <>
                <text x={8} y={130} fontSize={140} fill="#ff2050" opacity={0.6} style={{ mixBlendMode: 'screen' }}>
                  {line2}
                </text>
                <text x={-8} y={130} fontSize={140} fill="#20d0ff" opacity={0.6} style={{ mixBlendMode: 'screen' }}>
                  {line2}
                </text>
              </>
            )}
          </>
        ) : (
          <g filter="url(#glow-red)" opacity={pulse}>
            <text y={0} fontSize={130} fill="#ff2a3a">
              {line1}
            </text>
            <text y={150} fontSize={170} fill="#ff2a3a">
              {line2}
            </text>
          </g>
        )}
      </g>
      {dust &&
        Array.from({ length: 14 }).map((_, i) => {
          const t = ((g - s1.start + i * 7) % 60) / 60;
          return <circle key={i} cx={3600 + i * 55} cy={150 + t * 300} r={6} fill="#cbbfb3" opacity={1 - t} />;
        })}
    </Layer>
  );
};

const Foreground: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Layer depth={1.35} style={{ filter: 'blur(3px)' }}>
      {Array.from({ length: 9 }).map((_, i) => {
        const x = -700 + i * 620;
        return (
          <g key={i} transform={`translate(${x} 1260) rotate(${Math.sin(f / 30 + i) * 3})`}>
            {[-40, -15, 10, 35].map((a) => (
              <path key={a} d="M0 0 Q 10 -90 0 -170" stroke="#5c8f3c" strokeWidth={14} fill="none" strokeLinecap="round" transform={`rotate(${a})`} />
            ))}
          </g>
        );
      })}
      {Array.from({ length: 6 }).map((_, i) => (
        <ellipse key={`s${i}`} cx={-300 + i * 900} cy={1210} rx={30} ry={18} fill="#f7e2d0" stroke="#111" strokeWidth={4} />
      ))}
    </Layer>
  );
};

// ---------- crowd + cast ----------

const Crowd: React.FC<{ g: number; mode: string; wake: number; storm: number }> = ({ g, mode, wake }) => (
  <Layer depth={0.9}>
    {CROWD.map((c) => {
      const r = c.row ? 50 : 42;
      const y = (c.row ? 760 : 715) - r;
      const w = spring({ frame: g - (wake + 30 + c.seed * 3), fps: 30, config: { damping: 10 } });
      const lying = Math.min(1, w);
      const jump =
        mode === 'shock' || mode === 'sign2'
          ? Math.abs(Math.sin((g + c.seed * 5) / 5)) * 22
          : mode === 'argue'
            ? Math.abs(Math.sin((g + c.seed * 3) / 3)) * 14
            : Math.sin(g / 10 + c.seed) * 3;
      const eyes: Eyes = lying < 0.5 ? 'closed' : mode === 'shock' || mode === 'sign2' ? 'shock' : mode === 'argue' ? 'angry' : 'normal';
      return (
        <Ball
          key={c.seed}
          id={`cr${c.seed}`}
          flag={c.flag}
          x={c.x}
          y={y - (lying > 0.5 ? jump : 0)}
          r={r}
          rot={-90 * (1 - lying)}
          eyes={eyes}
          look={mode === 'sign1' || mode === 'sign2' ? 1 : Math.sin(g / 40 + c.seed)}
          pose={mode === 'argue' ? 'up' : 'idle'}
          seed={c.seed}
          tint="rgba(200,200,230,0.18)"
        />
      );
    })}
  </Layer>
);

const CastLayer: React.FC<{ g: number; b: Beat }> = ({ g, b }) => {
  const wake = firstAct('wake');
  const rockFrom = firstAct('usa-rock').start;
  const argue = firstAct('argue');
  const mode = b.act ?? 'line';
  const speakerX = b.who && CAST[b.who] ? CAST[b.who].x : null;
  return (
    <Layer depth={1}>
      {Object.entries(CAST).map(([key, c], idx) => {
        const w = spring({ frame: g - (wake.start + 40 + idx * 14), fps: 30, config: { damping: 9 } });
        const up = Math.min(1, w);
        const speaking = b.who === key && b.voiceAt !== undefined && g >= b.voiceAt && g < (b.voiceEnd ?? 0);
        // squash on each word
        let talk = 0;
        if (speaking && b.words) {
          const lastWord = [...b.words].reverse().find((wd) => g >= wd.f);
          if (lastWord) talk = Math.max(0, 1 - (g - lastWord.f) / 5) * 0.06;
        }
        const onRock = key === 'usa' && g >= rockFrom && g < argue.start;
        const hop = key === 'usa' && g >= rockFrom && g < rockFrom + 14 ? Math.sin(((g - rockFrom) / 14) * Math.PI) * 80 : 0;
        let eyes: Eyes = up < 0.5 ? 'closed' : 'normal';
        let pose: Pose = up < 0.5 ? 'idle' : g < wake.start + wake.len && (idx % 3 === 0) ? 'rub' : g < wake.start + wake.len && idx % 3 === 1 ? 'stretch' : 'idle';
        let jitter = 0;
        let jump = 0;
        if (b.who === key) {
          eyes = b.emo ?? 'normal';
          pose = b.pose ?? 'idle';
        }
        if (mode === 'argue') {
          eyes = 'angry';
          pose = idx % 2 ? 'up' : 'point';
          jitter = (random(`aj${g}${key}`) - 0.5) * 12;
          jump = Math.abs(Math.sin((g + idx * 4) / 3.5)) * 18;
        }
        if (mode === 'silence') {
          eyes = key === 'kgz' ? 'normal' : 'wide';
          pose = 'idle';
        }
        if (mode === 'sign1') eyes = 'normal';
        if (mode === 'sign2') eyes = g > firstAct('sign2').start + 28 ? 'shock' : 'wide';
        if (mode === 'shock') {
          eyes = 'shock';
          pose = 'up';
          jump = Math.abs(Math.sin((g + idx * 3) / 4)) * 40;
        }
        if (b.who === 'ger' && key === 'kgz') eyes = 'happy';
        const look =
          mode === 'sign1' || mode === 'sign2'
            ? 1
            : mode === 'silence'
              ? Math.sign(CAST.kgz.x - c.x) * 0.9
              : speakerX !== null && b.who !== key
                ? Math.max(-0.9, Math.min(0.9, (speakerX - c.x) / 300))
                : b.who === key
                  ? 0
                  : Math.sin(g / 30 + idx) * 0.8;
        const still = mode === 'silence';
        const bob = still ? 0 : Math.sin(g / 9 + idx) * 4;
        return (
          <Ball
            key={key}
            id={`c-${key}`}
            flag={c.flag}
            x={c.x + jitter}
            y={GY - R - (onRock ? ROCK_H + 6 : 0) + bob - jump - hop}
            r={R}
            rot={-90 * (1 - up)}
            squash={talk}
            eyes={eyes}
            look={look}
            pose={pose}
            seed={idx * 11}
          />
        );
      })}
      {/* Zzz while sleeping */}
      {g < wake.start + 60 &&
        Object.values(CAST).map((c, i) =>
          [0, 1].map((k) => {
            const t = ((g + k * 20 + i * 7) % 40) / 40;
            return (
              <text key={`${i}${k}`} x={c.x + 50 + t * 40} y={GY - 120 - t * 90} fontFamily={COMIC} fontSize={36 + t * 24} fill="#2a3a7a" opacity={1 - t}>
                Z
              </text>
            );
          }),
        )}
    </Layer>
  );
};

// fight cloud + angry symbols during the argument
const Argue: React.FC<{ g: number; b: Beat }> = ({ g, b }) => {
  const t = g - b.start;
  const o = interpolate(t, [0, 10, b.len - 10, b.len], [0, 1, 1, 0], clamp);
  const words = ['#@%!', 'NO!', 'ME!', '!!!', 'NON!', 'NYET!', 'MINE!', '?!', 'NEIN!', 'STOP!'];
  return (
    <Layer depth={1}>
      <g opacity={o}>
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2 + g / 20;
          const rr = 150 + Math.sin(g / 3 + i) * 25;
          return <circle key={i} cx={1050 + Math.cos(a) * rr} cy={700 + Math.sin(a) * rr * 0.6} r={90 + Math.sin(g / 2 + i) * 14} fill="#e9e2d6" stroke="#111" strokeWidth={5} />;
        })}
        <ellipse cx={1050} cy={700} rx={200} ry={120} fill="#e9e2d6" />
        {Array.from({ length: 6 }).map((_, i) => {
          const p = (Math.floor(g / 6) + i) % 6;
          const a = p * 1.1 + i;
          return (
            <g key={`st${i}`} transform={`translate(${1050 + Math.cos(a) * 170} ${690 + Math.sin(a) * 90}) rotate(${g * 8})`}>
              <path d="M0 -22 L6 -6 L22 -6 L9 4 L14 20 L0 10 L-14 20 L-9 4 L-22 -6 L-6 -6Z" fill="#ffd54a" stroke="#111" strokeWidth={3} />
            </g>
          );
        })}
        {Array.from({ length: 5 }).map((_, i) => {
          const slot = Math.floor((t + i * 9) / 18);
          const k = (slot * 5 + i) % words.length;
          const x = 300 + random(`ax${slot}${i}`) * 2100;
          const y = 420 + random(`ay${slot}${i}`) * 200;
          const life = ((t + i * 9) % 18) / 18;
          return (
            <text key={`w${i}`} x={x} y={y} textAnchor="middle" fontFamily={COMIC} fontSize={56 + life * 20} fill="#fff" stroke="#111" strokeWidth={8} paintOrder="stroke" opacity={1 - life}>
              {words[k]}
            </text>
          );
        })}
      </g>
    </Layer>
  );
};

const Crab: React.FC<{ g: number; b: Beat }> = ({ g, b }) => {
  const t = g - b.start;
  const x = 3100 - t * 7;
  return (
    <Layer depth={1.05}>
      <g transform={`translate(${x} ${GY + 70})`}>
        {[-1, 1].map((s) =>
          [0, 1, 2].map((k) => <line key={`${s}${k}`} x1={s * 20} y1={0} x2={s * (44 + k * 6)} y2={18 + Math.sin(g / 1.5 + k) * 8} stroke="#111" strokeWidth={5} strokeLinecap="round" />),
        )}
        <ellipse rx={40} ry={24} fill="#e5533a" stroke="#111" strokeWidth={5} />
        <circle cx={-12} cy={-34} r={9} fill="#fff" stroke="#111" strokeWidth={4} />
        <circle cx={12} cy={-34} r={9} fill="#fff" stroke="#111" strokeWidth={4} />
        <path d="M-40 -6 q-26 -30 -6 -40 q6 18 -2 22" fill="#e5533a" stroke="#111" strokeWidth={4} />
        <path d="M40 -6 q26 -30 6 -40 q-6 18 2 22" fill="#e5533a" stroke="#111" strokeWidth={4} />
      </g>
    </Layer>
  );
};

// ---------- aerial opening ----------

const Aerial: React.FC<{ g: number }> = ({ g }) => {
  const a = firstAct('aerial');
  const title = firstAct('title');
  const end = title.start + title.len;
  const z = interpolate(g, [0, a.start + 160, end], [3.4, 1.05, 1.25], { ...clamp, easing: easeIO });
  const rot = interpolate(g, [0, end], [-14, 6]);
  const dive = interpolate(g, [end - 20, end + 6], [1, 5], { ...clamp, easing: Easing.in(Easing.cubic) });
  const isl = 'M-520 -40 Q-480 -330 -120 -360 Q260 -420 520 -220 Q700 -60 560 200 Q380 400 20 380 Q-360 380 -500 200 Z';
  return (
    <AbsoluteFill style={{ background: '#0a3d6b' }}>
      <AbsoluteFill style={{ transform: `translate(960px, 540px) rotate(${rot}deg) scale(${z * dive})`, transformOrigin: '0 0' }}>
        <svg width={1} height={1} style={{ position: 'absolute', overflow: 'visible' }}>
          <defs>
            <radialGradient id="ocean">
              <stop offset="0" stopColor="#2aa5d9" />
              <stop offset="0.5" stopColor="#11699f" />
              <stop offset="1" stopColor="#06304f" />
            </radialGradient>
            <radialGradient id="land" cx="0.45" cy="0.4">
              <stop offset="0" stopColor="#5fae55" />
              <stop offset="1" stopColor="#2f6e3a" />
            </radialGradient>
          </defs>
          <rect x={-3000} y={-3000} width={6000} height={6000} fill="url(#ocean)" />
          {Array.from({ length: 80 }).map((_, i) => {
            const x = -1400 + random(`ow${i}`) * 2800;
            const y = -1000 + random(`oy${i}`) * 2000;
            return <path key={i} d={`M${x} ${y} q20 -8 40 0 q20 8 40 0`} stroke="#bfe9ff" strokeWidth={3} fill="none" opacity={0.25 + 0.25 * Math.sin(g / 12 + i)} transform={`translate(${Math.sin(g / 40 + i) * 10} 0)`} />;
          })}
          {/* shallow water + beach ring */}
          <path d={isl} fill="#53c6d8" transform="scale(1.18)" opacity={0.7} />
          <path d={isl} fill="#f0d49a" transform="scale(1.06)" />
          <path d={isl} fill="url(#land)" />
          {Array.from({ length: 90 }).map((_, i) => {
            const ang = random(`fa${i}`) * Math.PI * 2;
            const d = Math.sqrt(random(`fd${i}`)) * 300;
            return <circle key={i} cx={Math.cos(ang) * d * 1.3} cy={Math.sin(ang) * d} r={18 + random(`fr${i}`) * 16} fill={i % 2 ? '#2d6a35' : '#3a7e40'} />;
          })}
          {/* volcano */}
          <circle cx={120} cy={-120} r={110} fill="#7a6a62" />
          <circle cx={120} cy={-120} r={40} fill="#3b2b2b" />
          <circle cx={120} cy={-120} r={18} fill="#ff6a2a" opacity={0.6 + 0.3 * Math.sin(g / 8)} />
          {/* tiny countryballs on the south beach */}
          {Array.from({ length: 40 }).map((_, i) => {
            const t = i / 40;
            const ang = 0.35 + t * 2.2;
            return <circle key={i} cx={Math.cos(ang) * 560 * 0.95} cy={Math.sin(ang) * 380 * 0.98} r={7} fill={['#d52b1e', '#fff', '#0039a6', '#ffce00', '#009246'][i % 5]} stroke="#111" strokeWidth={2} />;
          })}
          {/* cloud shadows + clouds above (parallax via extra scale) */}
          {Array.from({ length: 6 }).map((_, i) => {
            const x = -1100 + ((i * 420 + g * 1.6) % 2400);
            const y = -500 + i * 190;
            return (
              <g key={i}>
                <ellipse cx={x + 60} cy={y + 60} rx={180} ry={70} fill="#000" opacity={0.12} />
                <g opacity={0.85}>
                  <ellipse cx={x} cy={y} rx={180} ry={70} fill="#fff" />
                  <ellipse cx={x - 100} cy={y + 20} rx={110} ry={50} fill="#fff" />
                  <ellipse cx={x + 110} cy={y + 15} rx={120} ry={55} fill="#fff" />
                </g>
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,10,30,0.6) 100%)' }} />
    </AbsoluteFill>
  );
};

// ---------- the chapter ----------

export const Ch01: React.FC = () => {
  const g = useCurrentFrame();
  const b = beatAt(g);
  const wake = firstAct('wake');
  const title = firstAct('title');
  const s2 = firstAct('sign2');
  const shock = firstAct('shock');
  const next = firstAct('next');
  const cam0 = camAt(g);
  // whip-pan shake for dramatic beats
  const shakeAmt = (g >= s2.start + 28 && g < s2.start + 50 ? 1 : 0) + (g >= shock.start && g < shock.start + 30 ? 1.4 : 0);
  const cam: Cam = { ...cam0, x: cam0.x + (random(`sx${g}`) - 0.5) * 20 * shakeAmt, y: cam0.y + (random(`sy${g}`) - 0.5) * 14 * shakeAmt };
  const day = interpolate(g, [wake.start, s2.start], [0, 1], clamp);
  const storm = interpolate(g, [s2.start + 28, s2.start + 90], [0, 0.85], clamp);
  const onBeach = g >= wake.start - 10 && g < next.start + 10;
  const beachIn = interpolate(g, [wake.start - 10, wake.start + 12], [0, 1], clamp);
  const flash = interpolate(g, [s2.start + 26, s2.start + 30, s2.start + 44], [0, 0.8, 0], clamp);

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {g < wake.start + 12 && g >= firstAct('aerial').start - 30 && (
        <AbsoluteFill style={{ opacity: interpolate(g, [firstAct('aerial').start - 30, firstAct('aerial').start + 20], [0, 1], clamp) }}>
          <Aerial g={g} />
        </AbsoluteFill>
      )}
      {onBeach && (
        <AbsoluteFill style={{ opacity: beachIn, transform: `scale(${interpolate(beachIn, [0, 1], [1.15, 1])})` }}>
          <CamCtx.Provider value={cam}>
            <Sky day={day} storm={storm} />
            <Clouds storm={storm} />
            <Sea day={day} storm={storm} />
            <IslandBack day={day} storm={storm} />
            <Shore />
            <Sand storm={storm} />
            <Cliff g={g} />
            <Crowd g={g} mode={b.act ?? 'line'} wake={wake.start} storm={storm} />
            <CastLayer g={g} b={b} />
            {b.act === 'argue' && <Argue g={g} b={b} />}
            {b.act === 'silence' && <Crab g={g} b={b} />}
            <Foreground />
            {/* warm morning grade -> cold storm grade */}
            <AbsoluteFill style={{ background: interpolateColors(storm, [0, 1], [interpolateColors(day, [0, 1], ['rgba(255,140,80,0.16)', 'rgba(255,230,180,0.05)']), 'rgba(60,30,80,0.32)']), mixBlendMode: 'multiply' }} />
            {b.act === 'shock' &&
              Object.values(CAST).map((c, i) => {
                const [sx, sy] = toScreen(cam, c.x, GY - R * 2 - 70);
                const p = spring({ frame: g - shock.start - i * 2, fps: 30, config: { damping: 8 } });
                return (
                  <div key={i} style={{ position: 'absolute', left: sx, top: sy, transform: `translate(-50%,-50%) scale(${p})`, fontFamily: COMIC, fontSize: 80, color: '#ff3a3a', WebkitTextStroke: '6px #111', paintOrder: 'stroke fill' }}>
                    !!!
                  </div>
                );
              })}
          </CamCtx.Provider>
          <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
        </AbsoluteFill>
      )}
      {/* speech bubbles */}
      {B.filter((x) => x.who && x.who !== 'narr' && x.words && CAST[x.who]).map((x) => {
        const c = CAST[x.who!];
        const lift = x.act === 'usa-rock' ? ROCK_H : 0;
        const [sx, sy] = toScreen(cam, c.x, GY - R * 2 - lift - 40);
        return <Bubble key={x.i} who={x.who!} x={sx} y={sy} words={x.words!} from={x.voiceAt! - 2} to={x.start + x.len} shout={x.text === x.text?.toUpperCase() || /!{1}/.test(x.text ?? '')} />;
      })}
      {/* narrator */}
      {B.filter((x) => x.who === 'narr').map((x) => (
        <NarratorCaption key={x.i} words={x.words!} from={x.voiceAt! - 4} to={x.start + x.len} />
      ))}
      {/* chapter title */}
      {g >= title.start - 10 && g < title.start + title.len + 10 && (
        <AbsoluteFill style={{ opacity: interpolate(g, [title.start - 10, title.start + 6, title.start + title.len - 6, title.start + title.len + 10], [0, 1, 1, 0], clamp) }}>
          <BigText lines={['COUNTRYBALLS: THE ISLAND OF ALL COUNTRIES']} size={48} top={300} color="#ffe27a" stroke={9} />
          <BigText lines={['CHAPTER 1']} size={70} top={380} stroke={10} />
          <BigText lines={['THE MYSTERIOUS ISLAND']} size={150} top={460} scale={spring({ frame: g - title.start, fps: 30, config: { damping: 10 } })} />
        </AbsoluteFill>
      )}
      {/* end card */}
      {g >= next.start && (
        <AbsoluteFill style={{ background: `rgba(8,6,18,${interpolate(g, [next.start, next.start + 15], [0, 0.9], clamp)})` }}>
          <BigText lines={['NEXT TIME']} size={60} top={300} color="#ffe27a" opacity={interpolate(g, [next.start + 8, next.start + 20], [0, 1], clamp)} stroke={8} />
          <BigText lines={['CHAPTER 2:', 'WHO WILL RULE THE ISLAND?']} size={110} top={390} scale={spring({ frame: g - next.start - 12, fps: 30, config: { damping: 11 } })} />
          <BigText lines={['TO BE CONTINUED...']} size={52} top={720} color="#cfd8ff" opacity={interpolate(g, [next.start + 40, next.start + 55], [0, 1], clamp)} stroke={7} />
        </AbsoluteFill>
      )}
      {/* black open + vignette */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 75% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)' }} />
      <AbsoluteFill style={{ background: '#000', opacity: interpolate(g, [0, firstAct('aerial').start + 10], [1, 0], clamp) }} />
      <AbsoluteFill style={{ background: '#000', opacity: interpolate(g, [T.total - 12, T.total], [0, 1], clamp) }} />
      {/* audio */}
      {B.filter((x) => x.audio).map((x) => (
        <Sequence key={`a${x.i}`} from={x.voiceAt!} layout="none">
          <Audio src={staticFile(`cb/ch01/${x.audio}`)} />
        </Sequence>
      ))}
      <Audio src={staticFile('cb/ch01/sound.wav')} />
    </AbsoluteFill>
  );
};
