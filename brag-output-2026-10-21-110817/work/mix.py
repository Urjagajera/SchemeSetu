import numpy as np, soundfile as sf
from scipy.signal import resample_poly
SR = 48000; DUR = 30.0; N = int(SR*DUR)
rng = np.random.default_rng(20261021)
t = np.arange(N)/SR
def place(buf, sig, at, g=1.0):
    i = int(at*SR); j = min(N, i+len(sig))
    if i < N: buf[i:j] += g*sig[:j-i]
starts = [0.25, 7.15, 9.80, 15.65, 19.30, 26.30]
voice = np.zeros(N); spans = []
for k, s in enumerate(starts, 1):
    x, sr = sf.read(f't{k}.wav'); x = resample_poly(x, SR, sr)
    x = x/(np.abs(x).max()+1e-9)*0.8; place(voice, x, s); spans.append((s, s+len(x)/SR))
# music: D major, 80 bpm, soft plucks + warm pad
music = np.zeros(N); beat = 60/80
D = 146.83
scale = [D*r for r in (2, 2*9/8, 2*5/4, 2*3/2, 2*5/3, 4)]
def pluck(f, dur=1.6):
    n = int(dur*SR); tt = np.arange(n)/SR
    env = np.exp(-tt*3.0)*np.minimum(1, tt*300)
    return env*(np.sin(2*np.pi*f*tt) + 0.3*np.sin(2*np.pi*2*f*tt)*np.exp(-tt*5))
pat = [0, 2, 4, 2, 1, 3, 5, 3]
for n_, b in enumerate(np.arange(0.2, 25.8, beat/2)):
    if n_ % 2 == 0 or rng.random() < 0.3:
        place(music, pluck(scale[pat[n_ % 8]]), b, 0.13)
chords = [(D, D*5/4, D*3/2), (D*4/3, D*5/3, D*2), (D*3/2, D*15/8, D*9/4), (D, D*5/4, D*3/2)]
pad = np.zeros(N)
for ci, c in enumerate(chords*4):
    a = ci*beat*4; n = int(beat*4*SR); tt = np.arange(n)/SR
    env = np.minimum(1, tt/0.6)*np.minimum(1, (beat*4-tt)/0.6)
    sig = sum(np.sin(2*np.pi*f/2*tt) for f in c)*env
    place(pad, sig, a, 0.045)
pad *= np.clip(t/1.5, 0, 1)
music += pad
# outro resolve
n = int(3.5*SR); tt = np.arange(n)/SR
res = sum(np.sin(2*np.pi*f*tt) for f in (D/2, D, D*3/2, D*2))*np.exp(-tt*1.1)*np.minimum(1, tt*100)
place(music, res, 26.0, 0.12)
duck = np.ones(N)*1.0
for a, b in spans: duck[int((a-0.15)*SR):int((b+0.2)*SR)] = 0.42
k = int(0.15*SR); duck = np.convolve(duck, np.ones(k)/k, mode='same'); music *= duck
# sfx
sfx = np.zeros(N)
def blip(f, d=0.04):
    n = int(d*SR); tt = np.arange(n)/SR; return np.sin(2*np.pi*f*tt)*np.exp(-tt*90)
def tick():
    n = int(0.01*SR); x = np.diff(rng.standard_normal(n), prepend=0)*np.exp(-np.arange(n)/SR*400); return x/(np.abs(x).max()+1e-9)
for a in np.arange(0.5, 1.7, 0.06): place(sfx, blip(1400+700*(a-0.5)), a, 0.035)
place(sfx, blip(880, 0.12), 5.6, 0.06)          # one scheme lights up
for a in (11.5, 12.0, 12.5, 13.1): place(sfx, tick(), a, 0.05)   # fields fill
for a in (15.85, 16.05, 16.25): place(sfx, blip(660, 0.05), a, 0.04)  # cards
place(sfx, blip(990, 0.08), 17.9, 0.05); place(sfx, tick(), 15.0, 0.05)         # show more
place(sfx, tick(), 22.3, 0.05); place(sfx, blip(740, 0.06), 23.9, 0.04); place(sfx, blip(990, 0.06), 24.6, 0.04)
mix = voice + music + sfx
mix = np.tanh(mix*0.95); mix *= np.clip((DUR-t)/0.8, 0, 1)
mix = mix/(np.abs(mix).max()+1e-9)*0.89
sf.write('../composition/audio/mix.wav', np.stack([mix, mix], 1), SR)
print('spans', [(round(a,2), round(b,2)) for a,b in spans])
