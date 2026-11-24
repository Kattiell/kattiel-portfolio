# Gera as imagens das telas (TELA_*) da garagem com PIL (roda no Python do sistema, fora do Blender).
from PIL import Image, ImageDraw, ImageFilter
import os, math
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex'); os.makedirs(D, exist_ok=True)
MEIA = [(0.00, 0.10), (0.05, 0.14), (0.085, 0.32), (0.115, 0.12), (0.20, 0.10), (0.45, 0.22), (0.75, 0.31), (1.00, 0.38),
        (0.88, 0.15), (0.86, -0.01), (0.74, 0.04), (0.66, -0.12), (0.52, -0.06), (0.40, -0.22), (0.25, -0.12), (0.12, -0.20), (0.00, -0.38)]
def morcego(cx, cy, s):
    d = [(cx + x * s, cy - y * s) for x, y in MEIA]
    e = [(cx - x * s, cy - y * s) for x, y in reversed(MEIA[1:-1])]
    return d + [(cx, cy + 0.38 * s)][:0] + e
def fundo(w, h):
    im = Image.new('RGB', (w, h), (3, 14, 26)); g = ImageDraw.Draw(im)
    for x in range(0, w, 32): g.line([(x, 0), (x, h)], fill=(6, 38, 60))
    for y in range(0, h, 32): g.line([(0, y), (w, y)], fill=(6, 38, 60))
    return im, g
# monitor com o emblema
im, g = fundo(1024, 576)
pts = morcego(512, 300, 330)
glow = Image.new('RGB', im.size, 0); gg = ImageDraw.Draw(glow); gg.polygon(pts, fill=(20, 160, 255)); glow = glow.filter(ImageFilter.GaussianBlur(18))
im = Image.blend(im, Image.eval(Image.merge('RGB', [Image.eval(c, lambda v: v) for c in glow.split()]), lambda v: v), 0.0)
im.paste(glow, (0, 0), glow.convert('L'))
g = ImageDraw.Draw(im); g.polygon(pts, fill=(40, 190, 255), outline=(190, 240, 255)); g.line(pts + [pts[0]], fill=(210, 245, 255), width=5)
g.ellipse([512 - 420, 300 - 230, 512 + 420, 300 + 230], outline=(30, 150, 230), width=6)
for i in range(6): g.rectangle([40, 40 + i * 22, 40 + 90 + (i * 37) % 70, 50 + i * 22], fill=(30, 140, 210))
g.rectangle([3, 3, 1020, 572], outline=(40, 170, 240), width=6)
im.save(os.path.join(D, 'tela_morcego.png'))
# tablet com a planta do carro
im, g = fundo(768, 512)
c = (40, 190, 255)
car = [(120, 330), (150, 260), (260, 225), (330, 170), (470, 165), (560, 215), (650, 240), (690, 300), (660, 340), (120, 340)]
g.line(car + [car[0]], fill=c, width=5)
for x in (215, 585): g.ellipse([x - 62, 280, x + 62, 404], outline=c, width=6); g.ellipse([x - 28, 314, x + 28, 370], outline=c, width=3)
for i in range(5): g.line([(40, 40 + i * 26), (220 - i * 20, 40 + i * 26)], fill=c, width=6)
g.rectangle([530, 40, 730, 120], outline=c, width=3)
g.rectangle([3, 3, 764, 508], outline=c, width=5)
im.save(os.path.join(D, 'tela_carro.png'))
print('ok')
