// Lop chuyen dong nhan manh cho kenh Su AZ, render nen trong suot.
// Moi item co thoi diem from/to (giay) dong bo voi loi doc.
import React from 'react';
import {AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const C = {bg: '#0E0F12', gold: '#C9A25E', red: '#C44038', cream: '#EEEAE2', muted: '#B8B4AC'};
const fontCss = `
@font-face{font-family:BVP;src:url(${staticFile('BeVietnamPro-Regular.ttf')});font-weight:400}
@font-face{font-family:BVP;src:url(${staticFile('BeVietnamPro-SemiBold.ttf')});font-weight:600}
@font-face{font-family:BVP;src:url(${staticFile('BeVietnamPro-Bold.ttf')});font-weight:700}`;

export type FxItem = {
  type: 'keyword' | 'date' | 'highlight' | 'compare' | 'counter' | 'strike' | 'quote';
  from: number;
  to: number;
  text?: string;
  sub?: string;
  pos?: 'top-left' | 'center' | 'bottom-left' | 'top-right';
  x?: number; y?: number; w?: number; h?: number;   // vung khoanh, ty le 0-1
  shape?: 'circle' | 'rect';
  label?: string;
  left?: string; leftSub?: string; right?: string; rightSub?: string;
  value?: number; suffix?: string;
  old?: string;
  source?: string;
};
export type FxProps = {duration: number; items: FxItem[]};

const ease = Easing.bezier(0.22, 1, 0.36, 1);

// tien do vao (0->1) va ra (1->0) cua mot item, tinh theo giay
function useEnvelope(it: FxItem, inDur = 0.45, outDur = 0.35) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const a = interpolate(t, [it.from, it.from + inDur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const b = interpolate(t, [it.to - outDur, it.to], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return {t, k: Math.min(a, b), inK: a, live: t >= it.from && t <= it.to};
}

const place = (pos: FxItem['pos']): React.CSSProperties => {
  switch (pos) {
    case 'center': return {left: 0, right: 0, top: '38%', textAlign: 'center', alignItems: 'center'};
    case 'top-left': return {left: 110, top: 170};
    case 'top-right': return {right: 110, top: 170, textAlign: 'right', alignItems: 'flex-end'};
    default: return {left: 110, bottom: 190};
  }
};

const Keyword: React.FC<{it: FxItem}> = ({it}) => {
  const {k, inK, live, t} = useEnvelope(it);
  if (!live) return null;
  const sweep = interpolate(t, [it.from + 0.25, it.from + 0.8], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return (
    <div style={{position: 'absolute', display: 'flex', flexDirection: 'column', ...place(it.pos), opacity: k,
      transform: `translateY(${(1 - inK) * 30}px) scale(${0.94 + 0.06 * inK})`}}>
      <div style={{display: 'inline-block', position: 'relative', padding: '10px 26px 16px', background: 'rgba(14,15,18,0.82)', borderRadius: 14}}>
        <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: it.pos === 'center' && (it.text ?? '').length <= 14 ? 150 : 84, color: C.cream, lineHeight: 1.1, letterSpacing: -1}}>{it.text}</div>
        <div style={{height: 8, width: `${sweep}%`, background: C.red, borderRadius: 4, marginTop: 8}} />
      </div>
      {it.sub && <div style={{fontFamily: 'BVP', fontWeight: 600, fontSize: 34, color: C.gold, marginTop: 12,
        background: 'rgba(14,15,18,0.82)', padding: '6px 18px', borderRadius: 10, alignSelf: it.pos === 'center' ? 'center' : 'flex-start'}}>{it.sub}</div>}
    </div>
  );
};

const DateStamp: React.FC<{it: FxItem}> = ({it}) => {
  const {k, live, t} = useEnvelope(it, 0.3);
  if (!live) return null;
  const text = it.text ?? '';
  const n = Math.floor(interpolate(t, [it.from + 0.15, it.from + 0.15 + text.length * 0.045], [0, text.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <div style={{position: 'absolute', ...(it.pos === 'top-right' ? {right: 110} : {left: 110}), top: 150, opacity: k, display: 'flex', alignItems: 'center', gap: 18,
      background: 'rgba(14,15,18,0.85)', padding: '16px 28px', borderRadius: 12, borderLeft: `8px solid ${C.gold}`}}>
      <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 46, color: C.cream, letterSpacing: 1}}>
        {text.slice(0, n)}<span style={{opacity: n < text.length ? 1 : 0, color: C.gold}}>▍</span>
      </div>
      {it.sub && <div style={{fontFamily: 'BVP', fontWeight: 400, fontSize: 30, color: C.muted}}>{it.sub}</div>}
    </div>
  );
};

const Highlight: React.FC<{it: FxItem}> = ({it}) => {
  const {k, live, t} = useEnvelope(it, 0.6);
  if (!live) return null;
  const W = 1920, H = 1080;
  const x = (it.x ?? 0.4) * W, y = (it.y ?? 0.4) * H, w = (it.w ?? 0.2) * W, h = (it.h ?? 0.2) * H;
  const draw = interpolate(t, [it.from, it.from + 0.7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const per = it.shape === 'rect' ? 2 * (w + h) : Math.PI * (w + h) / 2 * 1.02;
  const lx = x + w + 40, ly = y - 30;
  return (
    <AbsoluteFill style={{opacity: k}}>
      <svg width={W} height={H} style={{position: 'absolute'}}>
        <defs><mask id="m"><rect width={W} height={H} fill="white" />
          {it.shape === 'rect' ? <rect x={x} y={y} width={w} height={h} rx={12} fill="black" /> :
            <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill="black" />}</mask></defs>
        <rect width={W} height={H} fill="black" opacity={0.42 * draw} mask="url(#m)" />
        {it.shape === 'rect' ?
          <rect x={x} y={y} width={w} height={h} rx={12} fill="none" stroke={C.red} strokeWidth={7}
            strokeDasharray={per} strokeDashoffset={per * (1 - draw)} /> :
          <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill="none" stroke={C.red} strokeWidth={7}
            strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />}
        <line x1={x + w + 6} y1={y + h * 0.25} x2={x + w + 6 + 34 * draw} y2={ly + 36} stroke={C.red} strokeWidth={5} />
      </svg>
      {it.label && <div style={{position: 'absolute', left: Math.min(lx, W - 560), top: ly, opacity: draw,
        background: 'rgba(14,15,18,0.88)', padding: '10px 22px', borderRadius: 10, fontFamily: 'BVP', fontWeight: 700,
        fontSize: 40, color: C.cream, borderLeft: `6px solid ${C.red}`}}>{it.label}
        {it.sub && <div style={{fontWeight: 400, fontSize: 28, color: C.muted}}>{it.sub}</div>}</div>}
    </AbsoluteFill>
  );
};

const Compare: React.FC<{it: FxItem}> = ({it}) => {
  const {k, live, t} = useEnvelope(it);
  if (!live) return null;
  const a = interpolate(t, [it.from, it.from + 0.5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const b = interpolate(t, [it.from + 0.45, it.from + 0.95], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const box = (txt?: string, sub?: string, p = 1, col = C.gold, dx = -1): React.ReactNode => (
    <div style={{opacity: p, transform: `translateX(${(1 - p) * 60 * dx}px)`, background: 'rgba(14,15,18,0.88)',
      borderTop: `8px solid ${col}`, borderRadius: 14, padding: '26px 40px', minWidth: 460, textAlign: 'center'}}>
      <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 92, color: C.cream}}>{txt}</div>
      <div style={{fontFamily: 'BVP', fontWeight: 400, fontSize: 34, color: C.muted, marginTop: 6}}>{sub}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{opacity: k, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 70,
      background: `rgba(0,0,0,${0.35 * a})`}}>
      {box(it.left, it.leftSub, a, C.gold, -1)}
      <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 60, color: C.red, opacity: b}}>{it.text ?? '↔'}</div>
      {box(it.right, it.rightSub, b, C.red, 1)}
    </AbsoluteFill>
  );
};

const Counter: React.FC<{it: FxItem}> = ({it}) => {
  const {k, live, t} = useEnvelope(it);
  if (!live) return null;
  const v = interpolate(t, [it.from + 0.2, it.from + 1.6], [0, it.value ?? 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const dec = Number.isInteger(it.value ?? 0) ? 0 : 1;
  const s = v.toLocaleString('de-DE', {minimumFractionDigits: dec, maximumFractionDigits: dec});
  return (
    <div style={{position: 'absolute', display: 'flex', flexDirection: 'column', ...place(it.pos ?? 'top-right'), opacity: k}}>
      <div style={{background: 'rgba(14,15,18,0.86)', borderRadius: 14, padding: '14px 30px', borderBottom: `8px solid ${C.red}`}}>
        <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 110, color: C.cream, lineHeight: 1}}>{s}{it.suffix}</div>
        {it.sub && <div style={{fontFamily: 'BVP', fontWeight: 600, fontSize: 32, color: C.gold, marginTop: 8}}>{it.sub}</div>}
      </div>
    </div>
  );
};

const Strike: React.FC<{it: FxItem}> = ({it}) => {
  const {k, live, t} = useEnvelope(it);
  if (!live) return null;
  const line = interpolate(t, [it.from + 0.4, it.from + 0.8], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const nw = interpolate(t, [it.from + 0.8, it.from + 1.2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  return (
    <div style={{position: 'absolute', display: 'flex', alignItems: 'center', gap: 40, ...place(it.pos ?? 'bottom-left'), opacity: k,
      background: 'rgba(14,15,18,0.86)', borderRadius: 14, padding: '18px 34px'}}>
      <div style={{position: 'relative', fontFamily: 'BVP', fontWeight: 700, fontSize: 76, color: C.muted}}>
        {it.old}<div style={{position: 'absolute', left: 0, top: '52%', height: 8, width: `${line}%`, background: C.red}} />
      </div>
      <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 60, color: C.gold, opacity: nw}}>→</div>
      <div style={{fontFamily: 'BVP', fontWeight: 700, fontSize: 76, color: C.cream, opacity: nw,
        transform: `scale(${0.8 + 0.2 * nw})`}}>{it.text}</div>
      {it.sub && <div style={{fontFamily: 'BVP', fontWeight: 400, fontSize: 30, color: C.muted, opacity: nw}}>{it.sub}</div>}
    </div>
  );
};

const Quote: React.FC<{it: FxItem}> = ({it}) => {
  const {k, live, t} = useEnvelope(it);
  if (!live) return null;
  const text = it.text ?? '';
  const n = Math.floor(interpolate(t, [it.from + 0.2, it.from + 0.2 + text.length * 0.03], [0, text.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <div style={{position: 'absolute', left: 110, right: 110, bottom: 150, opacity: k, background: 'rgba(14,15,18,0.88)',
      borderRadius: 14, padding: '26px 40px', borderLeft: `8px solid ${C.gold}`}}>
      <div style={{fontFamily: 'BVP', fontWeight: 600, fontSize: 48, color: C.cream, lineHeight: 1.3}}>“{text.slice(0, n)}”</div>
      {it.source && <div style={{fontFamily: 'BVP', fontWeight: 400, fontSize: 30, color: C.gold, marginTop: 12}}>— {it.source}</div>}
    </div>
  );
};

const R: Record<FxItem['type'], React.FC<{it: FxItem}>> = {
  keyword: Keyword, date: DateStamp, highlight: Highlight, compare: Compare, counter: Counter, strike: Strike, quote: Quote,
};

export const Fx: React.FC<FxProps> = ({items}) => (
  <AbsoluteFill style={{backgroundColor: 'transparent'}}>
    <style>{fontCss}</style>
    {items.map((it, i) => {
      const Comp = R[it.type];
      return <Comp key={i} it={it} />;
    })}
  </AbsoluteFill>
);
