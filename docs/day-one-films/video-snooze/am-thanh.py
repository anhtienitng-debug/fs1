"""Nhạc nền + hiệu ứng + giọng thì thầm cho SNOOZE. Mốc thời gian khớp scene.js.

Chạy: python3 am-thanh.py <file.wav> [whispers.json <thư mục model Kokoro>]
  whispers.json lấy từ `node render.js whispers whispers.json`;
  model Kokoro: kokoro.onnx + voices.bin (github.com/thewh1teagle/kokoro-onnx, bản model-files-v1.0).
"""
import sys
import wave

import numpy as np

SR = 44100
DUR = 143.8
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(19)


def note_hz(name):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + 12 * (octave + 1) - 69) / 12)


# bảng ghép khớp scene.js: [từ, đến, chèn?] theo giờ phim gốc. Mốc rơi vào đoạn bị bỏ thì không phát.
EDL = [(0, 35, 0), (42, 45, 0), (35, 38.5, 0), (45, 48, 0), (58, 72, 0), (72, 78, 1), (72, 92, 0), (98, 116, 0), (116, 121.5, 0), (132, 147.4, 0), (122, 128, 0), (150.6, 165, 0)]


def to_real(t, ins=False):
    acc = 0.0
    for a, b, i in EDL:
        if bool(i) == ins and a <= t < b:
            return acc + t - a
        acc += b - a
    return None


def add(t0, sig, vol=1.0, pan=0.0, raw=False, ins=False):
    if not raw:
        t0 = to_real(t0, ins)
        if t0 is None:
            return
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i] * vol
    L[i:i + len(sig)] += sig * np.sqrt((1 - pan) / 2)
    R[i:i + len(sig)] += sig * np.sqrt((1 + pan) / 2)


def env_adsr(n, a, r):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(sig, cutoff):
    f = np.fft.rfft(sig)
    freqs = np.fft.rfftfreq(len(sig), 1 / SR)
    f *= 1 / (1 + (freqs / cutoff) ** 4)
    return np.fft.irfft(f, len(sig))


# ---------- nhạc cụ ----------
def piano(name, dur=3.0):
    f = note_hz(name)
    t = np.arange(int(dur * SR)) / SR
    s = sum((1 / k ** 1.6) * np.sin(2 * np.pi * f * k * (1 + 0.0004 * k * k) * t) * np.exp(-t * (1.2 + 0.9 * k)) for k in range(1, 7))
    return s * env_adsr(len(t), 0.004, 0.3)


def pad(names, dur, a=1.5, r=1.8):
    t = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(t)
    for nm in names:
        f = note_hz(nm)
        for d in (-0.15, 0, 0.17):
            s += np.sin(2 * np.pi * (f + d) * t + rng.random() * 6) + 0.25 * np.sin(2 * np.pi * 2 * (f + d) * t)
    s *= (1 + 0.08 * np.sin(2 * np.pi * 0.25 * t))
    return s / (3 * len(names)) * env_adsr(len(t), a, r)


def kick(f0=110, f1=42, dur=0.45):
    t = np.arange(int(dur * SR)) / SR
    ph = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t * 28)) / SR
    return np.sin(ph) * np.exp(-t * 7)


def noise(dur, cutoff=4000, decay=30):
    t = np.arange(int(dur * SR)) / SR
    return lowpass(rng.standard_normal(len(t)), cutoff) * np.exp(-t * decay)


def click():
    n = noise(0.03, 6000, 160)
    return np.diff(np.concatenate([[0], n])) * 3


def buzz(dur=0.6):
    t = np.arange(int(dur * SR)) / SR
    s = np.tanh(3 * np.sin(2 * np.pi * 165 * t)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 9 * t)))
    return lowpass(s, 900) * env_adsr(len(t), 0.01, 0.05)


def ping():
    t = np.arange(int(0.35 * SR)) / SR
    return (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 1976 * t)) * np.exp(-t * 14)


def whoosh(dur, rise=True):
    t = np.arange(int(dur * SR)) / SR
    e = (t / dur) ** 2 if rise else np.exp(-t * 3)
    return lowpass(rng.standard_normal(len(t)), 1800) * e




def pluck(name, dur=2.5, bright=0.5):
    """Dây đàn gảy (Karplus–Strong)."""
    f = note_hz(name)
    n = int(dur * SR)
    p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p)
    buf = lowpass(np.concatenate([buf, buf]), 2000 + 6000 * bright)[:p]
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return out * env_adsr(n, 0.002, 0.2)


_CACHE = {}


def strum(names, up=False, vol=1.0, dur=2.2, bright=0.5):
    key = (tuple(names), up, dur, bright)
    if key not in _CACHE:
        order = names[::-1] if up else names
        total = np.zeros(int((dur + 0.15) * SR))
        for i, nm in enumerate(order):
            s = pluck(nm, dur, bright)
            j = int(i * 0.014 * SR)
            total[j:j + len(s)] += s[: len(total) - j]
        _CACHE[key] = total / len(names)
    return _CACHE[key] * vol


def paper(dur=0.5):
    t = np.arange(int(dur * SR)) / SR
    return lowpass(rng.standard_normal(len(t)), 6000) * (0.5 + 0.5 * (rng.random(len(t)) > 0.7)) * env_adsr(len(t), 0.02, 0.1)


CH = {
    "Am": ["A2", "E3", "A3", "C4", "E4"], "F": ["F2", "C3", "F3", "A3", "C4"], "C": ["C3", "G3", "C4", "E4", "G4"],
    "G": ["G2", "D3", "G3", "B3", "D4"], "BAD": ["E2", "F3", "A#3", "B3", "F4"],
}
PROG_MIN, PROG_MAJ = ["Am", "F", "C", "G"], ["C", "G", "Am", "F"]
PADS = {k: [n for n in v[:4]] for k, v in CH.items()}


def tick(t0, v=0.5):
    add(t0 + 0.05, click(), v)


# ---------- tiếng riêng của phim ----------
def bell(dur):
    """chuông cơ của đồng hồ báo thức: hai tiếng chuông kim loại, búa gõ ~18 lần/giây"""
    t = np.arange(int(dur * SR)) / SR
    tone = np.sin(2 * np.pi * 2100 * t) + 0.7 * np.sin(2 * np.pi * 2730 * t) + 0.4 * np.sin(2 * np.pi * 3900 * t)
    am = (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 18 * t))) * np.exp(-((t * 18) % 1) * 3)
    return tone * am * env_adsr(len(t), 0.01, 0.05)


def knock():
    a, b = kick(180, 110, 0.12), noise(0.05, 2500, 60)
    a[: len(b)] += b
    return a


def tink(f=2600):
    t = np.arange(int(0.6 * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 9)


def chimes(dur, n=24):
    out = np.zeros(int((dur + 0.7) * SR))
    for i in range(n):
        s = tink(rng.choice([1760, 2093, 2349, 2637, 3136, 3520]))
        j = int(rng.uniform(0, dur) * SR)
        out[j:j + len(s)] += s[: len(out) - j] * rng.uniform(0.3, 1)
    return out / 3


def water(dur):
    t = np.arange(int(dur * SR)) / SR
    n = lowpass(rng.standard_normal(len(t)), 700)
    return n * (0.6 + 0.4 * np.sin(2 * np.pi * 0.18 * t)) * env_adsr(len(t), 1.0, 1.0)


def chirp():
    t = np.arange(int(0.18 * SR)) / SR
    f = 3200 + 1400 * np.sin(np.pi * t / 0.18)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.18)


def birds(a, b, dens=1.0, vol=0.05):
    tt = a
    while tt < b:
        for k in range(rng.integers(2, 4)):
            add(tt + k * 0.2, chirp(), vol, pan=rng.uniform(-0.7, 0.7))
        tt += rng.uniform(1.0, 2.2) / dens


def ring(a, b, vol=0.14):
    if b > a:
        add(a, bell(b - a), vol, pan=-0.4)


def numtick(t0, v=0.07, **kw):
    """Motif: mỗi lần con số ngày tụt 1 là một tiếng "tách" nhỏ, giống nhau suốt phim."""
    add(t0, click(), v * 2.2, **kw)
    add(t0 + 0.01, ping(), v, **kw)


def snoozeclick(t0):
    add(t0, click(), 0.6, pan=-0.3)
    add(t0, kick(200, 140, 0.05), 0.2, pan=-0.3)


# ---------- mở phim: con số 60 trong bóng tối ----------
add(0.05, piano("A2", 3.5), 0.12)
add(0.05, pad(["A1", "E2"], 2.2, 0.4, 1.2), 0.1)
numtick(0.3, 0.06)

# ---------- 1. 0–14 ----------
for i in range(4):
    add(1.4 + i * 3.6, pad(PADS[PROG_MIN[i % 4]], 4.2), 0.16)
    add(1.4 + i * 3.6, piano(CH[PROG_MIN[i % 4]][0].replace("2", "3"), 4), 0.08)
ring(1.6, 7.2)
for k in range(3):
    add(2.65 + k * 0.28, knock(), 0.3, pan=0.6)
add(4.0, whoosh(1.2), 0.15)
snoozeclick(7.2)
add(7.6, chimes(1.4, 6), 0.1, pan=0.3)
add(9.2, tink(2349), 0.2, pan=0.1)  # mặt trời rơi vào lọ
add(9.25, click(), 0.3)  # nắp đóng
tick(9.3)
birds(10, 14, 0.5, 0.02)

# ---------- 2. 14–42 ----------
mel = ["E5", "C5", "A4", "C5", "F5", "C5", "A4", "C5", "E5", "C5", "G4", "C5", "D5", "B4", "G4", "B4"]
for i in range(7):
    t0 = 14 + i * 4
    add(t0, pad(PADS[PROG_MIN[i % 4]], 4.6), 0.14)
    add(t0, piano(CH[PROG_MIN[i % 4]][0].replace("2", "3"), 4), 0.08)
    for j in range(4):
        if (i + j) % 3 != 2:
            add(t0 + j, piano(mel[(i % 4) * 4 + j]), 0.09, pan=rng.uniform(-0.3, 0.3))
for tb in (14, 17.5, 21, 24.5, 28, 31.5, 35, 38.5):
    tick(tb)
for k in range(4):
    ring(14 + k * 0.9, 14 + k * 0.9 + 0.3, 0.1)
    snoozeclick(14 + k * 0.9 + 0.3)
add(17.5, water(3.5), 0.12)
birds(17.6, 21, 1.2, 0.04)
for k in range(3):
    add(21.4 + k * 0.32, knock(), 0.16, pan=0.6)  # gõ cửa nhỏ hơn
add(22.0, noise(0.8, 1500, 3), 0.12)  # kéo chăn
numtick(25.6)  # con số trên đầu tụt 1
numtick(19.2, 0.08, pan=-0.2)  # số của ông ở bến tụt 1
numtick(36.6, 0.08, pan=-0.2)
add(25.9, whoosh(0.4), 0.1)  # quơ tay xua
for k in range(7):
    add(28.3 + k * 0.42, tink(2093 + 120 * k), 0.12)
add(31.6, noise(1.0, 800, 2), 0.06)
add(35, water(3.5), 0.12)
birds(35, 38.5, 1.0, 0.04)

# ---------- gieo bà cụ (42–48 gốc): trưa, công viên ----------
add(42, pad(PADS["Am"], 6.2, 1.0, 1.5), 0.1)
for k in range(8):
    add(42.2 + k * 0.7 + rng.uniform(0, 0.2), noise(0.04, 2600, 60), 0.04, pan=0.4)  # chim mổ
birds(42.4, 47.6, 0.8, 0.025)
add(42.8, piano("E5", 2.2), 0.06)
add(45.4, piano("C5", 2.2), 0.06)

# ---------- 4. 58–72 + đoạn chèn 72–78 (ins=True): công viên, bà cụ số 1 · đám tang · số của ông ----------
add(58, pad(["A1", "E2", "A2"], 6.4, 1.5, 2), 0.18)
for k in range(6):
    add(58.3 + k * 0.36, noise(0.06, 1500, 40), 0.1)  # bước chân trên sỏi
for k in range(10):
    add(58 + k * 0.6 + rng.uniform(0, 0.2), noise(0.04, 2600, 60), 0.05, pan=0.5)  # chim mổ
add(60.6, ping(), 0.07, pan=0.4)  # để ý số "1" của bà
add(61.4, piano("E5", 2.4), 0.07)
add(63.3, noise(0.5, 3000, 6), 0.06, pan=0.5)  # chim vỗ cánh
# đám tang: mưa nhỏ, một hồi chuông trầm, piano thưa
add(64, lowpass(rng.standard_normal(int(14 * SR)), 2500) * np.clip(np.arange(int(14 * SR)) / SR / 1.5, 0, 1) * np.clip((14 - np.arange(int(14 * SR)) / SR) / 1.5, 0, 1), 0.035)
add(64, pad(["A1", "E2", "C3"], 8.4, 2, 2), 0.2)
add(64.4, piano("A2", 6), 0.12)
add(64.4, piano("E3", 6), 0.06)
numtick(64.9, 0.06)  # số trên tấm ảnh bà về 0
for k in range(3):
    add(68.0 + k * 0.6, ping(), 0.04, pan=-0.2 + 0.2 * k)  # số trên đầu từng người sáng lên
add(68.4, piano("C4", 3), 0.07)
add(70.2, piano("B3", 3), 0.07)
# số của ông: 35
add(72, pad(["F1", "C2", "A2"], 6.2, 1.0, 2), 0.24, ins=True)
add(73.4, kick(70, 38, 0.4), 0.3, ins=True)
add(73.4, ping(), 0.12, ins=True)
add(74.2, kick(70, 38, 0.4), 0.22, ins=True)
add(76.2, piano("A4", 2.5), 0.08, ins=True)
add(76.7, piano("E4", 2.5), 0.07, ins=True)

# ---------- 5. 72–86 bước ngoặt ----------
add(72, pad(["A1", "E2"], 6, 2, 2), 0.24)
add(78.4, pad(PADS["F"], 6, 1.0, 2), 0.18)
add(72.4, chimes(3.2, 5), 0.05)  # mặt trời gõ vào thành lọ
add(75.6, kick(260, 200, 0.05), 0.4)  # bật nắp "póc"
add(75.62, tink(1760), 0.2)
add(76.2, chimes(2.8, 30), 0.2)  # các mặt trời bay ra như chuông gió
add(76.2, pad(PADS["C"], 4, 0.8, 2), 0.14)
tick(76.2)
for k in range(4):
    add(79.0 + k * 0.12, noise(0.05, 5000, 50), 0.08, pan=0.4)
add(79.9, whoosh(0.6), 0.18)
add(80.2, ping(), 0.18)
add(81.4, whoosh(0.6), 0.16)
add(83.2, kick(200, 140, 0.06), 0.2)
add(85.0, kick(200, 140, 0.06), 0.25)

# ---------- 6. 86–116 giọng trưởng: tiếng chim mỗi sáng một rõ ----------
for tb in (86, 92, 98, 104, 110):
    tick(tb)
beat = 60 / 100
tt, i = 86.0, 0
arp = {"C": ["C4", "E4", "G4", "C5"], "G": ["B3", "D4", "G4", "B4"], "Am": ["A3", "C4", "E4", "A4"], "F": ["A3", "C4", "F4", "A4"]}
while tt < 115.6:
    ch = PROG_MAJ[(i // 8) % 4]
    if i % 8 == 0:
        add(tt, pad(PADS[ch], 8 * beat + 0.5, 0.8, 1.0), 0.1 + 0.04 * min(1, (tt - 86) / 30))
        add(tt, piano(CH[ch][0].replace("2", "3"), 4), 0.11)
    add(tt, piano(arp[ch][i % 4], 1.4), 0.08 + 0.03 * min(1, (tt - 86) / 30), pan=0.3 * np.sin(i))
    tt += beat
    i += 1
ring(86.2, 87.4, 0.1)
add(87.0, kick(100, 60, 0.12), 0.25)  # chân chạm sàn
birds(88, 116, 0.6, 0.035)
add(92.6, noise(1.0, 3500, 4), 0.2)  # kéo rèm
add(98, water(6), 0.1)
for k in range(5):
    add(98.3 + k * 0.45, noise(0.06, 1500, 40), 0.12)
add(104.6, lowpass(rng.standard_normal(int(2.8 * SR)), 1800) * 0.6, 0.1)  # rót ca cao
for k in range(4):
    add(110.2 + k * 1.5, tink(2637), 0.14, pan=0.4)

# ---------- 7. sáng chủ nhật 116–121.5: kéo chăn theo thói quen, con số tụt 1, hất chăn dậy ----------
add(116, pad(["A1", "E2", "B2"], 3.2, 0.5, 1.0), 0.12)
ring(116.0, 120.5, 0.09)
add(116.3, noise(0.8, 1200, 4), 0.12)  # kéo chăn trùm đầu
for tb in np.arange(116.4, 118.0, 0.8):
    add(tb, kick(70, 38, 0.3), 0.22)
numtick(118.1, 0.12)
add(118.9, noise(0.7, 1500, 5), 0.18)  # hất chăn
add(118.95, pad(["C3", "G3", "C4", "E4"], 3.0, 0.05, 1.5), 0.18)
add(119.0, chimes(1.6, 10), 0.06)
for k in range(4):
    add(119.6 + k * 0.25, noise(0.06, 1500, 40), 0.12)  # bước chân
snoozeclick(120.5)  # tắt chuông

# ---------- 7b. sáng sau khi ông đi 122–128: hai ly ca cao, không còn tiếng tách ----------
add(122, water(6), 0.08)
birds(122.4, 128, 0.6, 0.03)
add(122.0, pad(PADS["F"], 3.2, 1.0, 1.5), 0.1)
add(125.0, pad(PADS["C"], 3.2, 1.0, 1.5), 0.1)
add(122.4, piano("A4", 3), 0.07)
add(123.8, tink(2093), 0.05)  # đặt ly lên ghế
add(125.2, piano("G4", 3), 0.07)
add(126.4, piano("E4", 3), 0.06)

# ---------- 8. 132–150 phần thưởng ----------
add(132, water(18), 0.08)
for k in range(8):
    add(132.3 + k * 0.42, noise(0.06, 1500, 40), 0.12)
add(137.4, kick(220, 160, 0.05), 0.25)  # mở ghế
mel_s = ["E5", "D5", "C5", "D5", "E5", "G5", "E5", "D5", "C5", "E5", "A4", "C5", "A4", "C5", "F5", "E5"]
tt, i = 136.5, 0
while tt < 150:
    ch = PROG_MAJ[(i // 4) % 4]
    if i % 4 == 0:
        add(tt, pad(PADS[ch], 2.6, 0.5, 0.8), 0.12)
        add(tt, piano(CH[ch][0].replace("2", "3"), 3), 0.1)
    if i % 2 == 0:
        add(tt, piano(mel_s[(i // 2) % 16], 2.0), 0.11, pan=0.1)
    tt += 0.5
    i += 1
add(140.2, chimes(4.0, 8), 0.04)  # thời gian trôi chậm qua hai bình minh
numtick(141.2, 0.08, pan=0.2)
numtick(143.2, 0.08, pan=0.2)
add(144.8, noise(0.6, 2500, 5), 0.06)  # nhấc mũ len
add(146.2, noise(0.5, 2500, 5), 0.06)  # đội mũ cho Spark
birds(147.4, 150.4, 1.0, 0.04)

# ---------- 9. 150–165 kết ----------
add(150.6, pad(PADS["F"], 4, 1.2, 1.6), 0.2)
add(151.0, piano("A4", 3.5), 0.16)
add(154.2, pad(PADS["C"], 4, 1.0, 1.6), 0.2)
add(154.4, piano("C5", 3.5), 0.16)
add(159.4, pad(PADS["C"], 5, 0.4, 2.5), 0.18)
add(159.4, piano("C4", 5), 0.14)
add(159.8, piano("G4", 5), 0.1)
add(160.8, piano("C5", 4), 0.09)

# ---------- giọng thì thầm của cái bóng ----------
def whisperize(x, sr):
    """Giữ đường bao phổ của giọng nói, thay pha bằng pha ngẫu nhiên → giọng thì thầm."""
    n, hop = 1024, 256
    win = np.hanning(n)
    x = np.concatenate([np.zeros(n), x, np.zeros(n)])
    frames = 1 + (len(x) - n) // hop
    out = np.zeros(len(x))
    norm = np.zeros(len(x))
    for i in range(frames):
        seg = x[i * hop:i * hop + n] * win
        mag = np.abs(np.fft.rfft(seg))
        ph = np.exp(2j * np.pi * rng.random(len(mag)))
        y = np.fft.irfft(mag * ph, n) * win
        out[i * hop:i * hop + n] += y
        norm[i * hop:i * hop + n] += win ** 2
    out = out / np.maximum(norm, 1e-3)
    return out[n:-n]


def resample(x, sr_in, sr_out):
    t_out = np.arange(int(len(x) * sr_out / sr_in)) / sr_out
    return np.interp(t_out, np.arange(len(x)) / sr_in, x)


if len(sys.argv) >= 4:
    import json
    from kokoro_onnx import Kokoro

    kk = Kokoro(f"{sys.argv[3]}/kokoro.onnx", f"{sys.argv[3]}/voices.bin")
    for item in json.load(open(sys.argv[2])):
        t0, text, x = item[0], item[1], 400
        v, vsr = kk.create(text, voice="am_onyx", speed=0.82, lang="en-us")
        w = whisperize(np.asarray(v, dtype=float), vsr)
        w = resample(w, vsr, SR)
        w = w - lowpass(w, 180)  # bỏ phần trầm ù
        w = w / (np.max(np.abs(w)) + 1e-9)
        pan = float(np.clip((x - 640) / 640, -0.7, 0.7))
        add(t0 + 0.05, w, 0.30, pan=pan, raw=True)
        add(t0 + 0.09, w, 0.10, pan=-pan, raw=True)  # vọng nhẹ ở kênh đối diện

# ---------- hoàn thiện ----------
def reverb(x):
    ir_t = np.arange(int(1.6 * SR)) / SR
    ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 3.2)
    ir = lowpass(ir, 5000)
    size = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return y / np.max(np.abs(y)) * np.max(np.abs(x))


wetL, wetR = reverb(L), reverb(R)
L = L + 0.25 * wetL
R = R + 0.25 * wetR
t = np.arange(N) / SR
fade = np.clip((DUR - t) / 1.5, 0, 1) * np.clip(t / 0.05, 0, 1)
L *= fade
R *= fade
peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
L, R = np.tanh(L / peak * 1.1) * 0.89, np.tanh(R / peak * 1.1) * 0.89

out = sys.argv[1]
data = (np.stack([L, R], axis=1) * 32767).astype(np.int16)
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())
print(out, len(data) / SR, "s")
