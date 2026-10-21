import numpy as np, soundfile as sf
for k in range(1,7):
    x, sr = sf.read(f'v{k}.wav')
    a = np.abs(x); thr = 0.01*a.max()
    idx = np.where(a > thr)[0]; i, j = max(0, idx[0]-int(0.03*sr)), min(len(x), idx[-1]+int(0.08*sr))
    y = x[i:j]; sf.write(f't{k}.wav', y, sr); print(k, round(len(y)/sr, 2))
