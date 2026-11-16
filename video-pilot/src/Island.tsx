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
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ---------- font ----------

const fontHandle = delayRender('Loading Bangers font');
const bangers = new FontFace('Bangers', `url(${staticFile('fonts/Bangers-Regular.ttf')})`);
bangers
  .load()
  .then(() => {
    document.fonts.add(bangers);
    continueRender(fontHandle);
  })
  .catch((err) => cancelRender(err));

const COMIC = 'Bangers, Impact, sans-serif';
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// ---------- timing ----------

const SCENES = [
  { id: 'wake', dur: 330 },
  { id: 'skyscraper', dur: 450 },
  { id: 'city', dur: 450 },
  { id: 'robot', dur: 450 },
  { id: 'yurt', dur: 450 },
  { id: 'sinking', dur: 600 },
] as const;

export const ISLAND_FRAMES = SCENES.reduce((s, x) => s + x.dur, 0);

// ---------- camera ----------

type View = { x: number; y: number; w: number };
const DEFAULT_VIEW: View = { x: 60, y: 100, w: 960 };
const FULL_VIEW: View = { x: 0, y: 0, w: 1080 };
const ViewCtx = React.createContext<View>(DEFAULT_VIEW);
const lerpView = (a: View, b: View, t: number): View => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
});
const toScreen = (v: View, x: number, y: number): [number, number] => [((x - v.x) * 1080) / v.w, ((y - v.y) * 1080) / v.w];
const viewBox = (v: View) => `${v.x} ${v.y} ${v.w} ${(v.w * 1920) / 1080}`;

const GROUND = 1310; // where balls stand
const R = 105; // main ball radius
const BALL_Y = GROUND - R;

// ---------- flags ----------

type FlagName = 'usa' | 'rus' | 'chn' | 'jpn' | 'kgz' | 'ger' | 'fra' | 'bra' | 'ind';

const starPath = (cx: number, cy: number, r: number, rot = -90) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.4;
    const a = ((rot + i * 36) * Math.PI) / 180;
    pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
  }
  return `M${pts.join('L')}Z`;
};

const Flag: React.FC<{ name: FlagName; r: number }> = ({ name, r }) => {
  const d = r * 2;
  const x0 = -r;
  const y0 = -r;
  const hBands = (cols: string[]) =>
    cols.map((c, i) => <rect key={i} x={x0} y={y0 + (i * d) / cols.length} width={d} height={d / cols.length + 1} fill={c} />);
  const vBands = (cols: string[]) =>
    cols.map((c, i) => <rect key={i} x={x0 + (i * d) / cols.length} y={y0} width={d / cols.length + 1} height={d} fill={c} />);
  switch (name) {
    case 'usa': {
      const h = d / 13;
      return (
        <>
          {Array.from({ length: 13 }).map((_, i) => (
            <rect key={i} x={x0} y={y0 + i * h} width={d} height={h + 0.5} fill={i % 2 === 0 ? '#b22234' : '#fff'} />
          ))}
          <rect x={x0} y={y0} width={d * 0.48} height={h * 7} fill="#3c3b6e" />
          {Array.from({ length: 20 }).map((_, i) => (
            <circle key={i} cx={x0 + d * 0.06 + (i % 5) * d * 0.09} cy={y0 + h * 0.8 + Math.floor(i / 5) * h * 1.6} r={r * 0.035} fill="#fff" />
          ))}
        </>
      );
    }
    case 'rus':
      return <>{hBands(['#fff', '#0039a6', '#d52b1e'])}</>;
    case 'ger':
      return <>{hBands(['#000', '#dd0000', '#ffce00'])}</>;
    case 'fra':
      return <>{vBands(['#0055a4', '#fff', '#ef4135'])}</>;
    case 'ind':
      return (
        <>
          {hBands(['#ff9933', '#fff', '#138808'])}
          <circle cx={0} cy={0} r={r * 0.2} fill="none" stroke="#000080" strokeWidth={r * 0.04} />
        </>
      );
    case 'bra':
      return (
        <>
          <rect x={x0} y={y0} width={d} height={d} fill="#009c3b" />
          <path d={`M0 ${-r * 0.75} L${r * 0.9} 0 L0 ${r * 0.75} L${-r * 0.9} 0Z`} fill="#ffdf00" />
          <circle cx={0} cy={0} r={r * 0.4} fill="#002776" />
        </>
      );
    case 'jpn':
      return (
        <>
          <rect x={x0} y={y0} width={d} height={d} fill="#fff" />
          <circle cx={0} cy={r * 0.15} r={r * 0.42} fill="#bc002d" />
        </>
      );
    case 'chn':
      return (
        <>
          <rect x={x0} y={y0} width={d} height={d} fill="#de2910" />
          <path d={starPath(-r * 0.45, -r * 0.45, r * 0.24)} fill="#ffde00" />
          {[
            [-0.12, -0.72],
            [0.02, -0.52],
            [0.02, -0.26],
            [-0.12, -0.08],
          ].map(([sx, sy], i) => (
            <path key={i} d={starPath(sx * r, sy * r, r * 0.08, -60 + i * 25)} fill="#ffde00" />
          ))}
        </>
      );
    case 'kgz':
      return (
        <>
          <rect x={x0} y={y0} width={d} height={d} fill="#e8112d" />
          {Array.from({ length: 40 }).map((_, i) => (
            <path
              key={i}
              d={`M${-r * 0.03} ${-r * 0.32} L0 ${-r * 0.6} L${r * 0.03} ${-r * 0.32}Z`}
              fill="#ffef00"
              transform={`rotate(${i * 9})`}
            />
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
  }
};

// ---------- ball ----------

type Eyes = 'normal' | 'wide' | 'closed' | 'happy' | 'smug';

const Ball: React.FC<{
  id: string;
  flag: FlagName;
  x: number;
  y: number;
  r?: number;
  eyes?: Eyes;
  look?: number;
  rot?: number;
  squash?: number;
  children?: React.ReactNode;
}> = ({ id, flag, x, y, r = R, eyes = 'normal', look = 0, rot = 0, squash = 0, children }) => {
  const ex = r * 0.3;
  const ey = -r * 0.12;
  const lx = look * r * 0.14;
  const sw = r * 0.05;
  const eye = (side: number) => {
    const cx = side * ex + lx;
    const rx = r * 0.16;
    const ry = r * 0.23;
    switch (eyes) {
      case 'wide':
        return <ellipse cx={cx} cy={ey - r * 0.04} rx={rx * 1.3} ry={ry * 1.35} fill="#fff" stroke="#111" strokeWidth={sw} />;
      case 'closed':
        return <path d={`M${cx - rx} ${ey} Q${cx} ${ey + ry * 0.7} ${cx + rx} ${ey}`} fill="none" stroke="#111" strokeWidth={sw} strokeLinecap="round" />;
      case 'happy':
        return <path d={`M${cx - rx} ${ey + ry * 0.2} Q${cx} ${ey - ry} ${cx + rx} ${ey + ry * 0.2}`} fill="none" stroke="#111" strokeWidth={sw * 1.2} strokeLinecap="round" />;
      case 'smug':
        return <path d={`M${cx - rx} ${ey} A${rx} ${ry} 0 0 0 ${cx + rx} ${ey} Z`} fill="#fff" stroke="#111" strokeWidth={sw} strokeLinejoin="round" />;
      default:
        return <ellipse cx={cx} cy={ey} rx={rx} ry={ry} fill="#fff" stroke="#111" strokeWidth={sw} />;
    }
  };
  return (
    <g transform={`translate(${x} ${y + r * squash}) rotate(${rot}) scale(${1 + squash * 0.6} ${1 - squash})`}>
      <ellipse cx={0} cy={r * 0.98} rx={r * 0.8} ry={r * 0.12} fill="rgba(0,0,0,0.18)" transform={`rotate(${-rot})`} />
      <defs>
        <clipPath id={`clip-${id}`}>
          <circle r={r} />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${id})`}>
        <Flag name={flag} r={r} />
        <ellipse cx={-r * 0.35} cy={-r * 0.45} rx={r * 0.35} ry={r * 0.2} fill="rgba(255,255,255,0.18)" transform={`rotate(-30 ${-r * 0.35} ${-r * 0.45})`} />
      </g>
      <circle r={r} fill="none" stroke="#111" strokeWidth={sw} />
      {eye(-1)}
      {eye(1)}
      {children}
    </g>
  );
};

// ---------- speech bubble (screen space) ----------

const Bubble: React.FC<{ x: number; y: number; text: string; from: number; to: number; size?: number }> = ({
  x: wx,
  y: wy,
  text,
  from,
  to,
  size = 66,
}) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const view = React.useContext(ViewCtx);
  if (f < from || f >= to) return null;
  const [x, y] = toScreen(view, wx, wy);
  const s = spring({ frame: f - from, fps, config: { damping: 11, stiffness: 200 } });
  const out = interpolate(f, [to - 6, to], [1, 0], clamp);
  const cx = Math.min(Math.max(x, 330), 750);
  const tail = Math.max(-220, Math.min(220, x - cx));
  return (
    <div
      style={{
        position: 'absolute',
        left: cx,
        top: y,
        transform: `translate(-50%, -100%) scale(${s * out})`,
        transformOrigin: `calc(50% + ${tail}px) 100%`,
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '7px solid #111',
          borderRadius: 44,
          padding: '20px 36px 14px',
          fontFamily: COMIC,
          fontSize: size,
          width: 'max-content',
          maxWidth: 620,
          textAlign: 'center',
          lineHeight: 1.05,
          letterSpacing: 1.5,
          color: '#111',
          boxShadow: '0 10px 0 rgba(0,0,0,0.18)',
        }}
      >
        {text}
      </div>
      <svg
        width={70}
        height={60}
        style={{ position: 'absolute', left: `calc(50% + ${tail}px - 35px)`, bottom: -52, overflow: 'visible' }}
      >
        <path d="M10 0 L35 54 L60 0" fill="#fff" stroke="#111" strokeWidth={7} strokeLinejoin="round" />
        <rect x={13} y={-8} width={44} height={14} fill="#fff" />
      </svg>
    </div>
  );
};

const Sticker: React.FC<{ text: string; color?: string }> = ({ text, color = '#ffd600' }) => (
  <div
    style={{
      position: 'absolute',
      left: 50,
      top: 150,
      background: color,
      border: '6px solid #111',
      borderRadius: 20,
      padding: '10px 26px 4px',
      fontFamily: COMIC,
      fontSize: 64,
      color: '#111',
      transform: 'rotate(-4deg)',
      boxShadow: '0 8px 0 rgba(0,0,0,0.2)',
    }}
  >
    {text}
  </div>
);

const BigText: React.FC<{ lines: string[]; size: number; color?: string; top?: number; scale?: number; opacity?: number }> = ({
  lines,
  size,
  color = '#fff',
  top = 230,
  scale = 1,
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 40,
      right: 40,
      top,
      textAlign: 'center',
      fontFamily: COMIC,
      fontSize: size,
      lineHeight: 1.02,
      color,
      WebkitTextStroke: '12px #111',
      paintOrder: 'stroke fill',
      letterSpacing: 2,
      transform: `scale(${scale})`,
      opacity,
      textShadow: '0 10px 0 rgba(0,0,0,0.25)',
    }}
  >
    {lines.map((l) => (
      <div key={l}>{l}</div>
    ))}
  </div>
);

// ---------- environment ----------

const Palm: React.FC<{ x: number; y: number; s?: number; flip?: boolean }> = ({ x, y, s = 1, flip }) => {
  const f = useCurrentFrame();
  const sway = Math.sin(f / 25) * 4;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0 Q -30 -170 20 -330" stroke="#6d4c41" strokeWidth={30} fill="none" strokeLinecap="round" />
      <path d="M0 0 Q -30 -170 20 -330" stroke="#8d6e63" strokeWidth={30} fill="none" strokeDasharray="6 26" />
      <g transform={`translate(20 -330) rotate(${sway})`}>
        {[-170, -135, -95, -55, -15, 25].map((a) => (
          <ellipse key={a} rx={120} ry={30} cx={0} cy={0} fill={a % 2 ? '#2e7d32' : '#43a047'} transform={`rotate(${a}) translate(100 0)`} />
        ))}
        <circle cx={-10} cy={20} r={18} fill="#5d4037" />
        <circle cx={18} cy={24} r={18} fill="#4e342e" />
      </g>
    </g>
  );
};

const Waves: React.FC<{ y: number; color: string; amp?: number; speed?: number; opacity?: number }> = ({
  y,
  color,
  amp = 14,
  speed = 3,
  opacity = 1,
}) => {
  const f = useCurrentFrame();
  const pts: string[] = [];
  for (let x = -20; x <= 1100; x += 20) {
    pts.push(`${x},${y + Math.sin((x + f * speed) / 60) * amp}`);
  }
  return <path d={`M${pts.join('L')} L1100 2400 L-20 2400Z`} fill={color} opacity={opacity} />;
};

const World: React.FC<{ children?: React.ReactNode; sink?: number; front?: React.ReactNode; palms?: boolean }> = ({
  children,
  sink = 0,
  front,
  palms = true,
}) => {
  const f = useCurrentFrame();
  const view = React.useContext(ViewCtx);
  return (
    <svg width={1080} height={1920} viewBox={viewBox(view)} style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4fc3f7" />
          <stop offset="1" stopColor="#e1f5fe" />
        </linearGradient>
      </defs>
      <rect x={-200} y={-200} width={1480} height={2400} fill="url(#sky)" />
      <circle cx={880} cy={260} r={90} fill="#fff59d" />
      <circle cx={880} cy={260} r={70} fill="#ffee58" />
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${((i * 600 + f * 0.8) % 1400) - 200} ${420 + i * 140})`} fill="#fff" opacity={0.9}>
          <ellipse rx={90} ry={40} />
          <ellipse cx={-60} cy={15} rx={60} ry={30} />
          <ellipse cx={65} cy={12} rx={70} ry={34} />
        </g>
      ))}
      <Waves y={860} color="#29b6f6" amp={8} speed={2} />
      <Waves y={900} color="#0288d1" amp={10} speed={-3} opacity={0.6} />
      <g transform={`translate(0 ${sink})`}>
        <ellipse cx={540} cy={1380} rx={720} ry={440} fill="#e0b860" />
        <ellipse cx={540} cy={1360} rx={690} ry={415} fill="#f4d58d" />
        {[120, 300, 760, 980].map((x, i) => (
          <path key={x} d={`M${x} ${1040 + (i % 2) * 30} l10 -30 l8 30 l10 -24 l6 24`} stroke="#7cb342" strokeWidth={6} fill="none" />
        ))}
        {palms && (
          <>
            <Palm x={70} y={1060} s={1.1} />
            <Palm x={1010} y={1040} s={1} flip />
          </>
        )}
        {children}
      </g>
      {front}
    </svg>
  );
};

const bob = (f: number, phase: number) => Math.sin(f / 9 + phase) * 6;

const SceneCut: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 6, dur - 6, dur], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

// ---------- scene 1: waking up ----------

const WakeScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bg: [FlagName, number][] = [
    ['ger', 210],
    ['fra', 400],
    ['bra', 680],
    ['ind', 870],
  ];
  const main: [FlagName, number][] = [
    ['usa', 250],
    ['rus', 540],
    ['chn', 830],
  ];
  const hook = interpolate(f, [0, 8, 80, 92], [0, 1, 1, 0], clamp);
  const hookScale = spring({ frame: f, fps, config: { damping: 10 } });
  return (
    <AbsoluteFill>
      <World>
        {bg.map(([flag, x], i) => {
          const w = spring({ frame: f - 20 - i * 6, fps, config: { damping: 9 } });
          return (
            <Ball
              key={flag}
              id={`w-${flag}`}
              flag={flag}
              x={x}
              y={1035 - Math.sin(Math.PI * Math.min(w, 1)) * 50 + bob(f, i)}
              r={68}
              rot={-90 * (1 - w)}
              eyes={w < 0.5 ? 'closed' : 'normal'}
              look={Math.sin(f / 20 + i) * 0.8}
            />
          );
        })}
        {main.map(([flag, x], i) => {
          const w = spring({ frame: f - 40 - i * 8, fps, config: { damping: 9 } });
          const speaking =
            (flag === 'usa' && f >= 100 && f < 163) || (flag === 'rus' && f >= 166 && f < 246) || (flag === 'chn' && f >= 249);
          const eyes: Eyes = w < 0.5 ? 'closed' : flag === 'usa' && f < 160 ? 'wide' : flag === 'rus' && speaking ? 'smug' : 'normal';
          return (
            <Ball
              key={flag}
              id={`w-${flag}`}
              flag={flag}
              x={x}
              y={BALL_Y - Math.sin(Math.PI * Math.min(w, 1)) * 90 + (speaking ? bob(f * 2, i) : 0)}
              rot={-90 * (1 - w)}
              eyes={eyes}
              look={flag === 'chn' ? Math.sin(f / 12) : 0}
            />
          );
        })}
        {f < 50 &&
          [250, 540, 830].map((x, i) =>
            [0, 1, 2].map((k) => {
              const t = ((f + k * 12 + i * 5) % 36) / 36;
              return (
                <text key={`${i}${k}`} x={x + 60 + t * 50} y={BALL_Y - 90 - t * 110} fontFamily={COMIC} fontSize={40 + t * 30} fill="#1a237e" opacity={1 - t}>
                  Z
                </text>
              );
            }),
          )}
      </World>
      <BigText lines={['WHAT HAPPENS WHEN', 'EVERY COUNTRY GETS', 'TRAPPED ON ONE ISLAND?']} size={92} opacity={hook} scale={0.8 + 0.2 * hookScale} />
      {f > 92 && <Sticker text="DAY 1" />}
      <Bubble x={250} y={1020} text="WHERE ARE WE?!" from={100} to={163} size={76} />
      <Bubble x={540} y={1020} text="LOOKS LIKE WE'RE STUCK HERE." from={166} to={246} />
      <Bubble x={830} y={1020} text="WHO BROUGHT US HERE?" from={249} to={328} />
    </AbsoluteFill>
  );
};

// ---------- scene 2: skyscraper ----------

const Hammer: React.FC<{ swing: number }> = ({ swing }) => (
  <g transform={`translate(${R * 0.85} ${-R * 0.1}) rotate(${swing})`}>
    <rect x={-8} y={-110} width={16} height={120} rx={6} fill="#8d6e63" stroke="#111" strokeWidth={4} />
    <rect x={-40} y={-140} width={80} height={40} rx={8} fill="#78909c" stroke="#111" strokeWidth={5} />
  </g>
);

const Building: React.FC<{ x: number; w: number; h: number; color: string; seed: string; lit?: boolean }> = ({ x, w, h, color, seed, lit = true }) => {
  const cols = Math.max(2, Math.floor(w / 46));
  const rows = Math.max(1, Math.floor((h - 30) / 60));
  const ww = (w - 20) / cols - 12;
  return (
    <g>
      <rect x={x - w / 2} y={GROUND - h} width={w} height={h} fill={color} stroke="#111" strokeWidth={6} />
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => (
          <rect
            key={`${r}-${c}`}
            x={x - w / 2 + 16 + c * (ww + 12)}
            y={GROUND - h + 22 + r * 60}
            width={ww}
            height={34}
            rx={4}
            fill={lit && random(`${seed}${r}${c}`) > 0.4 ? '#fff59d' : '#b3e5fc'}
          />
        )),
      )}
    </g>
  );
};

const SkyscraperScene: React.FC = () => {
  const f = useCurrentFrame();
  const grow = interpolate(f, [25, 230], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const h = 40 + grow * 1000;
  const building = 1;
  const done = f > 232;
  const hammering = f > 20 && f < 232;
  const swing = hammering ? -30 + Math.abs(Math.sin(f / 3)) * 70 : 10;
  const great = f >= 270;
  const out = interpolate(f, [25, 230, 240, 268], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.quad) });
  return (
    <ViewCtx.Provider value={lerpView(DEFAULT_VIEW, FULL_VIEW, out)}>
    <AbsoluteFill>
      <World>
        <g opacity={building}>
          <Building x={810} w={300} h={h} color="#90a4ae" seed="sky" />
          <rect x={810 - 160} y={GROUND - h - 30} width={320} height={34} fill="#607d8b" stroke="#111" strokeWidth={6} />
          {done && (
            <g transform={`translate(810 ${GROUND - h - 30})`}>
              <line x1={0} y1={0} x2={0} y2={-150} stroke="#111" strokeWidth={8} />
              <g transform={`translate(0 -150) skewY(${Math.sin(f / 5) * 6})`}>
                <defs>
                  <clipPath id="mini-flag">
                    <rect width={120} height={74} />
                  </clipPath>
                </defs>
                <g clipPath="url(#mini-flag)" transform="translate(60 37) scale(1 0.6)">
                  <Flag name="usa" r={62} />
                </g>
                <rect width={120} height={74} fill="none" stroke="#111" strokeWidth={5} />
              </g>
            </g>
          )}
          {hammering &&
            Array.from({ length: 6 }).map((_, i) => {
              const t = ((f + i * 7) % 40) / 40;
              return <circle key={i} cx={650 + i * 60 + t * 20} cy={GROUND - t * 80} r={20 + t * 25} fill="#d7ccc8" opacity={1 - t} />;
            })}
        </g>
        <Ball id="s-usa" flag="usa" x={230} y={BALL_Y + (hammering ? -Math.abs(Math.sin(f / 3)) * 18 : bob(f, 0))} eyes={great ? 'happy' : 'normal'} look={0.8}>
          <Hammer swing={swing} />
        </Ball>
        <Ball id="s-rus" flag="rus" x={500} y={BALL_Y + bob(f, 1)} r={95} eyes={f > 110 && f < 270 ? 'smug' : 'normal'} look={f < 270 ? 0.9 : -0.9} />
      </World>
      <Sticker text="DAY 1" />
      <Bubble x={500} y={1080} text="WHY ARE YOU BUILDING A SKYSCRAPER?" from={110} to={240} />
      <Bubble x={230} y={1060} text="BECAUSE I'M MAKING THIS ISLAND GREAT AGAIN!" from={272} to={448} size={74} />
    </AbsoluteFill>
    </ViewCtx.Provider>
  );
};

// ---------- scene 3: instant city ----------

const CITY = [
  { x: 590, w: 90, h: 330, c: '#ef9a9a' },
  { x: 680, w: 80, h: 520, c: '#ffcc80' },
  { x: 765, w: 90, h: 260, c: '#a5d6a7' },
  { x: 850, w: 80, h: 610, c: '#90caf9' },
  { x: 935, w: 90, h: 400, c: '#ce93d8' },
  { x: 1020, w: 80, h: 300, c: '#80cbc4' },
  { x: 640, w: 70, h: 200, c: '#fff59d' },
  { x: 900, w: 70, h: 220, c: '#ffab91' },
];

const CityScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const working = f > 30 && f < 100;
  const watch = spring({ frame: f - 100, fps, config: { damping: 10 } });
  const shocked = f >= 130 && f < 285;
  return (
    <AbsoluteFill>
      <World palms={false}>
        {CITY.map((b, i) => {
          const s = spring({ frame: f - 35 - i * 7, fps, config: { damping: 8, stiffness: 160 } });
          return (
            <g key={i} transform={`translate(${b.x} ${GROUND}) scale(1 ${s}) translate(${-b.x} ${-GROUND})`}>
              <Building x={b.x} w={b.w} h={b.h} color={b.c} seed={`c${i}`} />
            </g>
          );
        })}
        {working &&
          Array.from({ length: 8 }).map((_, i) => (
            <line
              key={i}
              x1={330 + random(`l${i}${Math.floor(f / 3)}`) * 60}
              y1={BALL_Y - 120 + i * 30}
              x2={530 + random(`m${i}${Math.floor(f / 3)}`) * 80}
              y2={BALL_Y - 120 + i * 30}
              stroke="#111"
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.6}
            />
          ))}
        <Ball
          id="c-usa"
          flag="usa"
          x={170}
          y={BALL_Y + (shocked ? -Math.abs(Math.sin(f / 4)) * 30 : bob(f, 0))}
          eyes={f > 60 ? 'wide' : 'normal'}
          look={0.9}
        />
        <Ball
          id="c-chn"
          flag="chn"
          x={420 + (working ? (random(`j${f}`) - 0.5) * 30 : 0)}
          y={BALL_Y + bob(f, 2)}
          eyes={f >= 285 ? 'smug' : 'normal'}
          look={f >= 285 ? -0.8 : 0.6}
        />
      </World>
      <div
        style={{
          position: 'absolute',
          right: 60,
          top: 360,
          transform: `scale(${watch}) rotate(6deg)`,
          background: '#fff',
          border: '6px solid #111',
          borderRadius: 24,
          padding: '12px 26px 4px',
          fontFamily: COMIC,
          fontSize: 60,
          color: '#d32f2f',
        }}
      >
        ⏱ 3 SECONDS
      </div>
      <Sticker text="DAY 1" />
      <Bubble x={170} y={1060} text="HOW DID YOU DO THAT?!" from={130} to={280} size={80} />
      <Bubble x={420} y={1060} text="EFFICIENCY." from={285} to={448} size={84} />
    </AbsoluteFill>
  );
};

// ---------- scene 4: cleaning robot ----------

const TRASH = Array.from({ length: 11 }).map((_, i) => ({
  x: 300 + i * 62 + random(`tx${i}`) * 30,
  y: GROUND + 20 + random(`ty${i}`) * 140,
  kind: i % 3,
  rot: random(`tr${i}`) * 80 - 40,
}));

const Robot: React.FC<{ x: number }> = ({ x }) => {
  const f = useCurrentFrame();
  const broom = -35 + Math.sin(f / 4) * 18;
  const blink = f % 60 < 4;
  return (
    <g transform={`translate(${x} ${GROUND + 40}) translate(0 ${Math.abs(Math.sin(f / 5)) * -6})`}>
      <rect x={-110} y={-55} width={220} height={55} rx={27} fill="#455a64" stroke="#111" strokeWidth={6} />
      {[-70, 0, 70].map((wx) => (
        <g key={wx} transform={`translate(${wx} -27) rotate(${f * 12})`}>
          <circle r={20} fill="#90a4ae" stroke="#111" strokeWidth={4} />
          <line x1={-14} y1={0} x2={14} y2={0} stroke="#111" strokeWidth={4} />
        </g>
      ))}
      <rect x={-100} y={-265} width={200} height={210} rx={26} fill="#eceff1" stroke="#111" strokeWidth={6} />
      <circle cx={0} cy={-160} r={42} fill="#bc002d" />
      <rect x={-82} y={-390} width={164} height={115} rx={24} fill="#eceff1" stroke="#111" strokeWidth={6} />
      <rect x={-62} y={-365} width={124} height={56} rx={16} fill="#263238" />
      {[-28, 28].map((ex) => (
        <rect key={ex} x={ex - 14} y={blink ? -340 : -352} width={28} height={blink ? 4 : 28} rx={8} fill="#18ffff" />
      ))}
      <line x1={0} y1={-390} x2={0} y2={-440} stroke="#111" strokeWidth={6} />
      <circle cx={0} cy={-448} r={13} fill={f % 20 < 10 ? '#ff1744' : '#ff8a80'} stroke="#111" strokeWidth={4} />
      <g transform={`translate(100 -210) rotate(${broom})`}>
        <rect x={-10} y={0} width={20} height={250} rx={8} fill="#8d6e63" stroke="#111" strokeWidth={4} />
        <path d="M-50 240 L50 240 L65 300 L-65 300Z" fill="#ffca28" stroke="#111" strokeWidth={5} />
      </g>
    </g>
  );
};

const RobotScene: React.FC = () => {
  const f = useCurrentFrame();
  const rx = interpolate(f, [30, 380], [-260, 1380], clamp);
  const reach = rx + 240;
  return (
    <AbsoluteFill>
      <World>
        <Robot x={rx} />
        {TRASH.map((t, i) => {
          if (reach > t.x + 15) {
            const age = (reach - t.x) / 4.6;
            if (age > 18) return null;
            const s = Math.sin((age / 18) * Math.PI);
            return <path key={i} d={starPath(t.x, t.y - 20, 34 * s, -90)} fill="#fff176" stroke="#111" strokeWidth={3} />;
          }
          return (
            <g key={i} transform={`translate(${t.x} ${t.y}) rotate(${t.rot})`}>
              {t.kind === 0 && <rect x={-16} y={-26} width={32} height={52} rx={6} fill="#e53935" stroke="#111" strokeWidth={4} />}
              {t.kind === 1 && <path d="M-30 0 Q0 -40 30 0 Q0 -20 -30 0Z" fill="#ffeb3b" stroke="#111" strokeWidth={4} />}
              {t.kind === 2 && <rect x={-12} y={-34} width={24} height={60} rx={8} fill="#66bb6a" stroke="#111" strokeWidth={4} opacity={0.9} />}
            </g>
          );
        })}
        <Ball id="r-jpn" flag="jpn" x={170} y={BALL_Y + bob(f, 0)} eyes={f >= 290 ? 'happy' : 'normal'} look={Math.max(-0.9, Math.min(0.9, (rx - 170) / 300))} />
        <Ball
          id="r-rus"
          flag="rus"
          x={890}
          y={BALL_Y + bob(f, 1)}
          r={95}
          eyes={f >= 150 && f < 290 ? 'smug' : 'normal'}
          look={Math.max(-0.9, Math.min(0.9, (rx - 890) / 300))}
        />
      </World>
      <Sticker text="DAY 1" />
      <Bubble x={890} y={1090} text="AT LEAST SOMEONE IS WORKING." from={150} to={285} />
      <Bubble x={170} y={1060} text="TECHNOLOGY!" from={290} to={448} size={88} />
    </AbsoluteFill>
  );
};

// ---------- scene 5: the yurt ----------

const Yurt: React.FC<{ x: number }> = ({ x }) => (
  <g transform={`translate(${x} ${GROUND})`}>
    <rect x={-250} y={-300} width={500} height={300} fill="#f5efe0" stroke="#111" strokeWidth={7} />
    <rect x={-250} y={-250} width={500} height={44} fill="#c62828" />
    {Array.from({ length: 12 }).map((_, i) => (
      <path key={i} d={`M${-240 + i * 42} -228 l21 -16 l21 16 l-21 16Z`} fill="#ffd54f" />
    ))}
    <path d="M-280 -300 Q-200 -470 0 -520 Q200 -470 280 -300Z" fill="#fbf7ee" stroke="#111" strokeWidth={7} strokeLinejoin="round" />
    {[-200, -110, 0, 110, 200].map((dx) => (
      <path key={dx} d={`M${dx * 1.3} -300 Q${dx * 0.7} -440 0 -515`} stroke="#c62828" strokeWidth={10} fill="none" />
    ))}
    <ellipse cx={0} cy={-520} rx={46} ry={16} fill="#8d6e63" stroke="#111" strokeWidth={5} />
    <rect x={-65} y={-200} width={130} height={200} rx={8} fill="#8e1b1b" stroke="#111" strokeWidth={6} />
    <path d="M-40 -150 q40 -40 80 0 M-40 -90 q40 -40 80 0" stroke="#ffd54f" strokeWidth={8} fill="none" />
  </g>
);

const House: React.FC<{ x: number; y: number; c: string; s?: number; seed: number }> = ({ x, y, c, s = 1, seed }) => {
  const f = useCurrentFrame();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 1, 2].map((k) => {
        const t = ((f + k * 20 + seed * 9) % 60) / 60;
        return <circle key={k} cx={35 + t * 20} cy={-150 - t * 120} r={14 + t * 18} fill="#eeeeee" opacity={(1 - t) * 0.7} />;
      })}
      <rect x={25} y={-150} width={22} height={50} fill="#6d4c41" stroke="#111" strokeWidth={4} />
      <rect x={-60} y={-90} width={120} height={90} fill={c} stroke="#111" strokeWidth={5} />
      <path d="M-75 -88 L0 -150 L75 -88Z" fill="#8d2b2b" stroke="#111" strokeWidth={5} strokeLinejoin="round" />
      <rect x={-40} y={-65} width={32} height={30} rx={4} fill={f % 50 < 47 ? '#ffe082' : '#ffca28'} stroke="#111" strokeWidth={3} />
      <rect x={10} y={-50} width={30} height={50} rx={4} fill="#5d4037" stroke="#111" strokeWidth={3} />
    </g>
  );
};

const YurtInside: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const houses = [
    { x: 150, y: 1180, c: '#ffcc80' },
    { x: 330, y: 1150, c: '#a5d6a7' },
    { x: 520, y: 1190, c: '#90caf9' },
    { x: 720, y: 1150, c: '#f48fb1' },
    { x: 920, y: 1180, c: '#fff59d' },
    { x: 240, y: 1390, c: '#ce93d8' },
    { x: 840, y: 1390, c: '#80cbc4' },
  ];
  const wheelRot = f * 0.8;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute' }}>
      <defs>
        <radialGradient id="warm" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#ffe0b2" />
          <stop offset="0.6" stopColor="#ffb74d" />
          <stop offset="1" stopColor="#bf360c" />
        </radialGradient>
      </defs>
      <rect width={1080} height={1920} fill="url(#warm)" />
      {Array.from({ length: 13 }).map((_, i) => {
        const x = -300 + i * 140;
        return <line key={i} x1={540} y1={120} x2={x} y2={760} stroke="#b71c1c" strokeWidth={14} opacity={0.75} />;
      })}
      <circle cx={540} cy={120} r={95} fill="#8d6e63" stroke="#111" strokeWidth={8} />
      <circle cx={540} cy={120} r={60} fill="#81d4fa" />
      {[-25, 0, 25].map((k) => (
        <g key={k}>
          <line x1={540 + k} y1={60} x2={540 + k} y2={180} stroke="#5d4037" strokeWidth={8} />
          <line x1={480} y1={120 + k} x2={600} y2={120 + k} stroke="#5d4037" strokeWidth={8} />
        </g>
      ))}
      <rect x={0} y={740} width={1080} height={70} fill="#c62828" />
      {Array.from({ length: 16 }).map((_, i) => (
        <path key={i} d={`M${i * 70} 775 l35 -24 l35 24 l-35 24Z`} fill="#ffd54f" />
      ))}
      <path d="M-20 880 Q 540 820 1100 880" stroke="#5d4037" strokeWidth={4} fill="none" />
      {Array.from({ length: 14 }).map((_, i) => {
        const x = 20 + i * 78;
        const y = 880 - Math.sin((i / 13) * Math.PI) * 58 + 12;
        const on = (Math.floor(f / 8) + i) % 3 !== 0;
        return <circle key={i} cx={x} cy={y} r={13} fill={['#ff5252', '#ffeb3b', '#69f0ae', '#40c4ff'][i % 4]} opacity={on ? 1 : 0.45} />;
      })}
      <g transform="translate(540 1000)">
        <line x1={-70} y1={140} x2={0} y2={0} stroke="#5d4037" strokeWidth={10} />
        <line x1={70} y1={140} x2={0} y2={0} stroke="#5d4037" strokeWidth={10} />
        <g transform={`rotate(${wheelRot})`}>
          <circle r={110} fill="none" stroke="#6d4c41" strokeWidth={8} />
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={i} x1={0} y1={0} x2={110 * Math.cos((i * Math.PI) / 4)} y2={110 * Math.sin((i * Math.PI) / 4)} stroke="#6d4c41" strokeWidth={5} />
          ))}
        </g>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4 + (wheelRot * Math.PI) / 180;
          return <rect key={i} x={110 * Math.cos(a) - 16} y={110 * Math.sin(a) - 4} width={32} height={26} rx={6} fill={['#ef5350', '#42a5f5', '#66bb6a', '#ffca28'][i % 4]} stroke="#111" strokeWidth={3} />;
        })}
      </g>
      {houses.map((h, i) => (
        <House key={i} x={h.x} y={h.y} c={h.c} seed={i} s={i >= 5 ? 1.25 : 1} />
      ))}
      <rect x={0} y={1460} width={1080} height={460} fill="#8e1b1b" />
      {Array.from({ length: 9 }).map((_, i) => (
        <path key={i} d={`M${60 + i * 120} 1560 l60 -50 l60 50 l-60 50Z`} fill="none" stroke="#ffd54f" strokeWidth={8} />
      ))}
      {(
        [
          ['usa', 170],
          ['rus', 420],
          ['chn', 660],
          ['jpn', 900],
        ] as [FlagName, number][]
      ).map(([flag, x], i) => {
        const pop = spring({ frame: f - 10 - i * 5, fps, config: { damping: 9 } });
        return (
          <g key={flag}>
            <Ball id={`in-${flag}`} flag={flag} x={x} y={1840 - pop * 120} r={120} eyes="wide" look={Math.sin(f / 15 + i) * 0.6} />
            <text
              x={x}
              y={1580 - pop * 120}
              textAnchor="middle"
              fontFamily={COMIC}
              fontSize={110}
              fill="#fff"
              stroke="#111"
              strokeWidth={10}
              paintOrder="stroke"
              opacity={pop}
            >
              !!
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const YurtScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: f - 5, fps, config: { damping: 14, mass: 1.4 } });
  const yx = 1450 - enter * 690;
  const kx = 1300 - enter * 880;
  const zoom = interpolate(f, [270, 318], [1, 9], { ...clamp, easing: Easing.in(Easing.cubic) });
  const flash = interpolate(f, [305, 320, 335], [0, 1, 0], clamp);
  const inside = f >= 320;
  const [doorX, doorY] = toScreen(DEFAULT_VIEW, yx, GROUND - 100);
  return (
    <AbsoluteFill>
      {!inside && (
        <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${doorX}px ${doorY}px` }}>
          <World>
            <Yurt x={yx} />
            <Ball id="y-usa" flag="usa" x={170} y={BALL_Y + bob(f, 0)} eyes={f >= 90 && f < 185 ? 'wide' : 'normal'} look={0.9} />
            <Ball
              id="y-kgz"
              flag="kgz"
              x={kx}
              y={BALL_Y - (enter < 0.98 ? Math.abs(Math.sin(f / 4)) * 40 : 0) + bob(f, 2)}
              eyes={f >= 185 ? 'happy' : 'normal'}
              look={-0.8}
            />
          </World>
          <Sticker text="DAY 1" />
        </AbsoluteFill>
      )}
      {inside && <YurtInside />}
      <AbsoluteFill style={{ background: '#fff8e1', opacity: flash }} />
      <Bubble x={170} y={1060} text="WHAT'S THAT?" from={90} to={180} size={80} />
      <Bubble x={420} y={1060} text="HOME." from={185} to={265} size={90} />
    </AbsoluteFill>
  );
};

// ---------- scene 6: sinking ----------

const Shovel: React.FC = () => (
  <g transform={`translate(${R * 0.95} ${R * 0.1}) rotate(12)`}>
    <rect x={-8} y={-200} width={16} height={220} rx={6} fill="#8d6e63" stroke="#111" strokeWidth={4} />
    <rect x={-26} y={-220} width={52} height={20} rx={8} fill="#8d6e63" stroke="#111" strokeWidth={4} />
    <path d="M-34 15 L34 15 L28 75 Q0 100 -28 75Z" fill="#90a4ae" stroke="#111" strokeWidth={5} />
  </g>
);

const SinkingScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame: f - 5, fps, config: { damping: 8, stiffness: 180 } });
  const shake = f < 40 ? (random(`sh${f}`) - 0.5) * 30 * (1 - f / 40) : 0;
  const titleUp = interpolate(f, [120, 150], [0, 1], clamp);
  const water = interpolate(f, [30, 300], [1960, 1250], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const pan = interpolate(f, [300, 322], [0, -1080], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const theEnd = spring({ frame: f - 490, fps, config: { damping: 10 } });
  const group: [FlagName, number][] = [
    ['rus', 200],
    ['chn', 430],
    ['jpn', 660],
    ['kgz', 890],
  ];
  return (
    <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
      <AbsoluteFill style={{ transform: `translateX(${pan}px)` }}>
        <World
          front={
            <>
              <Waves y={water} color="#0288d1" amp={16} speed={5} opacity={0.88} />
              <Waves y={water + 20} color="#01579b" amp={12} speed={-4} opacity={0.5} />
            </>
          }
        >
          {group.map(([flag, x], i) => {
            const panic = f > 150 && f < 300;
            return (
              <Ball
                key={flag}
                id={`k-${flag}`}
                flag={flag}
                x={x}
                y={BALL_Y + 20 + (panic ? -Math.abs(Math.sin(f / 5 + i)) * 20 : bob(f, i))}
                r={95}
                eyes={f > 40 ? 'wide' : 'normal'}
                look={Math.sin(f / 14 + i * 1.7)}
              />
            );
          })}
        </World>
      </AbsoluteFill>
      {f >= 300 && (
        <AbsoluteFill style={{ transform: `translateX(${pan + 1080}px)` }}>
          <svg width={1080} height={1920} viewBox={viewBox(DEFAULT_VIEW)} style={{ position: 'absolute' }}>
            <defs>
              <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#4fc3f7" />
                <stop offset="1" stopColor="#e1f5fe" />
              </linearGradient>
            </defs>
            <rect x={-200} y={-200} width={1480} height={2400} fill="url(#sky2)" />
            <Waves y={860} color="#29b6f6" amp={8} speed={2} />
            <Waves y={900} color="#0288d1" amp={10} speed={-3} opacity={0.6} />
            <ellipse cx={540} cy={1390} rx={260} ry={80} fill="#e0b860" />
            <ellipse cx={540} cy={1380} rx={240} ry={70} fill="#f4d58d" />
            <path d="M720 1360 q40 -60 90 0Z" fill="#d7b46a" stroke="#111" strokeWidth={4} />
            <Palm x={380} y={1370} s={0.7} />
            <Ball id="end-usa" flag="usa" x={570} y={1380 - R} eyes={f >= 340 ? 'closed' : 'normal'} look={-0.5}>
              <Shovel />
              {f >= 340 && <path d={`M${R * 0.55} ${-R * 0.7} q14 26 0 40 q-14 -14 0 -40Z`} fill="#4fc3f7" stroke="#111" strokeWidth={3} />}
            </Ball>
            <Waves y={1420} color="#0288d1" amp={10} speed={4} opacity={0.85} />
          </svg>
        </AbsoluteFill>
      )}
      <BigText
        lines={['DAY 2:', 'THE ISLAND IS SINKING!']}
        size={118}
        color="#ff1744"
        top={interpolate(titleUp, [0, 1], [520, 120])}
        scale={slam * interpolate(titleUp, [0, 1], [1, 0.62])}
        opacity={f < 300 ? 1 : interpolate(f, [300, 312], [1, 0], clamp)}
      />
      <Bubble x={200} y={1100} text="WELL… WHO'S RESPONSIBLE?" from={160} to={298} size={72} />
      <Bubble x={570} y={1180} text="MY BAD." from={345} to={485} size={96} />
      {f >= 490 && (
        <AbsoluteFill style={{ background: `rgba(0,0,0,${0.55 * Math.min(1, theEnd)})` }}>
          <BigText lines={['THE END']} size={170} color="#ffd600" top={700} scale={theEnd} />
          <BigText lines={['WHAT IF EVERY COUNTRY', 'LIVED ON ONE ISLAND?']} size={70} top={950} opacity={theEnd} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------- voice ----------

// [global frame, file in public/voice-edge]
const VOICE: [number, string][] = [
  [0, 'hook'],
  [101, 'usa_where'],
  [167, 'rus_stuck'],
  [250, 'chn_who'],
  [330 + 112, 'rus_why'],
  [330 + 274, 'usa_great'],
  [780 + 132, 'usa_how'],
  [780 + 287, 'chn_eff'],
  [1230 + 152, 'rus_work'],
  [1230 + 292, 'jpn_tech'],
  [1680 + 92, 'usa_what'],
  [1680 + 187, 'kgz_home'],
  [2130 + 6, 'day2'],
  [2130 + 162, 'rus_resp'],
  [2130 + 347, 'usa_bad'],
];

// ---------- composition ----------

const COMPONENTS: Record<(typeof SCENES)[number]['id'], React.FC> = {
  wake: WakeScene,
  skyscraper: SkyscraperScene,
  city: CityScene,
  robot: RobotScene,
  yurt: YurtScene,
  sinking: SinkingScene,
};

export const Island: React.FC = () => {
  let start = 0;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {SCENES.map((s) => {
        const Comp = COMPONENTS[s.id];
        const from = start;
        start += s.dur;
        return (
          <Sequence key={s.id} from={from} durationInFrames={s.dur}>
            <SceneCut dur={s.dur}>
              <Comp />
            </SceneCut>
          </Sequence>
        );
      })}
      {VOICE.map(([at, file]) => (
        <Sequence key={file} from={at} layout="none">
          <Audio src={staticFile(`voice-edge/${file}.mp3`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
