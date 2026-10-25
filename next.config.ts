import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // YouTube video thumbnails for the episode pop-out player.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }],
  },
  async redirects() {
    // Vol. 01 had Ball, Build and Read as their own doors. Vol. 02 folds
    // all three into Now, so the old URLs keep working instead of 404ing.
    return [
      { source: "/ball", destination: "/now", permanent: true },
      { source: "/build", destination: "/now", permanent: true },
      { source: "/read", destination: "/now", permanent: true },
      // The Sobo Sportsbook is now Run It Back Picks. Old links keep working.
      { source: "/sportsbook", destination: "/runitback", permanent: true },
      { source: "/sportsbook/:path*", destination: "/runitback/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
