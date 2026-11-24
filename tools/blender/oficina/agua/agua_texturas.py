"""Gera as texturas da água (fora do Blender, com numpy+PIL): periódicas para o site rolar o V.
agua_fluxo.png: estrias verticais (V = sentido do fluxo), alfa some nas bordas em U (1 repetição na largura).
agua_espuma.png: espuma borbulhada isotrópica, periódica nos dois eixos."""
import os, numpy as np
from PIL import Image
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex'); os.makedirs(D, exist_ok=True)
rng = np.random.default_rng(7)

def ruido(h, w, sv, su, seed):
    r = np.random.default_rng(seed).standard_normal((h, w))
    fv = np.fft.fftfreq(h)[:, None]; fu = np.fft.fftfreq(w)[None, :]
    filt = np.exp(-((fv / sv) ** 2 + (fu / su) ** 2))
    o = np.real(np.fft.ifft2(np.fft.fft2(r) * filt))
    return (o - o.mean()) / (o.std() + 1e-9)

H, W = 512, 256
# estrias longas no V, finas no U
e = 0.55 * ruido(H, W, 0.012, 0.09, 1) + 0.3 * ruido(H, W, 0.03, 0.2, 2) + 0.15 * ruido(H, W, 0.08, 0.35, 3)
s = 1 / (1 + np.exp(-2.6 * (e - 0.15)))           # estria branca
u = np.linspace(0, 1, W)[None, :]
borda = np.clip(u / 0.1, 0, 1) * np.clip((1 - u) / 0.1, 0, 1)
borda = borda * (0.75 + 0.25 * np.clip(ruido(H, W, 0.02, 0.5, 4) * 0.5 + 0.5, 0, 1))
cor = np.stack([0.42 + 0.55 * s, 0.70 + 0.30 * s, 0.86 + 0.14 * s], -1)
alfa = np.clip((0.38 + 0.6 * s) * borda, 0, 1)
img = np.concatenate([cor, alfa[..., None]], -1)
Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), 'RGBA').save(os.path.join(D, 'agua_fluxo.png'))

# espuma
F = 256
b = 0.6 * ruido(F, F, 0.05, 0.05, 11) + 0.4 * ruido(F, F, 0.15, 0.15, 12)
f = 1 / (1 + np.exp(-3.5 * (b - 0.1)))
corf = np.stack([0.86 + 0.14 * f, 0.94 + 0.06 * f, np.ones_like(f)], -1)
img = np.concatenate([corf, np.clip(0.15 + 0.85 * f, 0, 1)[..., None]], -1)
Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), 'RGBA').save(os.path.join(D, 'agua_espuma.png'))
print('ok')
