import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false,
  turbopack: {}, // Silencia el error de configuración y estabiliza el build worker
  // pdfjs-dist carga su propio archivo de worker (pdf.worker.mjs) de forma dinámica,
  // relativa a su propia ubicación en node_modules. Si se empaqueta en el bundle del
  // servidor (Turbopack/webpack), ese archivo deja de existir donde pdfjs-dist lo
  // espera y la carga del worker falla en producción. Al marcarlo como paquete
  // externo, Next.js lo deja tal cual en node_modules (incluyendo pdf.worker.mjs)
  // y lo hace `require`/`import` en tiempo de ejecución en vez de empaquetarlo.
  serverExternalPackages: ['pdfjs-dist'],
};

export default withPWA(nextConfig);
