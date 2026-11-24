import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // package-lock.json solto na pasta do usuario: fixa a raiz no proprio projeto
  turbopack: { root: __dirname },
  cacheComponents: true,
  partialPrefetching: true,
  // capturas de sites têm texto miúdo: 90 para elas, 75 (padrão) para o resto
  images: { qualities: [75, 90] },
};

export default nextConfig;
