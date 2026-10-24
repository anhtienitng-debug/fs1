"""Nhạc nền + hiệu ứng + giọng thì thầm cho COMPARE. Mốc thời gian khớp scene.js.

Chạy: python3 am-thanh.py <file.wav> [whispers.json <thư mục model Kokoro>]
  whispers.json lấy từ `node render.js whispers whispers.json`;
  model Kokoro: kokoro.onnx + voices.bin (github.com/thewh1teagle/kokoro-onnx, bản model-files-v1.0).
"""
import sys
import wave

import numpy as np

SR = 44100
DUR = 167.0  # 161 giây phim gốc + 6 giây hồi tưởng chèn ở 73.2
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(17)


def note_hz(name):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + 12 * (octave + 1) - 69) / 12)


SHIFT = True  # mốc theo phim gốc: từ 73.2 trở đi dời +6 giây cho đoạn hồi tưởng


def add(t0, sig, vol=1.0, pan=0.0):
    if SHIFT and t0 >= 73.2:
        t0 += 6.0
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


# ---------- tiếng ván trượt ----------
def roll(dur, speed=1.0):
    """bánh ván lăn trên bê tông"""
    t = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal(len(t))
    band = lowpass(n, 1400) - lowpass(n, 250)
    return band * (0.7 + 0.3 * np.sin(2 * np.pi * 7 * speed * t)) * env_adsr(len(t), 0.1, 0.2)


def clack(v=1.0):
    """ván đáp đất: cạch"""
    a, b = kick(160, 90, 0.08) * 0.6, noise(0.06, 4000, 50)
    a[: len(b)] += b
    return a


def thud():
    a, b = kick(80, 40, 0.3), noise(0.2, 1500, 18) * 0.6
    a[: len(b)] += b
    return a


def zip_tape(dur=0.7):
    t = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal(len(t))
    return (lowpass(n, 6000) - lowpass(n, 2500)) * (0.5 + 0.5 * (np.sin(2 * np.pi * 60 * t) > 0)) * env_adsr(len(t), 0.01, 0.1)


def cheer(dur=1.2):
    t = np.arange(int(dur * SR)) / SR
    return (lowpass(rng.standard_normal(len(t)), 2500) - lowpass(rng.standard_normal(len(t)), 400)) * np.sin(np.pi * t / dur)


def park_flyers(a, b, n=3, sp=0.22):
    """người khác đáp đất và tiếng reo xa, đều đặn theo nhịp bay qua dốc"""
    per = 1 / sp / n
    t0 = a + 0.6
    while t0 < b - 0.3:
        add(t0, clack(), 0.14, pan=0.5)
        add(t0, cheer(), 0.03, pan=0.6)
        t0 += per


# ---------- 1. 0–14 công viên hoàng hôn ----------
for i in range(4):
    add(i * 3.6, pad(PADS[PROG_MIN[i % 4]], 4.2), 0.24)
    add(i * 3.6, piano(CH[PROG_MIN[i % 4]][0].replace('2', '3'), 4), 0.1)
add(0, roll(14, 1.2), 0.05, pan=0.4)
park_flyers(0, 14)
add(5.0, whoosh(1.4), 0.15)
add(6.6, zip_tape(0.8), 0.3, pan=-0.2)
tick(7.2)
add(9.4, clack(), 0.2)
add(10.0, roll(2.0), 0.14)
add(12.0, thud(), 0.4)
add(12.4, roll(1.2), 0.08, pan=0.4)

# ---------- 2. 14–42 montage giọng thứ ----------
mel = ["E5", "C5", "A4", "C5", "F5", "C5", "A4", "C5", "E5", "C5", "G4", "C5", "D5", "B4", "G4", "B4"]
for i in range(7):
    t0 = 14 + i * 4
    add(t0, pad(PADS[PROG_MIN[i % 4]], 4.6), 0.13)
    add(t0, piano(CH[PROG_MIN[i % 4]][0].replace("2", "3"), 4), 0.08)
    for j in range(4):
        if (i + j) % 3 != 2:
            add(t0 + j, piano(mel[(i % 4) * 4 + j]), 0.09, pan=rng.uniform(-0.3, 0.3))
for tb in (14, 17.5, 21, 24.5, 28, 31.5, 35):
    tick(tb)
add(14.2, roll(1.6), 0.14)
add(15.8, thud(), 0.35)
add(17.7, roll(2.6), 0.1, pan=0.3)
add(19.0, clack(), 0.2)
add(21.4, zip_tape(0.9), 0.3)
park_flyers(24.5, 28, 2)
for k in range(6):
    add(28.2 + k * 0.55, noise(0.06, 1500, 40), 0.12)  # bước chân
park_flyers(35, 42, 2, 0.3)

# ---------- 3. 42–58 dốc lớn ----------
add(42, pad(["A1", "E2"], 16, 1, 2), 0.1)
for k in range(8):
    add(42.6 + k * 0.55, kick(70, 38, 0.3), 0.18 + 0.015 * k)  # nhịp tim trên mép dốc
add(46.8, roll(2.6, 2.0), 0.22)
add(46.8, whoosh(2.6), 0.15)
add(49.4, thud(), 0.6)
add(49.45, noise(0.4, 3000, 8), 0.3)
add(49.6, clack(), 0.3)
add(50.2, clack(), 0.2)
add(50.6, cheer(1.0), 0.04, pan=0.6)

# ---------- 4. 58–72 đáy ----------
add(58, pad(["A1", "E2", "A2"], 14, 2, 3), 0.26)
add(63, pad(PADS["F"], 9, 2, 3), 0.13)

# ---------- 5. 72–86 bước ngoặt ----------
add(72.4, click(), 0.6)  # bật đèn hành lang
add(72.5, pad(PADS["Am"], 6, 1.5, 2), 0.2)
add(78.4, pad(PADS["F"], 6, 1.0, 2), 0.18)
add(75.6, zip_tape(0.8), 0.3, pan=0.4)
add(76.8, kick(120, 70, 0.12), 0.3)  # giành thước
add(77.4, zip_tape(0.8), 0.3, pan=-0.2)
add(77.4, ping(), 0.12)
tick(77.4)
for k in range(5):
    add(79.2 + k * 0.12, noise(0.05, 5000, 50), 0.08, pan=0.4)
add(80.0, ping(), 0.2)
add(81.6, whoosh(0.6), 0.18)
add(83.0, noise(1.2, 6000, 4), 0.12)  # bút chì kẻ vạch
add(84.0, pad(PADS["C"], 3, 0.3, 2), 0.12)
add(84.0, piano("C4", 3), 0.14)
tick(84.4)

# ---------- 5b. hồi tưởng 73.2–79.2 (thời gian thật): hộp nhạc ấm, tiếng bút chì mẹ kẻ vạch, bé reo ----------
SHIFT = False
add(73.2, pad(PADS["C"], 6.2, 0.6, 1.2), 0.16)
for i, nm in enumerate(["C5", "E5", "G5", "C6", "G5", "E5", "D5", "G5", "C5", "E5"]):
    add(73.4 + i * 0.55, piano(nm, 2.0), 0.11, pan=0.2 * np.sin(i))
for ts in (73.6, 76.0, 76.7, 77.4):
    add(ts - 0.2, noise(0.4, 6000, 6), 0.12)  # bút chì kẻ vạch
    add(ts + 0.55, click(), 0.4)  # số vạch hiện
for ts in (74.6, 76.2, 76.9, 77.6):
    add(ts, noise(0.25, 3000, 10), 0.06, pan=0.2)  # bé reo khẽ
SHIFT = True

# ---------- 6. 86–118 montage giọng trưởng: tiếng bánh lăn làm nhịp, mỗi vạch một tiếng tick ----------
for tb in (86, 92.4, 98.8, 105.2, 111.6, 115.8, 116.1, 116.4, 116.7, 117.0):
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
    if tt >= 92.4 and i % 2 == 0:
        add(tt, kick(100, 50, 0.2), 0.22)
    tt += beat
    i += 1
add(92.4, roll(6.4, 1.4), 0.1)
add(98.8, roll(5.4, 1.2), 0.1)
add(102.2, clack(), 0.3)  # lên lề
add(105.2, roll(3.0), 0.1)
add(108.2, thud(), 0.25)
add(108.3, thud(), 0.2)
add(111.8, roll(3.6, 1.6), 0.1)
add(113.6, clack(), 0.22)  # bật ollie
add(114.1, clack(), 0.35)  # đáp

# ---------- 7. 118–134 trận cuối ----------
add(118, pad(["A1", "E2", "B2"], 13, 0.8, 1.5), 0.08)
park_flyers(118, 127, 3, 0.26)
for tb in np.arange(118.3, 125.2, 0.85):
    add(tb, kick(70, 38, 0.3), 0.26)
    add(tb, noise(0.03, 3000, 80), 0.06)
add(120.4, whoosh(1.6), 0.15)
for k in range(3):
    add(121.4 + k * 0.7, zip_tape(0.7), 0.24, pan=0.3)
add(127.4, roll(1.3, 2.0), 0.22)  # lăn xuống dốc nhỏ
add(127.4, whoosh(1.0), 0.12)
add(130.0, clack(), 0.45)  # bật ván
add(130.62, clack(), 0.6)  # đáp: cạch
add(130.62, kick(120, 40, 0.8), 0.7)
add(130.62, noise(2.5, 5000, 1.8), 0.22)
add(130.62, noise(0.12, 7000, 25), 0.3)  # thước gãy
add(130.62, pad(["C3", "G3", "C4", "E4", "G4"], 5, 0.05, 2.5), 0.18)

# ---------- 8. 134–150 phần thưởng ----------
mel_s = ["E5", "D5", "C5", "D5", "E5", "G5", "E5", "D5", "C5", "E5", "A4", "C5", "A4", "C5", "F5", "E5"]
tt, i = 134.5, 0
while tt < 150:
    ch = PROG_MAJ[(i // 4) % 4]
    if i % 4 == 0:
        add(tt, pad(PADS[ch], 2.6, 0.5, 0.8), 0.12)
        add(tt, piano(CH[ch][0].replace("2", "3"), 3), 0.1)
    if i % 2 == 0:
        add(tt, piano(mel_s[(i // 2) % 16], 2.0), 0.11, pan=0.1)
    tt += 0.5
    i += 1
add(134.6, thud(), 0.2)  # bé mới tập ngã
add(143.4, noise(1.6, 6000, 3), 0.14)  # kẻ vạch DAY 45
tick(145.0)

# ---------- 9. 150–161 kết ----------
add(150, pad(PADS["F"], 4, 1.2, 1.6), 0.2)
add(150.5, piano("A4", 3.5), 0.16)
add(152.4, pad(PADS["C"], 4, 1.0, 1.6), 0.2)
add(152.6, piano("C5", 3.5), 0.16)
add(155.6, pad(PADS["C"], 5, 0.4, 2.5), 0.18)
add(155.6, piano("C4", 5), 0.14)
add(156.0, piano("G4", 5), 0.1)
add(157.0, piano("C5", 4), 0.09)

# ---------- giọng thì thầm của cái bóng (thời gian thật, không dời) ----------
SHIFT = False
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
_duck = 1 - 0.85 * np.clip((_t - 134.6) / 0.15, 0, 1) * np.clip((135.98 - _t) / 0.05, 0, 1)
L *= _duck
R *= _duck
for tb in [134.8, 135.4]:  # chỉ còn nhịp tim
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
