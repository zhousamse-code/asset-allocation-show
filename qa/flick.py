# Temporal flicker analysis of a frame sequence: python3 qa/flick.py DIR
import sys, glob, numpy as np
from PIL import Image
d = sys.argv[1]
fs = sorted(glob.glob(d + '/f*.png'))
A = np.stack([np.asarray(Image.open(f).convert('L'), dtype=np.float32) for f in fs])
g = A.mean(axis=(1, 2))
print('frames', len(fs), 'global mean range %.2f..%.2f, max frame-to-frame jump %.2f' % (g.min(), g.max(), np.abs(np.diff(g)).max()))
d1 = np.abs(np.diff(A, axis=0))           # motion
d2 = np.abs(A[2:] - 2 * A[1:-1] + A[:-2])  # oscillation (flicker) energy
m1 = d1.mean(0); m2 = d2.mean(0)
print('mean |d1| %.3f  mean |d2| %.3f  pixels with d2>8: %d' % (m1.mean(), m2.mean(), int((m2 > 8).sum())))
# where is the flicker? coarse 8x8 grid report
H, W = m2.shape
gh, gw = 9, 16
rows = []
for i in range(gh):
    rows.append(' '.join('%4.1f' % m2[i*H//gh:(i+1)*H//gh, j*W//gw:(j+1)*W//gw].mean() for j in range(gw)))
print('\n'.join(rows))
hm = np.clip(m2 * 12, 0, 255).astype(np.uint8)
Image.fromarray(hm).save(d + '/heat.png')
