// Contrato de dados do portfólio (TechSpec V2, seção 5).

export type DistrictId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type Project = {
  slug: string;
  title: string;
  category: 'software' | 'quality' | 'automation' | 'design' | 'leadership';
  /** Rótulo curto do tipo de trabalho (ex.: "Cliente · no ar"). */
  kind: string;
  summary: string;
  challenge?: string;
  approach?: string;
  /** Só resultado documentado. */
  outcome?: string;
  evidence?: string[];
  stack?: string[];
  /** Link público validado. Ausente = estado vazio explícito, nunca link inventado. */
  url?: string;
  repositoryUrl?: string;
  visibility: 'public' | 'case-study-only' | 'private';
  /** Aparece como estudo de caso em destaque na home. */
  featured?: boolean;
  /** Projeto de outra pessoa em que eu colaboro: quem é o dono e qual foi a minha parte. */
  colaboracao?: { dono: string; donoUrl: string; papel: string };
};

export type District = {
  id: DistrictId;
  name: string;
  materialTheme: string;
  spell: string;
  spellFx: string;
  focal: string;
  groups: string[];
  interaction: string;
  /** Liga o distrito a projects[slug]. Vazio = "Projeto em curadoria". */
  projectSlug?: string;
  upper: boolean;
  /** Ângulo do túnel na parede do salão (graus), para o mapa 2D. */
  phi: number;
  color: string;
};
