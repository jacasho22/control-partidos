import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false,
  // Sugerencia del log de error para silenciar/evitar fallos en el worker
  // turbopack: {}, 
};

export default withPWA(nextConfig);
