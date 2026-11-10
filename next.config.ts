import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // YouTube video thumbnails for the episode pop-out player.
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }],
  },
  async rewrites() {
    // The Expo web build lives in public/runitback/app (see scripts/build-app.sh).
    // afterFiles runs once the public folder has been checked, so real files
    // (the _expo bundle, fonts, images) are served as they are. Every other
    // path under /runitback/app, including /runitback/app itself, serves the
    // single-page index.html and the app routes it client-side. afterFiles also
    // runs before dynamic routes, so this wins over runitback/[season]/[week].
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/runitback/app/:path*", destination: "/runitback/app/index.html" },
      ],
      fallback: [],
    };
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
