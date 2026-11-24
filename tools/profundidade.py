"""Gera o mapa de profundidade de uma arte (Depth Anything V2 Small), no formato que Profundidade.tsx lê.

Uso: python tools/profundidade.py public/img/mono/hero.webp public/img/mono/hero-prof.webp
Saída: metade da resolução da arte, tons de cinza (claro = perto), webp, na escala dos mapas já usados.
"""
import sys

import numpy as np

from PIL import Image, ImageFilter
from transformers import pipeline

entrada, saida = sys.argv[1], sys.argv[2]
arte = Image.open(entrada).convert('RGB')
estimador = pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Small-hf')
prof = estimador(arte)['depth'].convert('L')
# mesma escala dos mapas existentes: estica de 1% a 99,5% e aplica gama 0,55 (mediana perto de 0,33)
x = np.asarray(prof, dtype=np.float32) / 255
lo, hi = np.percentile(x, 1), np.percentile(x, 99.5)
x = np.clip((x - lo) / max(hi - lo, 1e-6), 0, 1) ** 0.55
prof = Image.fromarray((x * 255).round().astype(np.uint8))
prof = prof.resize((arte.width // 2, arte.height // 2), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
prof.convert('RGB').save(saida, 'WEBP', quality=90)
print(saida, prof.size)
