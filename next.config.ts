import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Vol. 01 had Ball, Build and Read as their own doors. Vol. 02 folds
    // all three into Now, so the old URLs keep working instead of 404ing.
    return [
      { source: "/ball", destination: "/now", permanent: true },
      { source: "/build", destination: "/now", permanent: true },
      { source: "/read", destination: "/now", permanent: true },
    ];
  },
};

export default nextConfig;
