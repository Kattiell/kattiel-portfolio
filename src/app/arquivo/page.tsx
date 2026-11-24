import type { Metadata } from 'next';
import ArchiveExperience from './ArchiveExperience';

export const metadata: Metadata = {
  title: 'O arquivo — a caverna em 3D',
  description: 'A Batcaverna navegável do portfólio Kattiel: doze distritos, doze feitiços, um projeto por túnel.',
};

export default function ArchivePage() {
  return <ArchiveExperience />;
}
