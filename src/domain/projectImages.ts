// Capturas reais dos projetos (só do que está no ar). Chave = slug de projects.ts.
import type { StaticImageData } from 'next/image';
import lcp from '../../public/img/lcp-consultoria.webp';

export const PROJECT_IMAGES: Record<string, { src: StaticImageData; alt: string }> = {
  'lcp-consultoria': { src: lcp, alt: 'Página inicial do site da LCP Consultoria: "Finanças em ordem. Decisões com clareza."' },
};
