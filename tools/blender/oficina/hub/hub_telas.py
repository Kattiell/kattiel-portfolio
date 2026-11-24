"""Gera as imagens das telas do Batcomputador (python do sistema, com PIL). Saída: oficina/hub/telas/*.png
São o conteúdo padrão do GLB (o site pode trocar o mapa de cada malha TELA_ por textura animada)."""
import math, os, random, sys
from PIL import Image, ImageDraw, ImageFilter
AQUI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, AQUI)
from hub_forma import contorno
OUT = os.path.join(AQUI, 'telas'); os.makedirs(OUT, exist_ok=True)
FUNDO = (3, 12, 26); CIANO = (60, 205, 255); AZUL = (25, 110, 200); BRANCO = (200, 240, 255)
rnd = random.Random(7)

def base(w, h, borda=True):
    im = Image.new('RGB', (w, h), FUNDO); d = ImageDraw.Draw(im)
    for x in range(0, w, 32): d.line([(x, 0), (x, h)], fill=(8, 26, 48))
    for y in range(0, h, 32): d.line([(0, y), (w, y)], fill=(8, 26, 48))
    if borda:
        d.rectangle([6, 6, w - 7, h - 7], outline=AZUL, width=3)
        for cx, cy in ((6, 6), (w - 7, 6), (6, h - 7), (w - 7, h - 7)):
            sx = 1 if cx < w / 2 else -1; sy = 1 if cy < h / 2 else -1
            d.line([(cx, cy), (cx + sx * 40, cy)], fill=CIANO, width=5); d.line([(cx, cy), (cx, cy + sy * 40)], fill=CIANO, width=5)
    return im

def brilho(im, desenho, raio=6, k=1.0):
    """Desenha numa camada, soma uma cópia borrada (glow) e a nítida."""
    cam = Image.new('RGB', im.size, (0, 0, 0)); desenho(ImageDraw.Draw(cam))
    g = cam.filter(ImageFilter.GaussianBlur(raio))
    from PIL import ImageChops
    out = ImageChops.add(im, g.point(lambda v: int(v * k)))
    return ImageChops.add(out, cam)

def texto(d, x, y, w, linhas, h=9, cor=CIANO):
    for i in range(linhas):
        ll = int(w * rnd.uniform(0.3, 1.0)); yy = y + i * (h + 7)
        d.rectangle([x, yy, x + ll, yy + h - 4], fill=tuple(int(c * rnd.uniform(0.45, 0.9)) for c in cor))

def mapa():
    w, h = 1024, 700; im = base(w, h)
    # massa de terra irregular (como na arte: larga, com reentrâncias)
    pts = []
    for i in range(70):
        a = i / 70 * math.tau
        r = 1 + 0.18 * math.sin(3 * a + 0.5) + 0.12 * math.sin(5 * a + 1.3) + 0.07 * math.sin(11 * a) + rnd.uniform(-0.04, 0.04)
        pts.append((w / 2 + math.cos(a) * 330 * r, h / 2 + 10 + math.sin(a) * 165 * r * (1 + 0.25 * math.cos(a))))
    nos = []
    while len(nos) < 46:
        x, y = rnd.uniform(140, w - 140), rnd.uniform(130, h - 110)
        from PIL import ImageDraw as _D
        m = Image.new('L', (w, h)); _D.Draw(m).polygon(pts, fill=255)
        if m.getpixel((int(x), int(y))): nos.append((x, y))
    arestas = set()
    for i, a in enumerate(nos):
        viz = sorted(range(len(nos)), key=lambda j: (nos[j][0] - a[0]) ** 2 + (nos[j][1] - a[1]) ** 2)[1:4]
        for j in viz: arestas.add(tuple(sorted((i, j))))
    def des(d):
        d.line(pts + [pts[0]], fill=CIANO, width=4)
        for i, j in arestas: d.line([nos[i], nos[j]], fill=(90, 200, 255), width=2)
        for x, y in nos: r = rnd.choice((4, 5, 7)); d.ellipse([x - r, y - r, x + r, y + r], fill=BRANCO)
    ImageDraw.Draw(im).polygon(pts, fill=(8, 34, 66))
    im = brilho(im, des, 7, 1.1)
    d = ImageDraw.Draw(im); texto(d, 30, 30, 160, 4); texto(d, w - 200, h - 90, 160, 4)
    return im

def cidade():
    w, h = 512, 640; im = base(w, h); d = ImageDraw.Draw(im); texto(d, 28, 30, 300, 6)
    def des(d):
        chao = h - 90; x = 40
        while x < w - 60:
            bw = rnd.randint(26, 50); bh = rnd.randint(90, 330); topo = chao - bh
            d.rectangle([x, topo, x + bw, chao], outline=CIANO, width=2)
            if rnd.random() < 0.5: d.polygon([(x, topo), (x + bw / 2, topo - rnd.randint(30, 80)), (x + bw, topo)], outline=CIANO)
            for yy in range(topo + 10, chao, 16): d.line([(x + 4, yy), (x + bw - 4, yy)], fill=(40, 140, 220))
            x += bw + rnd.randint(4, 14)
        d.line([(30, chao), (w - 30, chao)], fill=CIANO, width=3)
    return brilho(im, des, 5, 1.2)

def texto_tela():
    w, h = 512, 640; im = base(w, h); d = ImageDraw.Draw(im)
    texto(d, 30, 34, 420, 18)
    def des(d):
        d.rectangle([30, 420, w - 30, h - 40], outline=AZUL, width=2)
        pts = [(40 + i * 14, h - 70 - 80 * abs(math.sin(i * 0.5)) - rnd.uniform(0, 40)) for i in range(31)]
        d.line(pts, fill=CIANO, width=3)
    return brilho(im, des, 4)

def radar():
    w, h = 512, 640; im = base(w, h); d = ImageDraw.Draw(im); texto(d, 30, h - 150, 420, 6)
    cx, cy = w / 2, 250
    def des(d):
        for r in (190, 150, 105, 60, 20): d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=CIANO if r in (190, 60) else AZUL, width=3 if r == 190 else 2)
        for k in range(72):
            a = k / 72 * math.tau; r0 = 190 if k % 6 else 175
            d.line([(cx + math.cos(a) * r0, cy + math.sin(a) * r0), (cx + math.cos(a) * 200, cy + math.sin(a) * 200)], fill=CIANO, width=2)
        d.pieslice([cx - 190, cy - 190, cx + 190, cy + 190], -80, -30, fill=(20, 90, 150))
        d.line([(cx, cy), (cx + math.cos(math.radians(-30)) * 190, cy + math.sin(math.radians(-30)) * 190)], fill=BRANCO, width=3)
        for _ in range(7):
            a = rnd.uniform(0, math.tau); r = rnd.uniform(30, 180); x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
            d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=BRANCO)
    return brilho(im, des, 6, 1.2)

def grafico():
    w, h = 512, 640; im = base(w, h); d = ImageDraw.Draw(im); texto(d, 30, 34, 420, 9)
    def des(d):
        y0 = h - 60
        for k in range(3):
            pts = [(30 + i * 9, y0 - 40 - k * 70 - 50 * abs(math.sin(i * 0.37 + k)) - rnd.uniform(0, 70) * (rnd.random() < 0.15)) for i in range(51)]
            d.line(pts, fill=(CIANO, (90, 160, 255), BRANCO)[k], width=2)
        d.line([(30, y0), (w - 30, y0)], fill=AZUL, width=2)
    return brilho(im, des, 4)

def dados():
    w, h = 512, 640; im = base(w, h); d = ImageDraw.Draw(im)
    for i in range(12):
        y = 34 + i * 22; d.rectangle([30, y, w - 30, y + 14], outline=(20, 70, 120)); texto(d, 36, y + 3, 200, 1, 10); texto(d, 300, y + 3, 150, 1, 10)
    def des(d):
        y0 = h - 50
        for i in range(56):
            v = 30 + 160 * abs(math.sin(i * 0.33)) * rnd.uniform(0.3, 1.0) * (1.8 if 20 < i < 30 else 1)
            d.line([(34 + i * 8, y0), (34 + i * 8, y0 - min(v, 300))], fill=CIANO, width=5)
    return brilho(im, des, 4)

def morcego_ui(w=512, h=320):
    im = base(w, h); s = w * 0.36
    pts = [(w / 2 + x * s, h / 2 - y * s) for x, y in contorno()]
    def des(d):
        d.polygon(pts, outline=CIANO); d.line(pts + [pts[0]], fill=CIANO, width=4)
        for y in range(int(h / 2 - 0.5 * s), int(h / 2 + 0.5 * s), 14): d.line([(w / 2 - s, y), (w / 2 + s, y)], fill=(20, 70, 120))
    return brilho(im, des, 5, 1.3)

def mundo(w=512, h=320):
    im = base(w, h)
    def des(d):
        # continentes em pontos (mapa-múndi estilizado)
        blobs = [(0.22, 0.35, 0.12, 0.14), (0.27, 0.68, 0.06, 0.16), (0.5, 0.33, 0.07, 0.09), (0.53, 0.6, 0.07, 0.15), (0.7, 0.35, 0.17, 0.13), (0.82, 0.72, 0.06, 0.06)]
        for y in range(20, h - 20, 9):
            for x in range(20, w - 20, 9):
                for bx, by, rx, ry in blobs:
                    if ((x / w - bx) / rx) ** 2 + ((y / h - by) / ry) ** 2 < 1: d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=CIANO); break
    return brilho(im, des, 3)

def barras(w=512, h=320):
    im = base(w, h); d = ImageDraw.Draw(im); texto(d, 24, 24, 180, 3)
    def des(d):
        for i in range(18):
            v = rnd.uniform(40, 220); x = 40 + i * 25; d.rectangle([x, h - 30 - v, x + 16, h - 30], outline=CIANO, fill=(20, 90, 150))
    return brilho(im, des, 4)

def hud(w=512, h=320):
    im = base(w, h)
    def des(d):
        cx, cy = w * 0.32, h / 2
        for r in (110, 80, 50, 20): d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=CIANO if r % 60 else AZUL, width=3)
        d.arc([cx - 125, cy - 125, cx + 125, cy + 125], 200, 320, fill=BRANCO, width=5)
        d.line([(cx - 130, cy), (cx + 130, cy)], fill=AZUL); d.line([(cx, cy - 130), (cx, cy + 130)], fill=AZUL)
    im = brilho(im, des, 4); d = ImageDraw.Draw(im); texto(d, int(w * 0.62), 40, 160, 12)
    return im

def ondas(w=512, h=320):
    im = base(w, h); d = ImageDraw.Draw(im); texto(d, 24, 24, 200, 2)
    def des(d):
        for k in range(3):
            pts = [(20 + i * 4, h / 2 + 30 * k - 40 + 35 * math.sin(i * 0.12 * (k + 1)) * math.cos(i * 0.031)) for i in range(119)]
            d.line(pts, fill=(CIANO, BRANCO, (90, 160, 255))[k], width=2)
    return brilho(im, des, 4)

def teclado(w=512, h=160):
    im = Image.new('RGB', (w, h), (2, 8, 16)); d = ImageDraw.Draw(im)
    for r in range(5):
        for c in range(22):
            x = 10 + c * 22 + (r % 2) * 6; y = 10 + r * 28
            if x + 18 < w - 8: d.rectangle([x, y, x + 17, y + 21], outline=(40, 170, 240), fill=(6, 40, 70))
    return im.filter(ImageFilter.GaussianBlur(0.6))

def piso(n=1024):
    """Disco holográfico sob o morcego: anéis concêntricos, raios e marcas (como no piso da arte)."""
    im = Image.new('RGB', (n, n), (4, 13, 26)); c = n / 2
    def des(d):
        for r, k in ((0.98, 1.0), (0.93, 0.5), (0.80, 0.35), (0.62, 0.3), (0.44, 0.25), (0.26, 0.2)):
            R = r * c; cc = tuple(int(v * k) for v in CIANO); d.ellipse([c - R, c - R, c + R, c + R], outline=cc, width=6 if k == 1.0 else 3)
        for k in range(24):
            a = k / 24 * math.tau; d.line([(c + math.cos(a) * c * 0.26, c + math.sin(a) * c * 0.26), (c + math.cos(a) * c * 0.93, c + math.sin(a) * c * 0.93)], fill=(14, 60, 100), width=2)
        for k in range(120):
            a = k / 120 * math.tau; r0 = c * (0.93 if k % 5 else 0.89)
            d.line([(c + math.cos(a) * r0, c + math.sin(a) * r0), (c + math.cos(a) * c * 0.98, c + math.sin(a) * c * 0.98)], fill=CIANO, width=3)
        for a0, a1 in ((200, 250), (290, 340), (20, 70), (110, 160)):
            d.arc([c - c * 0.85, c - c * 0.85, c + c * 0.85, c + c * 0.85], a0, a1, fill=(90, 200, 255), width=8)
    return brilho(im, des, 8, 1.0)

def emblema(w=1024):
    """Morcego do piso: degradê ciano com borda acesa. UV 0-1 cobre o retângulo do contorno (x -1..1, y -0.47..0.29)."""
    pts0 = contorno(); x0, x1 = -1.0, 1.0; y0 = min(p[1] for p in pts0); y1 = max(p[1] for p in pts0)
    h = int(w * (y1 - y0) / (x1 - x0)); pad = 0
    pts = [((x - x0) / (x1 - x0) * (w - 1), (y1 - y) / (y1 - y0) * (h - 1)) for x, y in pts0]
    grad = Image.new('RGB', (w, h))
    gp = grad.load(); cx, cy = w / 2, h * 0.45
    for yy in range(h):
        for xx in range(0, w):
            t = min(1, math.hypot((xx - cx) / (w / 2), (yy - cy) / (h / 1.2)))
            gp[xx, yy] = (int(120 - 95 * t), int(230 - 120 * t), int(255 - 50 * t))
    m = Image.new('L', (w, h)); ImageDraw.Draw(m).polygon(pts, fill=255)
    im = Image.new('RGB', (w, h), (6, 30, 60)); im.paste(grad, (0, 0), m)
    def des(d): d.line(pts + [pts[0]], fill=(170, 245, 255), width=7)
    return brilho(im, des, 6, 1.0)

if __name__ == '__main__':
    for nome, f in [('mapa', mapa), ('cidade', cidade), ('texto', texto_tela), ('radar', radar), ('grafico', grafico), ('dados', dados),
                    ('c_morcego', morcego_ui), ('c_mundo', mundo), ('c_barras', barras), ('c_hud', hud), ('c_ondas', ondas), ('teclado', teclado), ('piso', piso), ('emblema', emblema)]:
        f().save(os.path.join(OUT, nome + '.png')); print('ok', nome)
