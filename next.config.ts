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
};

export default withPWA(nextConfig);
