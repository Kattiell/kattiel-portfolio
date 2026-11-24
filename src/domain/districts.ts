// Os doze distritos. A fonte única é o arquivo da própria caverna (src/experience/data.js):
// aqui só traduzimos para o contrato tipado. Para ligar um projeto a um distrito, preencha
// `project.id` lá com o slug de projects.ts: o portal 3D e as páginas leem do mesmo lugar.
import { DISTRICTS as FONTE, districtSlot } from '@/experience/data.js';
import type { District, DistrictId } from './schemas';
import { getProject } from './projects';

type Fonte = {
  id: number; name: string; theme: string; color: number; spell: string; spellFx: string;
  focal: string; groups: string[]; interaction: string; project: { id: string | null };
};

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

export const DISTRICTS: District[] = (FONTE as Fonte[]).map((d) => {
  const slot = districtSlot(d) as { upper: boolean; phi: number };
  const slug = d.project?.id ?? undefined;
  return {
    id: d.id as DistrictId,
    name: d.name,
    materialTheme: d.theme,
    spell: d.spell,
    spellFx: d.spellFx,
    focal: d.focal,
    groups: d.groups,
    interaction: d.interaction,
    // só liga se o projeto existir de fato
    projectSlug: slug && getProject(slug) ? slug : undefined,
    upper: slot.upper,
    phi: slot.phi,
    color: hex(d.color),
  };
});

// invariante: 12 distritos, ids 1..12 em ordem
if (DISTRICTS.length !== 12 || DISTRICTS.some((d, i) => d.id !== i + 1)) {
  throw new Error('data.js precisa ter os 12 distritos, ids 1 a 12 em ordem');
}

export const getDistrict = (id: number) => DISTRICTS.find((d) => d.id === id);
export const pad2 = (n: number) => String(n).padStart(2, '0');
