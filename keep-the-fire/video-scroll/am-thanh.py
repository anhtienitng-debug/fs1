"""Nhạc nền + hiệu ứng + giọng thì thầm cho SCROLL. Mốc thời gian khớp scene.js.

Chạy: python3 am-thanh.py <file.wav> [whispers.json <thư mục model Kokoro>]
  whispers.json lấy từ `node render.js whispers whispers.json`;
  model Kokoro: kokoro.onnx + voices.bin (github.com/thewh1teagle/kokoro-onnx, bản model-files-v1.0).
"""
import sys
import wave

import numpy as np

SR = 44100
DUR = 150.0
N = int(SR * DUR)
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(7)


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


# ---------- A. 0–50: giọng thứ, thưa ----------
prog_a = [["A2", "E3", "A3", "C4"], ["F2", "C3", "F3", "A3"], ["C3", "G3", "C4", "E4"], ["G2", "D3", "G3", "B3"]]
mel_a = [["E5", "C5", "A4", "C5"], ["F5", "C5", "A4", "C5"], ["E5", "C5", "G4", "C5"], ["D5", "B4", "G4", "B4"]]
for i in range(11):
    t0 = 2 + i * 4
    ch = prog_a[i % 4]
    if t0 < 46:
        add(t0, pad(ch, 4.6), 0.10 if t0 < 14 else 0.13)
    if 7 <= t0 < 44:
        for j, nm in enumerate(mel_a[i % 4]):
            if (i + j) % 3 != 2:
                add(t0 + j * 1.0, piano(nm), 0.10, pan=rng.uniform(-0.3, 0.3))
        add(t0, piano(ch[0].replace("2", "3") if "2" in ch[0] else ch[0], 4), 0.08)
add(14, pad(["A1"], 32, 4, 3), 0.10)  # tiếng ù trầm tăng dần

# tiếng lướt
for start, end, per in [(2.8, 7, 0.9), (7.6, 14, 1.2), (14.6, 20, 1.0), (20.5, 26, 1.0), (26.6, 32, 1.1), (32.5, 38, 1.0), (38.6, 44, 0.9)]:
    t = start
    while t < end:
        add(t, click(), 0.35, pan=0.2)
        t += per

# nhịp tim
for k in range(9):
    t0 = 46.45 + 1.8 * k if k < 2 else 50.45 + 1.8 * (k - 2)
    add(t0 - 0.05, kick(70, 38, 0.35), 0.3)
    add(t0 + 0.17, kick(65, 36, 0.3), 0.2)

# ---------- B. 50–62: gần im lặng ----------
add(50, pad(["A1", "E2"], 12, 2, 3), 0.07)
add(57.0, piano("C3", 5), 0.12)
add(57.0, piano("E4", 5), 0.08)
add(57.0, piano("G4", 5), 0.07)

# ---------- C. 62–112: giọng trưởng, lớn dần ----------
prog_c = [["C3", "G3", "C4", "E4"], ["G2", "D3", "G3", "B3"], ["A2", "E3", "A3", "C4"], ["F2", "C3", "F3", "A3"]]
arp_c = [["C4", "E4", "G4", "C5", "G4", "E4"], ["B3", "D4", "G4", "B4", "G4", "D4"], ["A3", "C4", "E4", "A4", "E4", "C4"], ["A3", "C4", "F4", "A4", "F4", "C4"]]
beat = 60 / 90
bar = 4 * beat * 1.5  # 4 giây
t0, i = 62.0, 0
while t0 < 112:
    ch = prog_c[i % 4]
    add(t0, pad(ch, bar + 0.6, 1.0, 1.2), 0.11 + 0.05 * min(1, (t0 - 62) / 40))
    add(t0, piano(ch[0], 4), 0.10)
    if t0 >= 70.5:
        step = bar / 12
        for j in range(12):
            add(t0 + j * step, piano(arp_c[i % 4][j % 6], 1.6), 0.06 + 0.03 * min(1, (t0 - 70) / 30), pan=0.35 * np.sin(j))
    t0 += bar
    i += 1
k = 79.0
while k < 111.5:
    add(k, kick(), 0.32 if k < 95 else 0.4)
    if k >= 87:
        add(k + beat / 2, noise(0.06, 9000, 60), 0.05, pan=0.3)
    k += beat
# hiệu ứng cảnh
add(65.5, kick(90, 50, 0.25), 0.4)
add(65.5, click(), 0.4)
add(67.8, whoosh(0.5), 0.25)
add(68.0, noise(0.6, 2500, 6), 0.18)
for t in (71.0, 74.0, 77.0):
    add(t, noise(0.18, 3500, 18), 0.12, pan=0.2)
for t in (88.5, 91.0, 93.5):
    add(t, buzz(), 0.22, pan=0.4)

# ---------- D. 112–130: thử thách ----------
add(112, pad(["A1", "E2", "B2"], 12, 0.8, 1.5), 0.16)
add(112, kick(60, 30, 1.2), 0.4)
for j in range(8):
    add(112.3 + 0.5 * j, ping(), 0.12, pan=0.5)
add(112.5, buzz(1.2), 0.2, pan=0.5)
add(116, whoosh(5.0), 0.10)
add(122.2, whoosh(0.6), 0.35)
add(122.8, kick(90, 45, 0.3), 0.5)
add(122.8, noise(0.25, 2500, 12), 0.25)
add(124.2, whoosh(1.2), 0.30)
add(125.4, kick(120, 40, 0.8), 0.75)
add(125.4, noise(2.5, 5000, 1.8), 0.22)
add(125.4, noise(0.12, 7000, 25), 0.3)  # tiếng nứt (lớp trung cho loa điện thoại)
add(125.4, pad(["C3", "G3", "C4", "E4", "G4"], 6, 0.05, 2.5), 0.20)
add(125.7, kick(80, 45, 0.25), 0.35)
add(126.8, pad(["F3", "A3", "C4"], 4.5, 1, 2), 0.09)
# nhịp tim khi đứng im và trong khoảng lặng trước cú vỡ
for tb in [112.4, 113.3, 114.2, 115.1, 123.75, 124.35, 124.85]:
    add(tb, kick(70, 38, 0.3), 0.28)
    add(tb, noise(0.03, 3000, 80), 0.06)
# tiếng tick khi bộ đếm đổi
for tb in [14, 20, 26, 32, 38, 44, 66, 71, 79, 87, 95, 103]:
    add(tb + 0.05, click(), 0.5)
add(61.8, ping(), 0.18)  # FOCUS vào góc
for tb in [56.6, 57.2, 57.8, 58.5]:  # FIRE % nhích ở bước ngoặt
    add(tb, click(), 0.55)
    add(tb, noise(0.3, 2500, 9), 0.06)
add(56.6, kick(85, 50, 0.2), 0.3)  # đặt máy úp xuống
add(52.3, noise(0.5, 3000, 6), 0.12)  # đốm lửa loé
for i, nm in enumerate(["C5", "E5", "G5", "E5"]):  # hộp nhạc kỷ niệm khi nhìn tấm ảnh
    add(53.0 + i * 0.45, piano(nm, 2.5), 0.09)

# ---------- E. 130–150: kết ----------
prog_e = [["F2", "C3", "F3", "A3"], ["C3", "G3", "C4", "E4"], ["G2", "D3", "G3", "B3"], ["C3", "G3", "C4", "E4"]]
mel_e = ["A4", "G4", "B4", "C5"]
for i in range(4):
    t0 = 130 + i * 3.6
    add(t0, pad(prog_e[i], 4.4, 1.2, 1.6), 0.13)
    add(t0, piano(prog_e[i][0], 4), 0.10)
    add(t0 + 0.6, piano(mel_e[i], 3.5), 0.11)
    add(t0 + 2.2, piano(prog_e[i][-1].replace("3", "4"), 2.5), 0.07)
add(144.6, piano("C3", 6), 0.12)
add(144.6, piano("G3", 6), 0.09)
add(144.6, piano("E4", 6), 0.08)
add(146.0, piano("C5", 4), 0.07)


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
_duck = 1 - 0.85 * np.clip((_t - 123.5) / 0.2, 0, 1) * np.clip((125.38 - _t) / 0.05, 0, 1)
L *= _duck
R *= _duck
for tb in [123.75, 124.35, 124.85]:  # chỉ còn nhịp tim trong khoảng lặng
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
L = L + 0.28 * wetL
R = R + 0.28 * wetR
t = np.arange(N) / SR
fade = np.clip((150 - t) / 1.5, 0, 1) * np.clip(t / 0.05, 0, 1)
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
