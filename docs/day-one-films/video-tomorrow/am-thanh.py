"""Nhạc nền + hiệu ứng + giọng thì thầm cho TOMORROW. Mốc thời gian khớp scene.js.

Chạy: python3 am-thanh.py <file.wav> [whispers.json <thư mục model Kokoro>]
  whispers.json lấy từ `node render.js whispers whispers.json`;
  model Kokoro: kokoro.onnx + voices.bin (github.com/thewh1teagle/kokoro-onnx, bản model-files-v1.0).
"""
import sys
import wave

import numpy as np

SR = 44100
DUR = 165.0
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(11)


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


# ---------- 1. 0–14 phòng đêm ----------
for i, tt in enumerate(np.arange(1.7, 3.0, 0.42)):
    add(tt, strum(CH["Am"], up=i % 2 == 1, dur=1.2), 0.5, pan=0.15)
add(3.0, strum(CH["BAD"], dur=0.6, bright=0.2), 0.45, pan=0.15)  # hợp âm sai
add(3.02, kick(90, 60, 0.12), 0.25)
for i in range(3):
    add(2 + i * 4, pad(PADS[PROG_MIN[i % 4]], 4.6), 0.15)
add(4.4, whoosh(1.6), 0.18)
add(4.4, pad(["A1", "E2"], 9, 1.5, 2), 0.08)
for k in range(10):  # tiếng bút viết
    add(8.4 + k * 0.14, noise(0.08, 3000, 30), 0.08, pan=-0.4)
add(10.0, whoosh(0.8, False), 0.12)
add(12.4, click(), 0.6)  # tắt đèn

# ---------- 2. 14–42 montage giọng thứ ----------
mel = ["E5", "C5", "A4", "C5", "F5", "C5", "A4", "C5", "E5", "C5", "G4", "C5", "D5", "B4", "G4", "B4"]
for i in range(7):
    t0 = 14 + i * 4
    add(t0, pad(PADS[PROG_MIN[i % 4]], 4.6), 0.12)
    add(t0, piano(CH[PROG_MIN[i % 4]][0].replace("2", "3"), 4), 0.08)
    for j in range(4):
        if (i + j) % 3 != 2:
            add(t0 + j, piano(mel[(i % 4) * 4 + j]), 0.09, pan=rng.uniform(-0.3, 0.3))
for tb in (14, 17.5, 21, 24.5, 28, 31.5, 35, 38.5, 42, 46.5, 51):
    tick(tb)
for tt in np.arange(14.4, 17.5, 1.0):
    add(tt, click(), 0.3, pan=0.2)  # lướt
for tt in (17.8, 18.1, 18.4):
    add(tt, kick(160, 90, 0.12), 0.35, pan=0.5)  # gõ cửa
add(20.4, kick(80, 45, 0.3), 0.45, pan=0.5)  # đóng cửa
add(20.4, noise(0.2, 2000, 15), 0.2, pan=0.5)
for tt in np.arange(21.2, 24.4, 0.45):
    add(tt, noise(0.35, 2500, 8), 0.07, pan=0.1)  # quét nhà
for tt in np.arange(25.1, 28, 0.36):  # nhạc nhỏ từ điện thoại
    _c = strum(CH["C"], dur=0.5)
    add(tt, lowpass(_c, 2500) - lowpass(_c, 600), 0.12, pan=0.3)
add(28.6, noise(2.0, 900, 1.5), 0.12)  # đẩy đàn xuống gầm
for i in range(3):
    add(35 + i * 1.15 + 1.05, paper(0.35), 0.25)  # xé lịch
add(39.3, ping(), 0.2)  # giật mình
add(39.3, kick(70, 40, 0.3), 0.3)

# ---------- 3. 42–58 tập dồn ----------
add(42, pad(["A1", "E2"], 14, 1, 2), 0.1)
tt, i = 42.2, 0
while tt < 54.4:
    add(tt, strum(CH[PROG_MIN[(i // 4) % 4]], up=i % 2 == 1, dur=0.5, bright=0.7), 0.26, pan=0.15)
    tt += 0.29
    i += 1
for k in range(14):
    tb = 44 + k * 0.75
    add(tb, kick(70, 38, 0.3), 0.18 + 0.01 * k)
add(54.5, pluck("E5", 0.6, 1.0), 0.6)  # dây đứt
add(54.5, noise(0.15, 8000, 30), 0.35)
add(54.52, kick(100, 50, 0.2), 0.3)
add(55.2, pad(["A1"], 3, 0.5, 2), 0.1)

# ---------- 4. 58–72 mưa, quán bên trong ----------
rain_t = np.arange(int(14 * SR)) / SR
rn = lowpass(rng.standard_normal(len(rain_t)), 5000) - lowpass(rng.standard_normal(len(rain_t)), 300) * 0.3
add(58, rn * env_adsr(len(rn), 0.8, 1.5), 0.08)
add(58, rn[::-1] * env_adsr(len(rn), 0.8, 1.5), 0.05, pan=0.5)
tt, i = 58.2, 0
while tt < 67.5:  # tiếng hát trong quán, nghe qua kính
    s = lowpass(strum(CH[PROG_MAJ[(i // 4) % 4]], up=i % 2 == 1, dur=0.9), 900)
    add(tt, s, 0.20, pan=0.5)
    tt += 0.62
    i += 1
add(58, pad(["A1", "E2", "A2"], 14, 2, 3), 0.08)
tick(66.8)
for k in range(7):
    add(67.7 + k * 0.6, noise(0.06, 1500, 40), 0.15, pan=-0.2)  # bước chân trên nước

# ---------- 5. 72–86 bước ngoặt ----------
add(72, pad(["A1", "E2"], 8, 2, 2), 0.1)
add(73.6, paper(0.8), 0.35)  # xé NOV 30
add(75.0, whoosh(1.4), 0.15)
add(77.6, click(), 0.6)  # giành bút
add(77.6, kick(85, 50, 0.2), 0.3)
for k in range(6):
    add(79.4 + k * 0.12, noise(0.05, 6000, 50), 0.1, pan=0.4)  # chữ rơi
add(80.4, whoosh(0.6), 0.2)
add(81.6, ping(), 0.2)  # TODAY vào góc
add(84.45, strum(CH["C"], dur=4.0, bright=0.6), 0.6)  # hợp âm đúng đầu tiên
add(84.45, pad(PADS["C"], 3, 0.3, 2), 0.1)
for i, nm in enumerate(["G5", "C6", "E6", "G6"]):
    add(84.8 + i * 0.18, pluck(nm, 1.2, 0.9), 0.08)  # đốm lửa bay về
tick(84.5)
tick(85.6)

# ---------- 6. 86–118 montage giọng trưởng ----------
for tb in (86, 90.5, 95, 100, 105, 111):
    tick(tb)
beat = 60 / 96
tt, i = 86.0, 0
while tt < 117.6:
    ch = PROG_MAJ[(i // 8) % 4]
    if i % 8 == 0:
        add(tt, pad(PADS[ch], 8 * beat + 0.5, 0.8, 1.0), 0.09 + 0.04 * min(1, (tt - 86) / 30))
    slow = tt < 90.5
    if not slow or i % 2 == 0:
        add(tt, strum(CH[ch], up=i % 2 == 1, dur=1.0 if slow else 0.7), 0.24 + 0.06 * min(1, (tt - 86) / 30), pan=0.1)
    if tt >= 95 and tt < 100 or tt >= 105:
        add(tt, kick(120, 55, 0.18), 0.3 if i % 2 == 0 else 0.18, pan=-0.3)  # trống thùng nhựa
        add(tt, noise(0.08, 3000, 30), 0.12, pan=-0.3)
    tt += beat / 2 * 2
    i += 1
for k in range(16):
    add(113.0 + k * 0.14, noise(0.07, 3000, 30), 0.08)  # ký tên

# ---------- 7. 118–132 trận cuối ----------
add(118, pad(["A1", "E2", "B2"], 14, 0.8, 1.5), 0.11)
for tb in np.arange(118.3, 126, 0.9):
    add(tb, kick(70, 38, 0.3), 0.26)
    add(tb, noise(0.03, 3000, 80), 0.06)
add(121.5, whoosh(2.5), 0.18)
add(127.2, whoosh(0.6), 0.32)
add(127.8, kick(90, 45, 0.3), 0.5)
add(127.8, noise(0.25, 2500, 12), 0.25)
add(129.3, whoosh(2.4), 0.28)
add(131.8, kick(120, 40, 0.8), 0.75)
add(131.8, noise(2.5, 5000, 1.8), 0.22)
add(131.8, noise(0.12, 7000, 25), 0.3)
add(131.8, pad(["C3", "G3", "C4", "E4", "G4"], 5, 0.05, 2.5), 0.18)

# ---------- 8. 132–152 sân khấu ----------
add(132.4, noise(3.5, 1200, 0.6), 0.1)
add(132.2, pad(PADS["C"], 8, 1.5, 1.5), 0.12)  # tiếng khán phòng
for k in range(6):
    add(132.4 + k * 0.6, noise(0.06, 1500, 40), 0.12)
add(136.8, noise(0.2, 1200, 20), 0.15)  # ghế đẩu
beat = 0.5
tt, i = 140.0, 0
mel_s = ["E5", "D5", "C5", "D5", "E5", "G5", "E5", "D5", "C5", "E5", "A4", "C5", "A4", "C5", "F5", "E5"]
while tt < 151.8:
    ch = PROG_MAJ[(i // 4) % 4]
    add(tt, strum(CH[ch], up=i % 2 == 1, dur=1.2, bright=0.6), 0.55)
    if i % 2 == 0:
        add(tt, pluck(mel_s[(i // 2) % 16], 1.4, 0.8), 0.42, pan=0.1)
    if i % 4 == 0:
        add(tt, pad(PADS[ch], 2.4, 0.5, 0.8), 0.13)
    tt += beat
    i += 1
for k in range(60):  # vỗ tay
    add(149.6 + rng.uniform(0, 3.0), noise(0.04, 5000, 60), 0.12 * rng.uniform(0.5, 1), pan=rng.uniform(-0.8, 0.8))

# ---------- 9. 152–165 kết ----------
add(152, pad(PADS["F"], 4, 1.2, 1.6), 0.2)
add(152.6, piano("A4", 3.5), 0.16)
add(155.6, pad(PADS["C"], 4, 1.0, 1.6), 0.2)
add(155.8, piano("C5", 3.5), 0.16)
add(159.6, strum(CH["C"], dur=5.0, bright=0.5), 0.55)
add(160.0, piano("G4", 5), 0.08)
add(161.0, piano("C5", 4), 0.07)

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
_duck = 1 - 0.85 * np.clip((_t - 130.2) / 0.2, 0, 1) * np.clip((131.78 - _t) / 0.05, 0, 1)
L *= _duck
R *= _duck
for tb in [130.4, 130.95, 131.4]:  # chỉ còn nhịp tim
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
