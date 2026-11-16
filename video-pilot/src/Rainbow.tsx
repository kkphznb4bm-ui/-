import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ---------- palette & timing ----------

const COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#29b6f6', '#1e4fd8', '#8e44ad'];
const COLOR_NAMES = ['красный', 'оранжевый', 'жёлтый', 'зелёный', 'голубой', 'синий', 'фиолетовый'];
const FONT = 'Inter, "DejaVu Sans", sans-serif';

const SCENES = [
  { id: 'title', dur: 240 },
  { id: 'conditions', dur: 480 },
  { id: 'prism', dur: 480 },
  { id: 'drop', dur: 570 },
  { id: 'arc', dur: 480 },
  { id: 'outro', dur: 270 },
] as const;

export const TOTAL_FRAMES = SCENES.reduce((s, x) => s + x.dur, 0);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// ---------- shared pieces ----------

const SceneFade: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 15, dur - 15, dur], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

type Cap = { from: number; to: number; text: string };

const Captions: React.FC<{ items: Cap[]; dark?: boolean }> = ({ items, dark }) => {
  const f = useCurrentFrame();
  const cur = items.find((c) => f >= c.from && f < c.to);
  if (!cur) return null;
  const local = f - cur.from;
  const len = cur.to - cur.from;
  const opacity = interpolate(local, [0, 10, len - 10, len], [0, 1, 1, 0], clamp);
  const y = interpolate(local, [0, 12], [20, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 70,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontFamily: FONT,
          fontSize: 50,
          fontWeight: 600,
          color: dark ? '#111827' : '#fff',
          background: dark ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.72)',
          padding: '18px 40px',
          borderRadius: 22,
          maxWidth: 1600,
          textAlign: 'center',
          lineHeight: 1.25,
        }}
      >
        {cur.text}
      </div>
    </div>
  );
};

const Sky: React.FC<{ top: string; bottom: string }> = ({ top, bottom }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)` }} />
);

const Hills: React.FC = () => (
  <svg width={1920} height={1080} style={{ position: 'absolute' }}>
    <path d="M0 820 Q 420 700 900 800 T 1920 760 L1920 1080 L0 1080 Z" fill="#7cc36b" />
    <path d="M0 900 Q 600 820 1100 900 T 1920 880 L1920 1080 L0 1080 Z" fill="#4f9d4a" />
  </svg>
);

const Cloud: React.FC<{ x: number; y: number; s?: number; color?: string }> = ({ x, y, s = 1, color = '#fff' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={color}>
    <ellipse cx={0} cy={0} rx={110} ry={55} />
    <ellipse cx={-80} cy={20} rx={80} ry={45} />
    <ellipse cx={85} cy={18} rx={90} ry={48} />
    <ellipse cx={20} cy={-40} rx={75} ry={55} />
  </g>
);

const Sun: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 80 }) => {
  const f = useCurrentFrame();
  const pulse = 1 + 0.04 * Math.sin(f / 10);
  return (
    <g transform={`translate(${x} ${y})`}>
      <g transform={`rotate(${f * 0.6})`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <rect
            key={i}
            x={-6}
            y={-r * 1.9}
            width={12}
            height={r * 0.55}
            rx={6}
            fill="#ffd54f"
            transform={`rotate(${i * 30})`}
          />
        ))}
      </g>
      <circle r={r * pulse} fill="#ffca28" />
      <circle r={r * 0.75 * pulse} fill="#ffe082" />
    </g>
  );
};

const Person: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#263238">
    <circle cx={0} cy={-150} r={26} />
    <rect x={-22} y={-120} width={44} height={80} rx={18} />
    <rect x={-20} y={-48} width={16} height={60} rx={8} />
    <rect x={4} y={-48} width={16} height={60} rx={8} />
  </g>
);

const Rain: React.FC<{ x0: number; x1: number; y0: number; y1: number; n: number; opacity?: number }> = ({
  x0,
  x1,
  y0,
  y1,
  n,
  opacity = 1,
}) => {
  const f = useCurrentFrame();
  const h = y1 - y0;
  return (
    <g opacity={opacity}>
      {Array.from({ length: n }).map((_, i) => {
        const x = x0 + random(`x${i}`) * (x1 - x0);
        const speed = 14 + random(`s${i}`) * 10;
        const y = y0 + ((random(`o${i}`) * h + f * speed) % h);
        return <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 26} stroke="#64b5f6" strokeWidth={4} strokeLinecap="round" />;
      })}
    </g>
  );
};

// progressive stroke drawing helper
const drawProps = (len: number, progress: number) => ({
  strokeDasharray: `${len} ${len}`,
  strokeDashoffset: len * (1 - progress),
});

// ---------- scene 1: title ----------

const TitleScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 10, fps, config: { damping: 12 } });
  const sub = interpolate(f, [45, 70], [0, 1], clamp);
  const arc = interpolate(f, [20, 140], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill>
      <Sky top="#4fc3f7" bottom="#e1f5fe" />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        {COLORS.map((c, i) => {
          const r = 760 - i * 34;
          const len = Math.PI * r;
          return (
            <path
              key={c}
              d={`M ${960 - r} 980 A ${r} ${r} 0 0 1 ${960 + r} 980`}
              stroke={c}
              strokeWidth={34}
              fill="none"
              opacity={0.55}
              {...drawProps(len, arc)}
            />
          );
        })}
        <Cloud x={300 + f * 0.4} y={200} s={0.9} />
        <Cloud x={1600 - f * 0.3} y={160} s={0.7} />
      </svg>
      <Hills />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <div
          style={{
            fontFamily: FONT,
            fontSize: 120,
            fontWeight: 800,
            color: '#0d1b2a',
            transform: `scale(${pop})`,
            textShadow: '0 4px 0 rgba(255,255,255,0.8)',
          }}
        >
          Откуда берётся радуга?
        </div>
        <div style={{ fontFamily: FONT, fontSize: 44, fontWeight: 500, color: '#1b3a57', opacity: sub, marginTop: 20 }}>
          Короткое 2D-объяснение
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------- scene 2: two conditions ----------

const ConditionsScene: React.FC = () => {
  const f = useCurrentFrame();
  const sunGlow = interpolate(f, [130, 160, 260, 290], [0, 1, 1, 0], clamp);
  const rainGlow = interpolate(f, [290, 320, 440, 470], [0, 1, 1, 0], clamp);
  const rainIn = interpolate(f, [20, 80], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Sky top="#81d4fa" bottom="#e3f2fd" />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <circle cx={330} cy={260} r={190} fill="#fff59d" opacity={0.6 * sunGlow} />
        <Sun x={330} y={260} />
        <Cloud x={1450} y={230} s={1.6} color="#90a4ae" />
        <Rain x0={1160} x1={1780} y0={300} y1={860} n={70} opacity={rainIn} />
        <rect x={1120} y={280} width={700} height={600} rx={40} fill="none" stroke="#1565c0" strokeWidth={8} strokeDasharray="20 16" opacity={rainGlow} />
      </svg>
      <Hills />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <Person x={820} y={880} s={1.2} />
        <path d="M 860 700 L 1060 700" stroke="#263238" strokeWidth={6} markerEnd="url(#arrow)" opacity={rainGlow} />
        <defs>
          <marker id="arrow" markerWidth={10} markerHeight={10} refX={6} refY={5} orient="auto">
            <path d="M0 0 L10 5 L0 10 Z" fill="#263238" />
          </marker>
        </defs>
      </svg>
      <Captions
        items={[
          { from: 15, to: 130, text: 'Чтобы увидеть радугу, нужны две вещи' },
          { from: 135, to: 290, text: '1. Солнце — у вас за спиной, невысоко над горизонтом' },
          { from: 295, to: 470, text: '2. Капли дождя — перед вами' },
        ]}
      />
    </AbsoluteFill>
  );
};

// ---------- scene 3: prism / white light is a mix ----------

const PrismScene: React.FC = () => {
  const f = useCurrentFrame();
  const beam = interpolate(f, [20, 90], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const fan = interpolate(f, [100, 190], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const labels = interpolate(f, [200, 240], [0, 1], clamp);
  const prism = { a: [960, 330], b: [760, 690], c: [1160, 690] };
  const hit: [number, number] = [855, 520];
  const exit: [number, number] = [1065, 520];
  return (
    <AbsoluteFill style={{ background: '#0b1324' }}>
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b3e5fc" stopOpacity={0.55} />
            <stop offset="1" stopColor="#e1f5fe" stopOpacity={0.15} />
          </linearGradient>
        </defs>
        <line x1={120} y1={600} x2={hit[0]} y2={hit[1]} stroke="#fff" strokeWidth={14} strokeLinecap="round" {...drawProps(760, beam)} />
        <line x1={hit[0]} y1={hit[1]} x2={exit[0]} y2={exit[1]} stroke="#fff" strokeWidth={10} opacity={beam >= 1 ? 0.8 : 0} />
        {COLORS.map((c, i) => {
          const ty = 470 + i * 62;
          const len = Math.hypot(1560 - exit[0], ty - exit[1]);
          return (
            <g key={c}>
              <line x1={exit[0]} y1={exit[1]} x2={1560} y2={ty} stroke={c} strokeWidth={16} strokeLinecap="round" {...drawProps(len, fan)} />
              <text x={1585} y={ty + 12} fill={c} fontFamily={FONT} fontSize={32} fontWeight={600} opacity={labels}>
                {COLOR_NAMES[i]}
              </text>
            </g>
          );
        })}
        <polygon
          points={`${prism.a.join(',')} ${prism.b.join(',')} ${prism.c.join(',')}`}
          fill="url(#glass)"
          stroke="#e1f5fe"
          strokeWidth={4}
        />
        <text x={150} y={560} fill="#fff" fontFamily={FONT} fontSize={36} fontWeight={600} opacity={interpolate(f, [40, 70], [0, 1], clamp)}>
          белый свет
        </text>
      </svg>
      <Captions
        items={[
          { from: 15, to: 150, text: 'Солнечный свет кажется белым…' },
          { from: 155, to: 310, text: '…но на самом деле это смесь всех цветов' },
          { from: 315, to: 470, text: 'При преломлении каждый цвет отклоняется по-своему — и они расходятся' },
        ]}
      />
    </AbsoluteFill>
  );
};

// ---------- scene 4: inside a raindrop (real Snell geometry) ----------

type V = [number, number];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1];
const norm = (a: V): V => mul(a, 1 / Math.hypot(a[0], a[1]));

// N must point against I; eta = n1/n2
const refract = (I: V, N: V, eta: number): V => {
  const c = dot(N, I);
  const k = 1 - eta * eta * (1 - c * c);
  return norm(add(mul(I, eta), mul(N, -(eta * c + Math.sqrt(k)))));
};
const reflect = (I: V, N: V): V => norm(add(I, mul(N, -2 * dot(I, N))));

const R = 250;
const C: V = [1060, 330];
const B = 0.86; // impact parameter near the rainbow ray

// refractive indices — the spread is exaggerated so the separation is visible
const N_IDX = [1.331, 1.336, 1.341, 1.346, 1.352, 1.358, 1.365];

const traceRay = (n: number) => {
  const d0: V = [1, 0];
  const p1: V = [-Math.sqrt(1 - B * B) * R, -B * R];
  const t1 = refract(d0, norm(p1), 1 / n);
  const p2 = add(p1, mul(t1, -2 * dot(p1, t1)));
  const r2 = reflect(t1, norm(p2));
  const p3 = add(p2, mul(r2, -2 * dot(p2, r2)));
  const out = refract(r2, mul(norm(p3), -1), n);
  const deviationDeg = (Math.acos(dot(out, [-1, 0])) * 180) / Math.PI;
  return { p1, p2, p3, out, deviationDeg };
};

const DropScene: React.FC = () => {
  const f = useCurrentFrame();
  const rays = N_IDX.map(traceRay);
  const p1 = add(C, rays[0].p1);
  const inProg = interpolate(f, [20, 90], [0, 1], clamp);
  const s1 = interpolate(f, [130, 200], [0, 1], clamp);
  const s2 = interpolate(f, [250, 320], [0, 1], clamp);
  const s3 = interpolate(f, [370, 440], [0, 1], clamp);
  const angle = interpolate(f, [450, 480], [0, 1], clamp);
  const red = rays[0];
  const p3r = add(C, red.p3);
  const aStart = 0; // reference: reversed incoming direction (pointing left)
  return (
    <AbsoluteFill style={{ background: '#0b1324' }}>
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <defs>
          <radialGradient id="drop" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#e1f5fe" stopOpacity={0.5} />
            <stop offset="1" stopColor="#4fc3f7" stopOpacity={0.15} />
          </radialGradient>
        </defs>
        <circle cx={C[0]} cy={C[1]} r={R} fill="url(#drop)" stroke="#81d4fa" strokeWidth={4} />
        <line x1={100} y1={p1[1]} x2={p1[0]} y2={p1[1]} stroke="#fff" strokeWidth={10} strokeLinecap="round" {...drawProps(p1[0] - 100, inProg)} />
        {rays.map((r, i) => {
          const a = add(C, r.p1);
          const b = add(C, r.p2);
          const c = add(C, r.p3);
          const e = add(c, mul(r.out, 380));
          const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
          return (
            <g key={i} stroke={COLORS[i]} strokeWidth={5} strokeLinecap="round" opacity={0.95}>
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} {...drawProps(l1, s1)} />
              <line x1={b[0]} y1={b[1]} x2={c[0]} y2={c[1]} {...drawProps(l2, s2)} />
              <line x1={c[0]} y1={c[1]} x2={e[0]} y2={e[1]} strokeWidth={8} {...drawProps(380, s3)} />
            </g>
          );
        })}
        {/* angle marker between reversed sunlight direction and the red exit ray */}
        <g opacity={angle}>
          <line x1={p3r[0]} y1={p3r[1]} x2={p3r[0] - 560} y2={p3r[1]} stroke="#fff" strokeWidth={3} strokeDasharray="12 10" />
          {(() => {
            const rr = 210;
            const a0 = Math.PI + aStart;
            const a1 = Math.atan2(red.out[1], red.out[0]);
            const sx = p3r[0] + rr * Math.cos(a0);
            const sy = p3r[1] + rr * Math.sin(a0);
            const ex = p3r[0] + rr * Math.cos(a1);
            const ey = p3r[1] + rr * Math.sin(a1);
            return (
              <>
                <path d={`M ${sx} ${sy} A ${rr} ${rr} 0 0 0 ${ex} ${ey}`} stroke="#fff" strokeWidth={3} fill="none" />
                <text x={p3r[0] - 520} y={p3r[1] + 90} fill="#fff" fontFamily={FONT} fontSize={40} fontWeight={700}>
                  ≈ 42°
                </text>
                <text x={p3r[0] - 520} y={p3r[1] + 135} fill="#ce93d8" fontFamily={FONT} fontSize={30} fontWeight={600}>
                  фиолетовый ≈ 40°
                </text>
              </>
            );
          })()}
        </g>
        <text x={1860} y={1040} textAnchor="end" fill="#90a4ae" fontFamily={FONT} fontSize={24}>
          разброс цветов преувеличен для наглядности
        </text>
      </svg>
      <Captions
        items={[
          { from: 15, to: 125, text: 'Посмотрим, что происходит внутри одной капли' },
          { from: 130, to: 245, text: 'Луч входит в каплю и преломляется — цвета начинают расходиться' },
          { from: 250, to: 365, text: 'Затем отражается от задней стенки капли' },
          { from: 370, to: 445, text: 'И выходит обратно, разделившись на цвета' },
          { from: 450, to: 560, text: 'Красный возвращается под углом около 42°, фиолетовый — около 40°' },
        ]}
      />
    </AbsoluteFill>
  );
};

// ---------- scene 5: the arc ----------

const ArcScene: React.FC = () => {
  const f = useCurrentFrame();
  const draw = interpolate(f, [60, 220], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cone = interpolate(f, [250, 290], [0, 1], clamp);
  const eye: V = [960, 830];
  const outer = 640;
  const red = traceRay(N_IDX[0]).deviationDeg;
  const ang = (red * Math.PI) / 180;
  return (
    <AbsoluteFill>
      <Sky top="#78909c" bottom="#cfd8dc" />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <Rain x0={0} x1={1920} y0={0} y1={900} n={90} opacity={0.35} />
        {COLORS.map((c, i) => {
          const r = outer - i * 30;
          const len = Math.PI * r;
          return (
            <path
              key={c}
              d={`M ${eye[0] - r} ${eye[1]} A ${r} ${r} 0 0 1 ${eye[0] + r} ${eye[1]}`}
              stroke={c}
              strokeWidth={30}
              fill="none"
              opacity={0.9}
              {...drawProps(len, draw)}
            />
          );
        })}
      </svg>
      <Hills />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <g opacity={cone}>
          <line x1={eye[0]} y1={eye[1] - 160} x2={eye[0] - outer * Math.sin(ang) * 1.1} y2={eye[1] - outer * Math.cos(ang) * 1.1 - 40} stroke="#fff" strokeWidth={4} strokeDasharray="14 10" />
          <line x1={eye[0]} y1={eye[1] - 160} x2={eye[0] + outer * Math.sin(ang) * 1.1} y2={eye[1] - outer * Math.cos(ang) * 1.1 - 40} stroke="#fff" strokeWidth={4} strokeDasharray="14 10" />
          <text x={eye[0]} y={eye[1] - 250} textAnchor="middle" fill="#fff" fontFamily={FONT} fontSize={44} fontWeight={700}>
            линии взгляда под одинаковым углом
          </text>
        </g>
        <Person x={eye[0]} y={eye[1] + 30} s={1.1} />
      </svg>
      <Captions
        items={[
          { from: 15, to: 245, text: 'Миллионы капель посылают вам свет — но каждый цвет видно только под своим углом' },
          { from: 250, to: 360, text: 'Все точки под одинаковым углом к глазу образуют круг — мы видим его верхнюю часть' },
          { from: 365, to: 470, text: 'Поэтому радуга — дуга: красный снаружи, фиолетовый внутри' },
        ]}
      />
    </AbsoluteFill>
  );
};

// ---------- scene 6: mnemonic outro ----------

const WORDS = ['Каждый', 'Охотник', 'Желает', 'Знать,', 'Где', 'Сидит', 'Фазан'];

const OutroScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const end = interpolate(f, [190, 220], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: '#fffdf7', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <div style={{ fontFamily: FONT, fontSize: 40, color: '#546e7a', fontWeight: 600, marginBottom: 40 }}>
        Как запомнить порядок цветов:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 26, maxWidth: 1700 }}>
        {WORDS.map((w, i) => {
          const s = spring({ frame: f - 20 - i * 14, fps, config: { damping: 11 } });
          return (
            <span
              key={w}
              style={{
                fontFamily: FONT,
                fontSize: 92,
                fontWeight: 800,
                color: COLORS[i],
                transform: `translateY(${(1 - s) * 60}px)`,
                opacity: s,
                textShadow: i === 2 ? '0 2px 0 #c49000' : undefined,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 36, color: '#90a4ae', marginTop: 70, opacity: end }}>
        Пилот · 2D-анимация на Remotion
      </div>
    </AbsoluteFill>
  );
};

// ---------- composition ----------

const COMPONENTS: Record<(typeof SCENES)[number]['id'], React.FC> = {
  title: TitleScene,
  conditions: ConditionsScene,
  prism: PrismScene,
  drop: DropScene,
  arc: ArcScene,
  outro: OutroScene,
};

export const Rainbow: React.FC = () => {
  let start = 0;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {SCENES.map((s) => {
        const Comp = COMPONENTS[s.id];
        const from = start;
        start += s.dur;
        return (
          <Sequence key={s.id} from={from} durationInFrames={s.dur}>
            <SceneFade dur={s.dur}>
              <Comp />
            </SceneFade>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
