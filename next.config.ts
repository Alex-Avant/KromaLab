import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Cache Components desactivado: el build webpack de opengraph-image
     y los componentes client no lo requieren en este proyecto. */
  cacheComponents: false,
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
