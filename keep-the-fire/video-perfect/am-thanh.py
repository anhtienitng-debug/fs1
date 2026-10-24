"""Nhạc nền + hiệu ứng + giọng thì thầm cho PERFECT. Mốc thời gian khớp scene.js.

Chạy: python3 am-thanh.py <file.wav> [whispers.json <thư mục model Kokoro>]
  whispers.json lấy từ `node render.js whispers whispers.json`;
  model Kokoro: kokoro.onnx + voices.bin (github.com/thewh1teagle/kokoro-onnx, bản model-files-v1.0).
"""
import sys
import wave

import numpy as np

SR = 44100
DUR = 161.0
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(13)


def note_hz(name):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + 12 * (octave + 1) - 69) / 12)


def add(t0, sig, vol=1.0, pan=0.0):
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


# ---------- tiếng đồ vật ----------
def scratch(dur, rate=14):
    """bút chì sột soạt"""
    t = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal(len(t))
    band = lowpass(n, 7000) - lowpass(n, 2200)
    am = 0.55 + 0.45 * np.abs(np.sin(np.pi * rate * t + rng.random() * 3))
    return band * am * env_adsr(len(t), 0.02, 0.05)


def rub(dur, rate=9):
    """tẩy rèn rẹt"""
    t = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal(len(t))
    band = lowpass(n, 2600) - lowpass(n, 500)
    am = np.abs(np.sin(np.pi * rate * t)) ** 0.7
    return band * am * env_adsr(len(t), 0.02, 0.05)


def tape():
    return lowpass(rng.standard_normal(int(0.35 * SR)), 5000) * np.linspace(1, 0.2, int(0.35 * SR)) * (0.6 + 0.4 * (rng.random(int(0.35 * SR)) > 0.5))


def draw_at(a, b, vol=0.16, pan=0.2):
    if b > a:
        add(a, scratch(b - a), vol, pan=pan)


def erase_at(a, b, vol=0.2, pan=0.2):
    if b > a:
        add(a, rub(b - a), vol, pan=pan)


# ---------- 1. 0–14 bàn vẽ đêm ----------
for i in range(4):
    add(1.8 + i * 4, pad(PADS[PROG_MIN[i % 4]], 4.6), 0.14)
draw_at(1.8, 4.6, 0.2)
add(4.6, whoosh(1.4), 0.15)
add(4.6, pad(["A1", "E2"], 9, 1.5, 2), 0.08)
erase_at(7.4, 9.0, 0.28, 0)
tick(7.8)
for c in range(2):
    a = 9.6 + c * 2.2
    draw_at(a, a + 1.3)
    erase_at(a + 1.3, a + 2.2)
tick(9.4)
tick(11.6)
tick(13.8)

# ---------- 2. 14–42 montage giọng thứ ----------
mel = ["E5", "C5", "A4", "C5", "F5", "C5", "A4", "C5", "E5", "C5", "G4", "C5", "D5", "B4", "G4", "B4"]
for i in range(7):
    t0 = 14 + i * 4
    add(t0, pad(PADS[PROG_MIN[i % 4]], 4.6), 0.13)
    add(t0, piano(CH[PROG_MIN[i % 4]][0].replace("2", "3"), 4), 0.08)
    for j in range(4):
        if (i + j) % 3 != 2:
            add(t0 + j, piano(mel[(i % 4) * 4 + j]), 0.09, pan=rng.uniform(-0.3, 0.3))
for tb in (14, 17.5, 21, 24.5, 28, 31.5, 35, 38.5):
    tick(tb)
for c in range(4):
    a = 14 + c * 0.9
    draw_at(a, a + 0.5, 0.18, 0)
    erase_at(a + 0.5, a + 0.9, 0.24, 0)
add(18.6, tape(), 0.18, pan=0.5)  # Pip dán tranh
for k in range(6):
    add(21.2 + k * 0.55, noise(0.06, 1500, 40), 0.12)  # bước chân
draw_at(24.5, 26.2)
erase_at(26.6, 27.9, 0.26)
erase_at(28, 29.8, 0.3, 0)
add(28.8, lowpass(rng.standard_normal(int(0.3 * SR)), 4000) * np.linspace(1, 0, int(0.3 * SR)), 0.2)  # thủng giấy
add(31.8, noise(0.6, 6000, 4), 0.3)  # xé trang
add(32.4, noise(0.5, 3000, 8), 0.18)  # vo tròn
add(33.6, kick(110, 70, 0.12), 0.25)  # rơi vào sọt
for k in range(3):
    add(38.7 + k * 0.4, kick(200, 150, 0.06), 0.18, pan=0.2)  # bày dụng cụ

# ---------- 3. 42–58 vẽ "hoàn hảo" ----------
add(42, pad(["A1", "E2"], 16, 1, 2), 0.1)
for k in range(14):
    a = 42.6 + k * 0.8
    draw_at(a, a + 0.45, 0.12)
for k in range(12):
    tb = 46 + k * 0.7
    add(tb, kick(70, 38, 0.3), 0.16 + 0.01 * k)
add(53.6, noise(0.12, 4000, 30), 0.15)  # nét lệch
erase_at(54.8, 56.4, 0.42, 0)
add(56.4, noise(0.7, 7000, 5), 0.45)  # giấy rách đôi
add(56.42, kick(100, 50, 0.2), 0.3)

# ---------- 4. 58–72 đáy ----------
add(58, pad(["A1", "E2", "A2"], 14, 2, 3), 0.2)
add(63, pad(PADS["F"], 9, 2, 3), 0.14)
add(66.2, tape(), 0.15, pan=0.5)
for i, nm in enumerate(["C5", "E5", "G5", "E5"]):  # hộp nhạc nhỏ bên cửa sổ nhà Pip
    add(64.0 + i * 0.5, piano(nm, 2.5), 0.14, pan=0.4)

# ---------- 5. 72–86 bước ngoặt ----------
add(72, pad(["A1", "E2"], 8, 2, 2), 0.1)
add(75.8, whoosh(0.5), 0.2)
add(76.5, kick(120, 70, 0.15), 0.4)  # cục tẩy vào sọt: "cộp"
add(76.52, noise(0.08, 3000, 40), 0.2)
tick(76.5)
for k in range(10):
    add(78.4 + k * 0.1, noise(0.04, 5000, 60), 0.08, pan=rng.uniform(-0.4, 0.4))  # chữ vỡ thành vụn
add(79.3, ping(), 0.2)
add(80.4, whoosh(0.6), 0.18)
draw_at(81.5, 83.8, 0.22, 0)  # một nét liền
add(83.8, pad(PADS["C"], 3, 0.3, 2), 0.12)
add(83.8, piano("C4", 3), 0.14)
add(84.6, tape(), 0.22, pan=-0.3)
tick(83.8)
tick(85.6)

# ---------- 6. 86–118 montage giọng trưởng: bút chì thành bộ gõ, băng dính làm phách ----------
for tb in (86, 92.4, 98.8, 105.2, 111.6):
    tick(tb)
beat = 60 / 100
tt, i = 86.0, 0
arp = {"C": ["C4", "E4", "G4", "C5"], "G": ["B3", "D4", "G4", "B4"], "Am": ["A3", "C4", "E4", "A4"], "F": ["A3", "C4", "F4", "A4"]}
while tt < 117.6:
    ch = PROG_MAJ[(i // 8) % 4]
    if i % 8 == 0:
        add(tt, pad(PADS[ch], 8 * beat + 0.5, 0.8, 1.0), 0.1 + 0.04 * min(1, (tt - 86) / 30))
        add(tt, piano(CH[ch][0].replace("2", "3"), 4), 0.11)
    add(tt, piano(arp[ch][i % 4], 1.4), 0.08 + 0.03 * min(1, (tt - 86) / 30), pan=0.3 * np.sin(i))
    add(tt + beat / 2, scratch(0.12, 30), 0.12, pan=-0.3)  # bút chì làm hi-hat
    if tt >= 98.8 and i % 2 == 0:
        add(tt, kick(100, 50, 0.2), 0.22)
    tt += beat
    i += 1
for a, b in [(86.4, 91.0), (92.6, 97.6), (111.8, 115.4)]:
    draw_at(a, b, 0.1)
add(91.2, scratch(0.8, 6), 0.18)  # ký tên
for k in range(4):
    add(105.6 + k * 1.4, tape(), 0.14, pan=rng.uniform(-0.6, 0.6))
add(116.2, noise(0.8, 3000, 3), 0.15)  # cuộn tranh

# ---------- 7. 118–134 trận cuối ----------
add(118, pad(["A1", "E2", "B2"], 13, 0.8, 1.5), 0.08)
for tb in np.arange(118.3, 125.4, 0.85):
    add(tb, kick(70, 38, 0.3), 0.26)
    add(tb, noise(0.03, 3000, 80), 0.06)
add(119.6, whoosh(1.4), 0.15)
for k in range(7):  # bút đỏ khoanh: "xoẹt"
    add(121.2 + k * 0.55, scratch(0.38, 4), 0.3, pan=0.4)
add(125.5, noise(1.0, 1500, 3), 0.08)  # thở ra
add(127.0, scratch(1.8, 5), 0.3, pan=0)  # chữ ký: một nét dài
add(127.0, pad(PADS["C"], 2.2, 0.6, 0.8), 0.1)
add(130.6, kick(220, 140, 0.05), 0.5)  # đinh ghim "tách"
add(130.6, noise(0.04, 8000, 80), 0.4)
add(130.62, kick(120, 40, 0.8), 0.7)
add(130.62, noise(2.5, 5000, 1.8), 0.22)
add(130.62, noise(0.12, 7000, 25), 0.3)
add(130.62, pad(["C3", "G3", "C4", "E4", "G4"], 5, 0.05, 2.5), 0.18)

# ---------- 8. 134–150 phần thưởng ----------
add(134, noise(8, 1000, 0.3), 0.04)  # tiếng công viên
for k in range(8):
    add(134.3 + k * 0.5, noise(0.06, 1500, 40), 0.1, pan=rng.uniform(-0.6, 0.6))
mel_s = ["E5", "D5", "C5", "D5", "E5", "G5", "E5", "D5", "C5", "E5", "A4", "C5", "A4", "C5", "F5", "E5"]
tt, i = 134.5, 0
while tt < 150:
    ch = PROG_MAJ[(i // 4) % 4]
    if i % 4 == 0:
        add(tt, pad(PADS[ch], 2.6, 0.5, 0.8), 0.16)
        add(tt, piano(CH[ch][0].replace("2", "3"), 3), 0.14)
    if i % 2 == 0:
        add(tt, piano(mel_s[(i // 2) % 16], 2.0), 0.16, pan=0.1)
    tt += 0.5
    i += 1
add(143.0, tape(), 0.2, pan=0.4)  # Pip dán bức chim vẽ lại

# ---------- 9. 150–161 kết ----------
add(150, pad(PADS["F"], 4, 1.2, 1.6), 0.2)
add(150.5, piano("A4", 3.5), 0.16)
add(152.6, pad(PADS["C"], 4, 1.0, 1.6), 0.2)
add(152.8, piano("C5", 3.5), 0.16)
add(155.6, pad(PADS["C"], 5, 0.4, 2.5), 0.18)
add(155.6, piano("C4", 5), 0.14)
add(156.0, piano("G4", 5), 0.1)
add(157.0, piano("C5", 4), 0.09)

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
        add(t0 + 0.05, w, 0.30, pan=pan)
        add(t0 + 0.09, w, 0.10, pan=-pan)  # vọng nhẹ ở kênh đối diện

# ---------- khoảng lặng trước cú vỡ ----------
_t = np.arange(N) / SR
_duck = 1 - 0.85 * np.clip((_t - 129.1) / 0.15, 0, 1) * np.clip((130.58 - _t) / 0.05, 0, 1)
L *= _duck
R *= _duck
for tb in [129.3, 129.85, 130.3]:  # chỉ còn nhịp tim
    add(tb, kick(70, 38, 0.3), 0.32)
    add(tb, noise(0.03, 3000, 80), 0.08)

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
