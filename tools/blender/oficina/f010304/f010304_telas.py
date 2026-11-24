# Gera as imagens das telas (HUD ciano) da fachada 03 com PIL (roda no Python do sistema, fora do Blender).
import math, random, os
from PIL import Image, ImageDraw, ImageFilter
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex')
def hud(nome, seed, w=512, h=352):
    r = random.Random(seed)
    im = Image.new('RGB', (w, h), (3, 14, 30)); d = ImageDraw.Draw(im)
    C = (40, 200, 255); C2 = (120, 235, 255); D = (14, 70, 120)
    for x in range(0, w, 32): d.line([(x, 0), (x, h)], fill=(8, 30, 55))
    for y in range(0, h, 32): d.line([(0, y), (w, y)], fill=(8, 30, 55))
    d.rectangle([6, 6, w - 7, h - 7], outline=C, width=3)
    cx, cy = int(w * 0.34), int(h * 0.52)
    for rr, wd in ((96, 3), (74, 2), (50, 5), (24, 2)):
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=C if wd != 5 else D, width=wd)
    for k in range(12):
        a = k * math.pi / 6; d.line([(cx + 80 * math.cos(a), cy + 80 * math.sin(a)), (cx + 96 * math.cos(a), cy + 96 * math.sin(a))], fill=C2, width=2)
    d.pieslice([cx - 74, cy - 74, cx + 74, cy + 74], -90, 40, fill=(10, 90, 150))
    d.polygon([(cx, cy - 34), (cx + 30, cy), (cx, cy + 34), (cx - 30, cy)], outline=C2, width=3)
    x0 = int(w * 0.62)
    for i in range(6):
        y = 40 + i * 22; L = r.randint(60, 170)
        d.rectangle([x0, y, x0 + L, y + 10], fill=C if i % 2 else D)
    pts = [(x0 + i * 9, 250 + int(30 * math.sin(i * 0.7 + seed) + r.randint(-10, 10))) for i in range(20)]
    d.line(pts, fill=C2, width=3)
    for i in range(10):
        hh = r.randint(10, 60); d.rectangle([x0 + i * 17, 330 - hh, x0 + i * 17 + 10, 330], fill=C)
    glow = im.filter(ImageFilter.GaussianBlur(3))
    im = Image.blend(im, glow, 0.35)
    im.save(os.path.join(OUT, nome + '.png'))
hud('tela_f03_a', 1); hud('tela_f03_b', 7)
print('ok')
