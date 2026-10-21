import numpy as np, soundfile as sf
SR = 48000; DUR = 25.0
N = int(SR * DUR)
rng = np.random.default_rng(20261015)
t = np.arange(N) / SR
def place(buf, sig, at, gain=1.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if i < N: buf[i:j] += gain * sig[: j - i]
# ---- voice
starts = [0.2, 3.95, 10.0, 18.75, 21.9]
voice = np.zeros(N)
spans = []
for k, s in enumerate(starts, 1):
    x, sr = sf.read(f'w{k}.wav'); assert sr == SR
    x = x / (np.abs(x).max() + 1e-9) * 0.85
    place(voice, x, s); spans.append((s, s + len(x) / SR))
# ---- music: A minor, ~72 bpm, sparse plucks plus a soft pad
music = np.zeros(N)
beat = 60 / 72
notes = [220.0, 261.63, 329.63, 392.0, 440.0, 329.63, 261.63, 196.0]
def pluck(f, dur=1.8):
    n = int(dur * SR); tt = np.arange(n) / SR
    env = np.exp(-tt * 2.6) * np.minimum(1, tt * 200)
    return env * (np.sin(2*np.pi*f*tt) + 0.35*np.sin(2*np.pi*2*f*tt) * np.exp(-tt*4) + 0.12*np.sin(2*np.pi*3*f*tt) * np.exp(-tt*6))
k = 0
for b in np.arange(0.4, 21.6, beat):
    if rng.random() < 0.62:
        place(music, pluck(notes[k % len(notes)]), b, 0.20); k += 1
pad = (np.sin(2*np.pi*110*t) + 0.7*np.sin(2*np.pi*164.81*t) + 0.5*np.sin(2*np.pi*220*t)) * 0.05
pad *= np.clip(t / 2.0, 0, 1) * np.clip((24.9 - t) / 1.2, 0, 1)
music += pad
place(music, pluck(110.0, 3.6), 22.0, 0.55)  # outro resolve
# duck under voice
duck = np.ones(N) * 0.55
for a, b in spans:
    duck[int((a-0.15)*SR): int((b+0.25)*SR)] = 0.26
duck = np.convolve(duck, np.ones(int(0.12*SR))/int(0.12*SR), mode='same')
music *= duck
# ---- sfx
sfx = np.zeros(N)
def blip(f, dur=0.03):
    n = int(dur*SR); tt = np.arange(n)/SR
    return np.sin(2*np.pi*f*tt) * np.exp(-tt*120)
def click():
    n = int(0.012*SR); x = rng.standard_normal(n); x = np.diff(x, prepend=0) * np.exp(-np.arange(n)/SR*350)
    return x / (np.abs(x).max()+1e-9)
for tt_ in np.arange(0.55, 1.55, 0.07): place(sfx, blip(1800 + 900*(tt_-0.55)), tt_, 0.05)   # count ticks
for a, b in [(11.45, 12.65), (14.85, 15.95), (17.05, 18.15)]:
    for tt_ in np.arange(a, b, 0.05): place(sfx, click(), tt_ + rng.random()*0.01, 0.035)
for a in [10.15, 14.15, 16.55]: place(sfx, blip(520, 0.08), a, 0.06)  # cards
for a in [18.9, 19.05, 19.2]: place(sfx, blip(660, 0.05), a, 0.04)   # rows
mix = voice + music + sfx * 1.0
mix = np.tanh(mix * 0.9)
fade = np.clip((DUR - t) / 0.5, 0, 1); mix *= fade
mix = mix / (np.abs(mix).max() + 1e-9) * 0.89
sf.write('mix.wav', np.stack([mix, mix], 1), SR)
print('ok', len(mix)/SR)
