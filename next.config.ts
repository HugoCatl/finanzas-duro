import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En el modo demo (npm run demo) sin el botón de Next.js, para que las capturas salgan limpias.
  devIndicators: process.env.DEMO_DATA === '1' ? false : undefined,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
