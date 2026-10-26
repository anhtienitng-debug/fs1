"""Cat giong Vbee lien thanh tung canh: khop tung tu (difflib) giua kich ban va whisper, bam vao khoang lang."""
import difflib, json, re, subprocess, sys, unicodedata, pickle
from pathlib import Path
from autovid.config import load_config
from autovid.stages import align
src, lines_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
cfg = load_config(config_file="config/su-az.yaml")
lines = [l.strip() for l in lines_path.read_text(encoding="utf-8").splitlines() if l.strip()]
cache = out_dir.parent / "heard.pkl"
heard = pickle.load(open(cache, "rb")) if cache.exists() else align._whisper_words(src, cfg)
pickle.dump(heard, open(cache, "wb"))
D = "không một hai ba bốn năm sáu bảy tám chín".split()
def b3(n, full):
    h, t, u = n // 100, n // 10 % 10, n % 10; o = []
    if full or h: o += [D[h], "trăm"]
    if t == 0 and u and (full or h): o.append("lẻ")
    elif t == 1: o.append("mười")
    elif t > 1: o += [D[t], "mươi"]
    if u: o.append("mốt" if u == 1 and t > 1 else "lăm" if u == 5 and t > 0 else D[u])
    return o
def say(n):
    p = []
    while n: p.append(n % 1000); n //= 1000
    o = []
    for k in range(len(p) - 1, -1, -1):
        if p[k]: o += b3(p[k], k < len(p) - 1) + ([["", "nghìn", "triệu"][k]] if k else [])
    return o or ["không"]
def norm(w):
    w = unicodedata.normalize("NFC", w.lower())
    return "".join(c for c in w if c.isalnum())
# tu kich ban
stoks, owner = [], []
for i, l in enumerate(lines):
    for w in l.split():
        if norm(w): stoks.append(norm(w)); owner.append(i)
# tu nghe duoc, doi so thanh chu, chia thoi gian deu cho cac tu con
htoks, htimes = [], []
for a, b, w in heard:
    w = norm(w)
    parts = say(int(w)) if w.isdigit() and len(w) < 10 else ([w] if w else [])
    for j, p in enumerate(parts):
        d = (b - a) / max(len(parts), 1)
        htoks.append(p); htimes.append((a + j * d, a + (j + 1) * d))
sm = difflib.SequenceMatcher(None, stoks, htoks, autojunk=False)
tmap = {}
for blk in sm.get_matching_blocks():
    for k in range(blk.size): tmap[blk.a + k] = htimes[blk.b + k]
print("khớp", len(tmap), "/", len(stoks), file=sys.stderr)
log = subprocess.run(["ffmpeg", "-nostdin", "-i", str(src), "-af", "silencedetect=noise=-38dB:d=0.2", "-f", "null", "-"], capture_output=True, text=True).stderr
sil = [(float(a), float(b)) for a, b in zip(re.findall(r"silence_start: ([\d.]+)", log), re.findall(r"silence_end: ([\d.]+)", log))]
total = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)], capture_output=True, text=True).stdout)
bounds = [0.0]
for i in range(len(lines) - 1):
    last = max(k for k, o in enumerate(owner) if o == i); first = last + 1
    # tu khop gan nhat hai phia ranh gioi
    lk = next((tmap[k][1] for k in range(last, -1, -1) if k in tmap), bounds[-1])
    fk = next((tmap[k][0] for k in range(first, len(stoks)) if k in tmap), total)
    cand = [s for s in sil if s[1] >= lk - 0.15 and s[0] <= fk + 0.15]
    b = max(cand, key=lambda s: s[1] - s[0]) if cand else None
    bounds.append((b[0] + b[1]) / 2 if b else (lk + fk) / 2)
bounds.append(total)
out_dir.mkdir(parents=True, exist_ok=True)
rep = []
trim = "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.12"
for i, (a, b) in enumerate(zip(bounds, bounds[1:])):
    dest = out_dir / f"s-{i:03d}.wav"
    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", str(src),
                    "-af", trim, "-ar", "48000", "-ac", "1", str(dest)], check=True)
    rep.append((i, round(a, 2), round(b - a, 2)))
print(json.dumps(rep))
