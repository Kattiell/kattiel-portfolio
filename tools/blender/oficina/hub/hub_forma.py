"""Silhueta do morcego (estilo Dark Knight, como no piso da arte). Usado pelo Blender e pelo gerador de telas.
Meia silhueta x>=0, envergadura total 2 (x em -1..1), y para cima. Contorno no sentido horário a partir do topo central."""
import math

_MEIA = [
    (0.000, 0.120), (0.030, 0.140), (0.050, 0.200), (0.068, 0.290),   # vão entre as orelhas e orelha
    (0.090, 0.150), (0.130, 0.120),                                    # ombro
    (0.250, 0.130), (0.400, 0.160), (0.550, 0.200), (0.700, 0.250),   # borda de cima da asa
    (0.850, 0.300), (1.000, 0.360),                                    # ponta
    (0.970, 0.240), (0.920, 0.120), (0.860, 0.000), (0.820, -0.060),  # borda de fora
    (0.770, -0.020), (0.710, -0.005), (0.650, -0.030), (0.610, -0.080), (0.580, -0.140),  # 1º recorte
    (0.530, -0.110), (0.470, -0.100), (0.410, -0.130), (0.370, -0.180), (0.340, -0.240),  # 2º recorte
    (0.290, -0.220), (0.230, -0.220), (0.170, -0.260), (0.110, -0.320), (0.060, -0.390), (0.000, -0.470),  # cauda
]

def contorno(escala=1.0):
    """Lista fechada de pontos (x, y) no sentido horário."""
    dir_ = [(x * escala, y * escala) for x, y in _MEIA]
    esq = [(-x * escala, y * escala) for x, y in reversed(_MEIA) if x > 0]
    return dir_ + [p for p in esq if p[0] != 0.0]
