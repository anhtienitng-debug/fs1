// Bieu do chuyen dong cho kenh Su AZ: nen toi, net manh, so lon, it chu.
// Moi moc thoi gian "at" (giay) da duoc Python tinh theo loi doc.
import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const C = {bg: '#0B0C0F', panel: '#15171C', line: '#2A2D34', gold: '#D4AE6A', red: '#E0574B', cream: '#F1EDE5',
  muted: '#8E8A83', dim: '#5C5953', teal: '#5FA8A0', blue: '#6C8FD0'};
const fontCss = `
@font-face{font-family:BVP;src:url(${staticFile('BeVietnamPro-Regular.ttf')});font-weight:400}
@font-face{font-family:BVP;src:url(${staticFile('BeVietnamPro-SemiBold.ttf')});font-weight:600}
@font-face{font-family:BVP;src:url(${staticFile('BeVietnamPro-Bold.ttf')});font-weight:700}`;
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const io = Easing.bezier(0.65, 0, 0.35, 1);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type Ev = {year: number; label?: string; note?: string; at?: number; side?: 'up' | 'down'};
type Card = {n: string; title: string; years?: string; color?: string; at?: number};
type Item = {label: string; value: number; note?: string; highlight?: boolean; at?: number};
export type ChartSpec = {
  anim: 'timeline' | 'reasons' | 'bars' | 'counter' | 'ladder';
  title?: string; subtitle?: string; source?: string; bg?: string; bg_dim?: number;
  // timeline
  range?: [number, number]; ticks?: number[]; events?: Ev[];
  zoom?: {range: [number, number]; at?: number};
  bracket?: {from: number; to: number; label: string; at?: number};
  tail?: {label: string; at?: number};
  // reasons
  cards?: Card[]; focus?: {word: string; sub?: string; at?: number};
  // ladder: thang bac, chi ghi so lieu o bac co nguon
  steps?: {label: string; value?: string}[]; mark?: {step: number; at?: number}[];
  // bars
  items?: Item[]; unit?: string; badge?: {text: string; at?: number};
  // counter
  value?: number; suffix?: string; from_label?: string; to_label?: string; ratio?: number;
};
export type ChartProps = {duration: number; spec: ChartSpec};

const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {t: f / fps, f, fps};
};
const appear = (t: number, at = 0, d = 0.6) => interpolate(t, [at, at + d], [0, 1], {...clamp, easing: ease});

const Backdrop: React.FC<{spec: ChartSpec}> = ({spec}) => {
  const {t} = useT();
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {spec.bg && <Img src={staticFile(spec.bg)} style={{width: '100%', height: '100%', objectFit: 'cover',
        opacity: 1 - (spec.bg_dim ?? 0.82), filter: 'grayscale(1) blur(2px)', transform: `scale(${1.06 + t * 0.004})`}} />}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(11,12,15,0) 0%, rgba(11,12,15,0.85) 75%, #0B0C0F 100%)'}} />
    </AbsoluteFill>
  );
};

const Header: React.FC<{spec: ChartSpec}> = ({spec}) => {
  const {t} = useT();
  const k = appear(t, 0.1, 0.8);
  if (!spec.title) return null;
  return (
    <div style={{position: 'absolute', left: 140, top: 96, opacity: k, transform: `translateY(${(1 - k) * 14}px)`}}>
      <div style={{fontFamily: 'BVP', fontWeight: 600, fontSize: 26, letterSpacing: 6, color: C.gold, textTransform: 'uppercase'}}>{spec.title}</div>
      {spec.subtitle && <div style={{fontFamily: 'BVP', fontSize: 28, color: C.muted, marginTop: 10}}>{spec.subtitle}</div>}
    </div>
  );
};

const Source: React.FC<{spec: ChartSpec}> = ({spec}) =>
  spec.source ? <div style={{position: 'absolute', left: 140, bottom: 60, fontFamily: 'BVP', fontSize: 28, color: C.muted}}>{spec.source}</div> : null;

// ---------------------------------------------------------------- timeline
const X0 = 160, X1 = 1760, AXIS = 590;

const Timeline: React.FC<{spec: ChartSpec; duration: number}> = ({spec, duration}) => {
  const {t} = useT();
  const full = spec.range ?? [940, 2030];
  const z = spec.zoom;
  const zk = z?.at !== undefined ? interpolate(t, [z.at, z.at + 1.6], [0, 1], {...clamp, easing: io}) : 0;
  const lo = full[0] + ((z?.range[0] ?? full[0]) - full[0]) * zk;
  const hi = full[1] + ((z?.range[1] ?? full[1]) - full[1]) * zk;
  const x = (y: number) => X0 + ((y - lo) / (hi - lo)) * (X1 - X0);
  const evs = (spec.events ?? []).filter((e) => e.at !== undefined);
  // dau but chay toi moc vua duoc nhac
  const keys: [number, number][] = [[0.3, full[0]], ...evs.map((e) => [e.at!, e.year] as [number, number])];
  if (spec.tail?.at !== undefined) keys.push([spec.tail.at, full[1] - 4]);
  keys.sort((a, b) => a[0] - b[0]);
  let head = full[0], prev = full[0];
  for (const [ta, ya] of keys) {
    if (t < ta) break;
    head = interpolate(t, [ta, ta + 0.9], [prev, ya], {...clamp, easing: ease});
    prev = ya;
  }
  const headX = Math.min(Math.max(x(head), X0 - 400), X1 + 400);
  const ticks = (spec.ticks ?? [1000, 1200, 1400, 1600, 1800, 2000]).concat(z ? [1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020] : []);
  const br = spec.bracket;
  const bk = br?.at !== undefined ? appear(t, br.at, 0.8) : 0;
  const tk = spec.tail?.at !== undefined ? appear(t, spec.tail.at + 0.5, 0.7) : 0;
  return (
    <AbsoluteFill>
      <Backdrop spec={spec} />
      <Header spec={spec} />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <defs>
          <linearGradient id="fade" x1="0" x2="1">
            <stop offset="0" stopColor={C.gold} stopOpacity="0" /><stop offset="0.12" stopColor={C.gold} stopOpacity="1" />
          </linearGradient>
        </defs>
        <line x1={X0 - 40} x2={X1 + 40} y1={AXIS} y2={AXIS} stroke={C.line} strokeWidth={2} opacity={appear(t, 0.2, 1)} />
        {ticks.map((y) => {
          const px = x(y);
          if (px < X0 - 30 || px > X1 + 30) return null;
          const dense = y >= 1940 && y % 100 !== 0;
          const op = (dense ? zk ** 3 : 1 - zk * 0.6) * appear(t, 0.4, 1);
          return (
            <g key={y} opacity={op}>
              <line x1={px} x2={px} y1={AXIS + 10} y2={AXIS + 22} stroke={C.dim} strokeWidth={2} />
              <text x={px} y={AXIS + 56} fill={C.dim} fontFamily="BVP" fontSize={22} textAnchor="middle">{y}</text>
            </g>
          );
        })}
        <line x1={X0 - 40} x2={headX} y1={AXIS} y2={AXIS} stroke="url(#fade)" strokeWidth={5} strokeLinecap="round" />
        {br && bk > 0 && (
          <g opacity={bk}>
            <rect x={x(br.from) - 18} y={AXIS - 34} width={(x(br.to) - x(br.from) + 36) * bk} height={68} rx={34}
              fill="rgba(224,87,75,0.12)" stroke={C.red} strokeWidth={2} />
          </g>
        )}
        <circle cx={headX} cy={AXIS} r={9} fill={C.cream} opacity={t > 0.3 ? 1 : 0} />
        <circle cx={headX} cy={AXIS} r={9 + 14 * ((t * 1.2) % 1)} fill="none" stroke={C.cream} strokeWidth={2} opacity={(1 - ((t * 1.2) % 1)) * 0.6} />
      </svg>
      {evs.map((e, i) => {
        const px = x(e.year);
        const k = appear(t, e.at!, 0.55);
        const inZoom = z ? e.year >= z.range[0] : false;
        // moc trong vung zoom chi hien khi da zoom, va nguoc lai
        const vis = (inZoom ? zk : z ? 1 - zk * 0.85 : 1) * k;
        if (vis <= 0.01 || px < X0 - 80 || px > X1 + 80) return null;
        const up = (e.side ?? (i % 2 ? 'down' : 'up')) === 'up';
        const big = inZoom ? 54 : 64;
        const lift = (1 - k) * (up ? 16 : -16);
        return (
          <div key={e.year + '-' + i} style={{position: 'absolute', left: px - 160, width: 320, textAlign: 'center', opacity: vis,
            top: up ? AXIS - 200 + lift : AXIS + 84 + lift}}>
            {!up && <div style={{width: 2, height: 34, background: C.gold, opacity: 0.6, margin: '-80px auto 46px'}} />}
            <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: big, color: C.cream, letterSpacing: -1, lineHeight: 1}}>{e.year}</div>
            {e.label && <div style={{fontFamily: 'BVP', fontWeight: 600, fontSize: 26, color: C.gold, marginTop: 10}}>{e.label}</div>}
            {e.note && <div style={{fontFamily: 'BVP', fontSize: 22, color: C.muted, marginTop: 4}}>{e.note}</div>}
            {up && <div style={{width: 2, height: 40, background: C.gold, opacity: 0.6, margin: '14px auto 0'}} />}
          </div>
        );
      })}
      {br && bk > 0 && (
        <div style={{position: 'absolute', left: (x(br.from) + x(br.to)) / 2 - 300, width: 600, top: AXIS + 250, textAlign: 'center', opacity: bk,
          transform: `translateY(${(1 - bk) * 20}px)`}}>
          <span style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 44, color: C.red}}>{br.label}</span>
        </div>
      )}
      {spec.tail && tk > 0 && (
        <div style={{position: 'absolute', right: 150, top: AXIS - 140, opacity: tk, textAlign: 'right',
          fontFamily: 'BVP', fontWeight: 600, fontSize: 32, color: C.teal}}>{spec.tail.label}</div>
      )}
      <Source spec={spec} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- reasons
const PAL = [C.gold, C.teal, C.blue, C.red];

const Reasons: React.FC<{spec: ChartSpec}> = ({spec}) => {
  const {t, f, fps} = useT();
  const cards = spec.cards ?? [];
  const fo = spec.focus;
  const fk = fo?.at !== undefined ? appear(t, fo.at, 0.9) : 0;
  return (
    <AbsoluteFill>
      <Backdrop spec={spec} />
      <Header spec={spec} />
      <div style={{position: 'absolute', left: 140, right: 140, top: 300, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36,
        opacity: 1 - fk * 0.88, filter: `blur(${fk * 6}px)`}}>
        {cards.map((c, i) => {
          const at = c.at ?? 0.5 + i * 0.6;
          const s = spring({frame: f - Math.round(at * fps), fps, config: {damping: 200}});
          const col = c.color ?? PAL[i % 4];
          return (
            <div key={i} style={{background: 'rgba(21,23,28,0.92)', borderRadius: 22, padding: '40px 46px', height: 250, boxSizing: 'border-box',
              opacity: s, transform: `translateY(${(1 - s) * 40}px)`, borderTop: `4px solid ${col}`, position: 'relative', overflow: 'hidden'}}>
              <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 30, color: col, letterSpacing: 4}}>{c.n}</div>
              <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 56, color: C.cream, marginTop: 14, letterSpacing: -1, whiteSpace: 'nowrap'}}>{c.title}</div>
              {c.years && <div style={{fontFamily: 'BVP', fontSize: 26, color: C.muted, marginTop: 14, letterSpacing: 1}}>{c.years}</div>}
            </div>
          );
        })}
      </div>
      {fo && fk > 0 && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
          <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 220, color: C.cream, letterSpacing: 8, opacity: fk,
            transform: `scale(${0.9 + 0.1 * fk})`, textShadow: '0 10px 60px rgba(0,0,0,0.8)'}}>{fo.word}</div>
          <div style={{width: 260 * fk, height: 6, background: C.gold, borderRadius: 3, marginTop: 8}} />
          {fo.sub && <div style={{fontFamily: 'BVP', fontSize: 36, color: C.gold, marginTop: 26, opacity: fk}}>{fo.sub}</div>}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- bars
const Bars: React.FC<{spec: ChartSpec}> = ({spec}) => {
  const {t} = useT();
  const items = spec.items ?? [];
  const max = Math.max(...items.map((i) => i.value), 1);
  const wide = items.some((x) => (x.note ?? '').length > 14);
  const bd = spec.badge;
  const bk = bd?.at !== undefined ? spring({frame: Math.round((t - bd.at) * 24), fps: 24, config: {damping: 14, mass: 0.7}}) : 0;
  return (
    <AbsoluteFill>
      <Backdrop spec={spec} />
      <Header spec={spec} />
      <div style={{position: 'absolute', left: 140, right: 140, top: '54%', transform: 'translateY(-50%)'}}>
        {items.map((it, i) => {
          // moi cot moc len dung luc loi doc nhac toi (at), khong thi lan luot
          const at = it.at ?? 0.8 + i * 0.45;
          const k = interpolate(t, [at, at + 1.3], [0, 1], {...clamp, easing: ease});
          const col = it.highlight ? C.red : C.gold;
          const val = Math.round(it.value * k);
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', height: 190, opacity: appear(t, at - 0.2, 0.4)}}>
              <div style={{width: wide ? 460 : 260, whiteSpace: 'nowrap'}}>
                <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 62, color: C.cream, lineHeight: 1.05}}>{it.label}</div>
                {it.note && <div style={{fontFamily: 'BVP', fontSize: 32, color: C.muted, marginTop: 6}}>{it.note}</div>}
              </div>
              <div style={{flex: 1, position: 'relative', height: 84}}>
                <div style={{position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.05)', borderRadius: 14}} />
                <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 14, background: col,
                  width: `${Math.max((it.value / max) * 100 * k, 1.2 * k)}%`}} />
              </div>
              <div style={{width: 340, textAlign: 'right', fontFamily: 'BVP', fontWeight: 700, fontSize: 76, color: it.highlight ? C.red : C.cream,
                fontVariantNumeric: 'tabular-nums'}}>
                {val.toLocaleString('de-DE')}<span style={{fontSize: 36, color: C.muted, fontWeight: 400}}>{spec.unit ?? ' : 1'}</span>
              </div>
            </div>
          );
        })}
      </div>
      {bd && bk > 0.01 && (
        <div style={{position: 'absolute', right: 150, top: 120, fontFamily: 'BVP', fontWeight: 700, fontSize: 170, color: C.gold,
          letterSpacing: -4, transform: `scale(${0.6 + 0.4 * bk})`, transformOrigin: 'right top', opacity: Math.min(1, bk * 1.4),
          textShadow: '0 10px 40px rgba(0,0,0,0.8)'}}>{bd.text}</div>
      )}
      <Source spec={spec} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- ladder
const Ladder: React.FC<{spec: ChartSpec}> = ({spec}) => {
  const {t} = useT();
  const steps = spec.steps ?? [];
  const n = steps.length;
  const top = 230, bottom = 980, gap = (bottom - top) / Math.max(n, 1);
  const marks = (spec.mark ?? []).filter((m) => m.at !== undefined);
  // vi tri con tro: bac cua moc gan nhat da qua, truot muot giua cac moc
  let cur = marks.length ? marks[0].step : n - 1, prev = cur, tAt = 0;
  for (const m of marks) { if (t >= m.at!) { prev = cur; cur = m.step; tAt = m.at!; } }
  const mk = interpolate(t, [tAt, tAt + 1.1], [0, 1], {...clamp, easing: io});
  const pos = prev + (cur - prev) * mk;
  const py = top + pos * gap + gap / 2;
  const shown = marks.length ? appear(t, marks[0].at!, 0.6) : 1;
  return (
    <AbsoluteFill>
      <Backdrop spec={spec} />
      <Header spec={spec} />
      {steps.map((s, i) => {
        const k = appear(t, 0.2 + (n - i) * 0.05, 0.5);
        const lit = Math.max(0, 1 - Math.abs(pos - i)) * shown;
        const w = 520 + (n - 1 - i) * 22;
        return (
          <div key={i} style={{position: 'absolute', top: top + i * gap + 4, left: 960 - w / 2, width: w, height: gap - 8, opacity: k,
            borderRadius: 6, background: `rgba(212,174,106,${0.10 + 0.55 * lit})`, border: `1px solid rgba(212,174,106,${0.25 + 0.6 * lit})`}}>
            {s.label && <div style={{position: 'absolute', right: w + 30, top: '50%', transform: 'translateY(-50%)', whiteSpace: 'nowrap',
              fontFamily: 'BVP', fontWeight: 600, fontSize: 24, color: lit > 0.5 ? C.cream : C.muted}}>{s.label}</div>}
            {s.value && <div style={{position: 'absolute', left: w + 30, top: '50%', transform: 'translateY(-50%)', whiteSpace: 'nowrap',
              fontFamily: 'BVP', fontWeight: 700, fontSize: 30, color: C.gold, opacity: lit}}>{s.value}</div>}
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 960 - 10, top: py - 10, width: 20, height: 20, borderRadius: 10, background: C.cream, opacity: shown,
        boxShadow: '0 0 30px rgba(241,237,229,0.8)'}} />
      <Source spec={spec} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- counter
const Counter: React.FC<{spec: ChartSpec}> = ({spec}) => {
  const {t} = useT();
  const k = interpolate(t, [0.8, 3.2], [0, 1], {...clamp, easing: ease});
  const ratio = spec.ratio ?? 1 + (spec.value ?? 0) / 100;
  const H = 520;
  return (
    <AbsoluteFill>
      <Backdrop spec={spec} />
      <Header spec={spec} />
      <div style={{position: 'absolute', left: 140, top: 330}}>
        <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 210, color: C.red, letterSpacing: -6, lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>
          +{Math.round((spec.value ?? 0) * k)}{spec.suffix}
        </div>
        <div style={{fontFamily: 'BVP', fontSize: 34, color: C.muted, marginTop: 24, opacity: appear(t, 2.6)}}>{spec.to_label}</div>
      </div>
      {[{l: spec.from_label ?? '', v: 1, c: C.dim}, {l: '', v: 1 + (ratio - 1) * k, c: C.red}].map((b, i) => (
        <div key={i} style={{position: 'absolute', bottom: 170, left: 1280 + i * 220, width: 150, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <div style={{fontFamily: 'BVP', fontWeight: 600, fontSize: 30, color: i ? C.red : C.muted, marginBottom: 12}}>
            {i ? `×${b.v.toFixed(1).replace('.', ',')}` : '×1'}
          </div>
          <div style={{width: 150, height: (H / ratio) * b.v * appear(t, 0.5), background: b.c, borderRadius: '14px 14px 0 0'}} />
          <div style={{fontFamily: 'BVP', fontSize: 26, color: C.muted, marginTop: 16}}>{i ? '1986' : '1985'}</div>
        </div>
      ))}
      <Source spec={spec} />
    </AbsoluteFill>
  );
};

export const Chart: React.FC<ChartProps> = ({spec, duration}) => (
  <AbsoluteFill style={{background: C.bg}}>
    <style>{fontCss}</style>
    {spec.anim === 'timeline' && <Timeline spec={spec} duration={duration} />}
    {spec.anim === 'reasons' && <Reasons spec={spec} />}
    {spec.anim === 'bars' && <Bars spec={spec} />}
    {spec.anim === 'counter' && <Counter spec={spec} />}
    {spec.anim === 'ladder' && <Ladder spec={spec} />}
  </AbsoluteFill>
);
