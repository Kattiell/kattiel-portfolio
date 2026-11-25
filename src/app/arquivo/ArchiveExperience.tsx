'use client';
/*
 * Ponte 2D → 3D. Monta a marcação que a caverna espera e só então baixa o runtime Three.js existente
 * (src/experience/main.js), sem reescrevê-lo. Nada do 3D é baixado antes de o usuário pedir.
 * Saída: o runtime não tem "desmontar" (laço, física, listeners vivem no módulo), então sair do arquivo
 * recarrega a página de destino. É o jeito garantido de não deixar GPU, rAF nem listeners rodando no fundo.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import '@/experience/style.css';
import { SKELETON } from './skeleton';
import { DISTRICTS } from '@/domain/districts';
import { getProject } from '@/domain/projects';

type GPU = { nome: string; maxTex: number };
declare global {
  interface Window { __projetosDistrito?: Record<number, { title: string; kind: string; summary: string; url?: string; repo?: string }>; __qualidade?: string; __gpu?: string; __sairArquivo?: () => void; __trocarModo?: (m?: string) => void }
}

function sondarGPU(): GPU | null {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const nome = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { nome, maxTex };
  } catch { return null; }
}

/** Nível inicial pelo hardware (o próprio 3D ainda rebaixa sozinho se o quadro cair). */
function nivelPara(gpu: GPU): 'alta' | 'media' | 'baixa' {
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'alta' || q === 'media' || q === 'baixa') return q;
  const n = gpu.nome.toLowerCase();
  const toque = matchMedia('(pointer: coarse)').matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const nucleos = navigator.hardwareConcurrency || 4, mem = nav.deviceMemory || 8;
  if (/swiftshader|llvmpipe|software|basic render|microsoft basic/.test(n)) return 'baixa';
  if (toque || /mali|adreno|powervr|intel\(r\) (hd|uhd)|intel hd|intel uhd|gma/.test(n) || gpu.maxTex < 8192 || mem <= 2) return 'baixa';
  if (/intel|iris|apple|radeon\(tm\) graphics|vega [0-9] /.test(n) || nucleos <= 4 || mem <= 4) return 'media';
  return 'alta';
}

export default function ArchiveExperience() {
  useEffect(() => {
    // cada túnel → projeto (fonte: data.js liga o slug; projects.ts tem título, resumo e links)
    window.__projetosDistrito = Object.fromEntries(DISTRICTS.flatMap((d) => {
      const p = d.projectSlug ? getProject(d.projectSlug) : undefined;
      return p ? [[d.id, { title: p.title, kind: p.kind, summary: p.summary, url: p.url, repo: p.repositoryUrl }]] : [];
    }));
    // recarga completa de propósito: é o que garante que renderer, rAF e listeners da caverna morram
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    const sair = () => location.assign('/');
    window.__sairArquivo = sair;
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.__trocarModo = () => location.assign('/distritos');   // sem WebGL utilizável: mapa 2D
    document.getElementById('sair-arquivo')?.addEventListener('click', sair);

    const semGL = () => {
      document.getElementById('loading')?.classList.add('hide');
      document.getElementById('sem-gl')?.classList.remove('hide');
      document.getElementById('app')?.classList.add('hide');
    };
    // GPU fraca (Intel HD antiga, 8 GB) pode perder o contexto no meio da carga ou da compilação:
    // sem isto a tela fica preta e muda. O evento não borbulha, por isso a captura no documento.
    const perdeu = (e: Event) => { if ((e.target as Element)?.tagName === 'CANVAS') { console.error('[arquivo] contexto WebGL perdido'); semGL(); } };
    document.addEventListener('webglcontextlost', perdeu, true);
    // carga que nunca termina (GPU travada, memória cheia): depois de 60 s oferece a versão 2D
    const vigia = window.setTimeout(() => {
      if (!document.getElementById('loading')?.classList.contains('hide')) { console.error('[arquivo] carga passou de 60 s'); semGL(); }
    }, 60000);

    const gpu = sondarGPU();
    if (!gpu) {
      semGL();
    } else {
      window.__qualidade = nivelPara(gpu);
      window.__gpu = gpu.nome;
      document.body.classList.add('modo-3d');
      import('@/experience/main.js').catch((e) => {
        console.error('[arquivo] falha ao abrir a caverna', e);
        semGL();
      });
    }
    // voltar pelo navegador (ou qualquer navegação interna) sai do arquivo: recarrega o destino
    return () => {
      document.removeEventListener('webglcontextlost', perdeu, true); window.clearTimeout(vigia);
      if (location.pathname !== '/arquivo') location.reload();
    };
  }, []);

  return (
    <>
      <div className="k-arquivo" dangerouslySetInnerHTML={{ __html: SKELETON }} />
      <div id="sem-gl" className="hide k-semgl" role="alert">
        <p className="k-semgl-code">ARQUIVO / SEM 3D</p>
        <h1>Este navegador não abre a caverna em 3D.</h1>
        <p>Ela precisa de WebGL 2 e de uma placa de vídeo que aguente a cena; neste computador ela não abriu. Todo o conteúdo continua disponível: o mapa dos doze distritos e os estudos de caso, em texto.</p>
        <div><Link href="/distritos">Ver o mapa do salão →</Link> <Link href="/projetos">Ver os projetos →</Link></div>
      </div>
    </>
  );
}
