/*
 * Elevador modelado no Blender (batcaverna/tools/blender/elevador.py → public/models/elevador.glb, 2.936
 * triângulos, 4 materiais, ~290 KB com meshopt). Substitui as caixas procedurais dos dois elevadores.
 *
 * Partes animadas (pelos nomes do GLB):
 *   ELV_Cabine (com ELV_PortaE/D como filhas) sobe com lift.cage; as portas correm em ±z;
 *   ELV_Contrapeso anda ao contrário; ELV_CabosCab/CP têm a origem no topo e esticam em y.
 * Sem LOD: o modelo inteiro tem menos triângulos que o LOD2 sugerido pela spec (2–5 mil), então um LOD só
 * somaria draw calls e memória. Medido em renderer.info, ver o relatório do commit.
 */
import * as THREE from 'three';
import { load } from './models.js';
import { HALL } from './data.js';
import { REFLECT_LAYER } from './hall.js';

const CURSO = HALL.upper.y - HALL.lower.y;   // 8 m entre os níveis
const TOPO_CABO = 12.7;                      // altura da polia (origem dos cabos)
const CP_ALTO = CURSO + 1.6;                 // contrapeso lá em cima quando a cabine está embaixo
const ABRE = 1.25;                           // quanto cada porta corre

export async function instalarElevadores(hall) {
  const lifts = hall.lifts || [];
  if (!lifts.length) return 0;
  let cena;
  try { cena = await load('elevador.glb'); } catch { return 0; }
  if (!cena) return 0;   // sem o arquivo (load devolve null, não lança): fica o procedural
  // materiais: vidro sem escrever profundidade, metal pegando o mapa de ambiente, luz na camada do reflexo
  cena.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [].concat(o.material)) {
      if (/vidro/.test(m.name)) { m.transparent = true; m.depthWrite = false; m.side = THREE.DoubleSide; m.envMapIntensity = 1.4; }
      else if (/luz/.test(m.name)) { m.emissiveIntensity = Math.min(1.6, m.emissiveIntensity || 1.6); m.toneMapped = false; }
      else { m.envMapIntensity = 1.1; }
    }
    if ([].concat(o.material).some((m) => /luz/.test(m.name))) o.layers.enable(REFLECT_LAYER);
    o.userData.naoFundir = true;
  });

  let n = 0;
  for (const lift of lifts) {
    const m = cena.clone(true);
    const pega = (nome) => m.getObjectByName(nome);
    const est = pega('ELV_Estrutura'), cab = pega('ELV_Cabine');
    if (!est || !cab) continue;
    const portas = [pega('ELV_PortaE'), pega('ELV_PortaD')].filter(Boolean);
    const cp = pega('ELV_Contrapeso'), cc = pega('ELV_CabosCab'), ccp = pega('ELV_CabosCP');
    // as caixas procedurais saem de cena (colisores ficam: estão em outra árvore)
    for (const o of lift.group.children) if (o !== lift.cage) o.visible = false;
    for (const o of lift.cage.children) o.visible = false;
    // as portas do modelo ficam em -x; no elevador oeste a galeria chega pelo +x: gira meia volta
    const vira = lift.f < 0 ? Math.PI : 0;
    const fixo = new THREE.Group(); fixo.name = 'ELV_fixo'; fixo.rotation.y = vira; lift.group.add(fixo);
    const movel = new THREE.Group(); movel.name = 'ELV_movel'; movel.rotation.y = vira; lift.cage.add(movel);
    for (const o of [est, cp, cc, ccp]) if (o) fixo.add(o);
    movel.add(cab);
    const z0 = portas.map((p) => p.position.z);
    lift.portas = 1; lift.portasAlvo = 1; lift.estado = lift.level === 'upper' ? 'SUPERIOR' : 'INFERIOR';
    hall.updaters.push((dt) => {
      const y = lift.cage.position.y;   // 0 embaixo, CURSO em cima
      lift.portas += (lift.portasAlvo - lift.portas) * Math.min(1, dt * 6);
      portas.forEach((p, i) => { p.position.z = z0[i] + Math.sign(z0[i]) * ABRE * lift.portas; });
      if (cp) cp.position.y = CP_ALTO - y;
      if (cc) cc.scale.y = Math.max(0.01, TOPO_CABO - (y + 3.03));
      if (ccp && cp) ccp.scale.y = Math.max(0.01, TOPO_CABO - (cp.position.y + 0.75));
    });
    n++;
  }
  return n;
}
