// "Ho so": phong cach rieng cua Su AZ. Mot mat ban giay nhin tu tren xuong:
// anh tu lieu la nhung tam anh in dat len ban, so cai ben phai ghi dan con so,
// the chu giai giai thich tu kho, trien son dong khi co quyet dinh.
// Moi beat co "at" (giay) da duoc Python tinh theo loi doc.
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/lora/400.css';
import '@fontsource/lora/400-italic.css';
import '@fontsource/lora/600.css';
import '@fontsource/lora/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/noto-serif-tc/700.css';

const P = {desk: '#1E1712', paper: '#EDE3CC', paper2: '#E4D7B8', ink: '#2B2118', inkSoft: '#5B4B3A', son: '#A3281E', line: 'rgba(43,33,24,0.18)'};
const SERIF = 'Lora, serif';
const MONO = '"IBM Plex Mono", monospace';
const HAN = '"Noto Serif TC", serif';
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type Beat = {
  type: 'print' | 'slip' | 'note' | 'seal' | 'ranks' | 'ledger' | 'line' | 'ident' | 'clear';
  at?: number;
  src?: string; caption?: string; side?: 'left' | 'right';
  text?: string; sub?: string; term?: string; han?: string;
  label?: string; value?: string; mark?: boolean; small?: boolean;
  title?: string; from?: number;
};
export type DossierProps = {duration: number; spec: {beats: Beat[]; source?: string}};

const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return {t: f / fps, f, fps};
};
const inK = (t: number, at = 0, d = 0.6) => interpolate(t, [at, at + d], [0, 1], {...clamp, easing: ease});

// nhieu giay that: vet loang va soi giay ve bang gradient, khong can anh nen
const paperBg = `radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.35), rgba(255,255,255,0) 60%),
  radial-gradient(ellipse at 80% 90%, rgba(120,90,50,0.18), rgba(0,0,0,0) 55%), ${P.paper}`;

const Desk: React.FC = () => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at 45% 45%, #3A2C20 0%, ${P.desk} 70%, #120D0A 100%)`}}>
    <svg width="1920" height="1080" style={{position: 'absolute', opacity: 0.25}}>
      <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="1920" height="1080" filter="url(#grain)" opacity="0.5" />
    </svg>
  </AbsoluteFill>
);

// Anh in: vien trang, xoay nhe, truot vao tu duoi, day can rat cham
const Print: React.FC<{b: Beat; next?: number; idx: number}> = ({b, next, idx}) => {
  const {t} = useT();
  const at = b.at ?? 0;
  if (t < at) return null;
  const k = inK(t, at, 0.9);
  const out = next !== undefined ? inK(t, next + 0.4, 0.8) : 0;   // anh cu lui xuong, toi di
  const rot = (idx % 2 ? 1.6 : -1.4) * (1 - 0.3 * k);
  const life = Math.max(0, t - at);
  const zoom = 1 + Math.min(life, 14) * 0.006;
  const left = b.side === 'right' ? 520 : 110;
  return (
    <div style={{position: 'absolute', left, top: 95, width: 1120, height: 780, opacity: Math.min(1, k * 1.2) * (1 - 0.65 * out),
      transform: `translateY(${(1 - k) * 120 + out * 18}px) rotate(${rot}deg) scale(${1 - out * 0.04})`,
      background: '#F4F0E6', padding: 22, boxSizing: 'border-box', boxShadow: '0 30px 60px rgba(0,0,0,0.55), 0 4px 10px rgba(0,0,0,0.4)'}}>
      <div style={{width: '100%', height: b.caption ? 690 : 736, overflow: 'hidden', background: '#111'}}>
        <Img src={staticFile(b.src ?? '')} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(0.35) contrast(1.05)',
          transform: `scale(${zoom})`}} />
      </div>
      {b.caption && <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 26, color: P.inkSoft, marginTop: 10}}>{b.caption}</div>}
    </div>
  );
};

// Mau giay ghi mot cau then chot, chu serif lon
const Slip: React.FC<{b: Beat; until: number}> = ({b, until}) => {
  const {t} = useT();
  const at = b.at ?? 0;
  if (t < at || t > until + 0.6) return null;
  const k = inK(t, at, 0.5) * (1 - inK(t, until, 0.5));
  return (
    <div style={{position: 'absolute', left: 230, top: 610, width: 900, padding: '30px 44px', background: paperBg, opacity: k,
      transform: `translateY(${(1 - k) * 30}px) rotate(-1deg)`, boxShadow: '0 18px 40px rgba(0,0,0,0.5)'}}>
      <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 58, color: P.ink, lineHeight: 1.15}}>{b.text}</div>
      {b.sub && <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 30, color: P.inkSoft, marginTop: 10}}>{b.sub}</div>}
    </div>
  );
};

// The chu giai: giai thich tu kho ngay khi loi doc nhac toi
const Note: React.FC<{b: Beat; until: number}> = ({b, until}) => {
  const {t} = useT();
  const at = b.at ?? 0;
  if (t < at || t > until + 0.5) return null;
  const k = inK(t, at, 0.45) * (1 - inK(t, until, 0.4));
  return (
    <div style={{position: 'absolute', left: 70, bottom: 70, width: 620, padding: '22px 28px 24px', background: '#F6EED6', opacity: k,
      transform: `translateX(${(1 - k) * -40}px) rotate(1.2deg)`, boxShadow: '0 14px 30px rgba(0,0,0,0.55)', borderLeft: `6px solid ${P.son}`}}>
      <div style={{fontFamily: MONO, fontSize: 20, letterSpacing: 3, color: P.son}}>CHÚ GIẢI</div>
      <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: P.ink, marginTop: 6}}>
        {b.term}{b.han && <span style={{fontFamily: HAN, fontSize: 34, color: P.inkSoft, marginLeft: 14}}>{b.han}</span>}
      </div>
      <div style={{fontFamily: SERIF, fontSize: 30, color: P.ink, marginTop: 6, lineHeight: 1.3}}>{b.text}</div>
    </div>
  );
};

const Seal: React.FC<{b: Beat; until: number}> = ({b, until}) => {
  const {t, f, fps} = useT();
  const at = b.at ?? 0;
  if (t < at || t > until + 0.5) return null;
  const s = spring({frame: f - Math.round(at * fps), fps, config: {damping: 11, mass: 0.6}});
  const fade = 1 - inK(t, until, 0.5);
  return (
    <div style={{position: 'absolute', left: 700, top: 300, width: 300, height: 300, border: `12px solid ${P.son}`, borderRadius: 18,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: Math.min(1, s) * 0.92 * fade,
      transform: `scale(${2.2 - 1.2 * Math.min(s, 1.05)}) rotate(-8deg)`, mixBlendMode: 'multiply', background: 'rgba(163,40,30,0.08)'}}>
      {b.han && <div style={{fontFamily: HAN, fontSize: 120, color: P.son, lineHeight: 1}}>{b.han}</div>}
      <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: b.han ? 46 : 70, color: P.son, letterSpacing: 6}}>{b.text}</div>
    </div>
  );
};

// Thang 18 bac pham ham thu nho tren mot tam giay, sang nua duoi
const Ranks: React.FC<{b: Beat; until: number}> = ({b, until}) => {
  const {t} = useT();
  const at = b.at ?? 0;
  if (t < at || t > until + 0.5) return null;
  const k = inK(t, at, 0.5) * (1 - inK(t, until, 0.4));
  const from = b.from ?? 8;
  const lit = inK(t, at + 0.8, 0.8);
  return (
    <div style={{position: 'absolute', left: 820, top: 150, width: 380, padding: '22px 26px', background: paperBg, opacity: k,
      transform: `rotate(1.5deg) translateY(${(1 - k) * 30}px)`, boxShadow: '0 18px 40px rgba(0,0,0,0.5)'}}>
      <div style={{fontFamily: MONO, fontSize: 18, letterSpacing: 2, color: P.inkSoft}}>18 BẬC PHẨM HÀM</div>
      {Array.from({length: 18}).map((_, i) => {
        const on = i >= from;
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', height: 30, gap: 10}}>
            <div style={{width: 46, fontFamily: MONO, fontSize: 16, color: P.inkSoft}}>{i === 0 ? 'nhất' : i === 8 ? 'ngũ' : i === 17 ? 'cửu' : ''}</div>
            <div style={{flex: 1, height: 16, borderRadius: 3, background: on ? `rgba(163,40,30,${0.25 + 0.6 * lit})` : 'rgba(43,33,24,0.18)'}} />
          </div>
        );
      })}
    </div>
  );
};

// So cai: dai giay ben phai, moi dong hien ra kieu may danh chu va o lai
const Ledger: React.FC<{open?: Beat; lines: Beat[]}> = ({open, lines}) => {
  const {t} = useT();
  if (!open || t < (open.at ?? 0)) return null;
  const k = inK(t, open.at ?? 0, 0.8);
  return (
    <div style={{position: 'absolute', right: 70, top: 70, width: 560, bottom: 70, background: paperBg, padding: '34px 34px', boxSizing: 'border-box',
      transform: `translateX(${(1 - k) * 640}px) rotate(0.6deg)`, boxShadow: '0 30px 60px rgba(0,0,0,0.6)'}}>
      <div style={{fontFamily: MONO, fontSize: 20, letterSpacing: 4, color: P.son}}>SỔ CÁI</div>
      <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 38, color: P.ink, marginTop: 4, borderBottom: `2px solid ${P.ink}`, paddingBottom: 12}}>{open.title}</div>
      {lines.filter((l) => t >= (l.at ?? 0)).map((l, i) => {
        const lk = inK(t, l.at ?? 0, 0.35);
        const val = l.value ?? '';
        const n = Math.floor(interpolate(t, [(l.at ?? 0) + 0.2, (l.at ?? 0) + 0.2 + val.length * 0.05], [0, val.length], clamp));
        const circ = l.mark ? inK(t, (l.at ?? 0) + 0.3 + val.length * 0.05, 0.6) : 0;
        return (
          <div key={i} style={{marginTop: l.small ? 10 : 22, opacity: lk, borderBottom: `1px dashed ${P.line}`, paddingBottom: 10}}>
            <div style={{fontFamily: SERIF, fontSize: l.small ? 22 : 26, color: P.inkSoft}}>{l.label}</div>
            <div style={{position: 'relative', display: 'inline-block', fontFamily: MONO, fontWeight: 500, fontSize: l.small ? 28 : 38, color: l.mark ? P.son : P.ink, marginTop: 2}}>
              {val.slice(0, n)}
              {l.mark && (
                <svg style={{position: 'absolute', left: -14, top: -10, overflow: 'visible'}} width={val.length * 23 + 28} height={l.small ? 50 : 66}>
                  <ellipse cx={(val.length * 23 + 28) / 2} cy={l.small ? 25 : 33} rx={(val.length * 23 + 20) / 2} ry={l.small ? 24 : 31}
                    fill="none" stroke={P.son} strokeWidth={3} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - circ} transform="rotate(-3)" />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Ident: React.FC<{b: Beat}> = ({b}) => {
  const {t, f, fps} = useT();
  const at = b.at ?? 0;
  if (t < at) return null;
  const s = spring({frame: f - Math.round(at * fps), fps, config: {damping: 13}});
  return (
    <AbsoluteFill style={{background: `rgba(30,23,18,${0.82 * Math.min(1, s)})`, alignItems: 'center', justifyContent: 'center', flexDirection: 'column'}}>
      <div style={{width: 220, height: 220, border: `10px solid ${P.son}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${1.8 - 0.8 * Math.min(s, 1.03)}) rotate(-6deg)`, opacity: Math.min(1, s)}}>
        <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 64, color: P.son, lineHeight: 1, textAlign: 'center'}}>SỬ<br />AZ</div>
      </div>
      <div style={{fontFamily: MONO, fontSize: 34, letterSpacing: 10, color: P.paper, marginTop: 40, opacity: inK(t, at + 0.4, 0.6)}}>{b.text}</div>
      {b.sub && <div style={{fontFamily: SERIF, fontStyle: 'italic', fontSize: 40, color: P.paper2, marginTop: 14, opacity: inK(t, at + 0.7, 0.6)}}>{b.sub}</div>}
    </AbsoluteFill>
  );
};

// beat cung loai ket thuc khi beat cung loai tiep theo bat dau (hoac 'clear')
function untilOf(beats: Beat[], i: number, end: number): number {
  const b = beats[i];
  for (let j = i + 1; j < beats.length; j++) {
    if (beats[j].type === b.type || beats[j].type === 'clear' || beats[j].type === 'ident') return beats[j].at ?? end;
  }
  return end;
}

export const Dossier: React.FC<DossierProps> = ({duration, spec}) => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => { document.fonts.ready.then(() => continueRender(handle)); }, [handle]);
  const beats = [...(spec.beats ?? [])].filter((b) => b.at !== undefined).sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  const prints = beats.filter((b) => b.type === 'print');
  const {t} = useT();
  return (
    <AbsoluteFill>
      <Desk />
      {prints.map((b, i) => <Print key={'p' + i} b={b} idx={i} next={prints[i + 1]?.at} />)}
      <Ledger open={beats.find((b) => b.type === 'ledger')} lines={beats.filter((b) => b.type === 'line')} />
      {beats.map((b, i) => {
        const u = untilOf(beats, i, duration);
        if (b.type === 'slip') return <Slip key={i} b={b} until={u} />;
        if (b.type === 'note') return <Note key={i} b={b} until={u} />;
        if (b.type === 'seal') return <Seal key={i} b={b} until={u} />;
        if (b.type === 'ranks') return <Ranks key={i} b={b} until={u} />;
        return null;
      })}
      {spec.source && t < (beats.find((b) => b.type === 'ident')?.at ?? 1e9) && (
        <div style={{position: 'absolute', left: 110, top: 34, fontFamily: MONO, fontSize: 20, color: 'rgba(237,227,204,0.6)'}}>{spec.source}</div>
      )}
      {beats.filter((b) => b.type === 'ident').map((b, i) => <Ident key={'i' + i} b={b} />)}
    </AbsoluteFill>
  );
};
