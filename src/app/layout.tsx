import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Cinzel, Crimson_Pro, DM_Sans, IBM_Plex_Mono, Montserrat } from 'next/font/google';
import './globals.css';
import './extras.css';
import './nocturne.css';
import './arte-a.css';
import './home.css';
import './arte-b.css';
import './monumental.css';
import './identidade.css';

const display = Bricolage_Grotesque({ variable: '--font-display', subsets: ['latin'], weight: ['500', '600', '700', '800'] });
const body = DM_Sans({ variable: '--font-body', subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const caps = Cinzel({ variable: '--font-caps', subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });
const serif = Crimson_Pro({ variable: '--font-serif', subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'] });
const sans = Montserrat({ variable: '--font-sans', subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const meta = IBM_Plex_Mono({ variable: '--font-meta', subsets: ['latin'], weight: ['400', '500', '600'] });

export const metadata: Metadata = {
  title: {
    default: 'KATTIEL — Gabriel Caetano · Full Stack, Quality Engineering e IA',
    template: '%s · KATTIEL — Gabriel Caetano',
  },
  description:
    'Kattiel é o portfólio de Gabriel Caetano, Lead QA e desenvolvedor full stack: qualidade de software, automação de testes, IA aplicada e liderança.',
  icons: { icon: '/kattiel.svg' },
};

export const viewport: Viewport = { themeColor: '#101012' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${display.variable} ${body.variable} ${meta.variable} ${caps.variable} ${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
