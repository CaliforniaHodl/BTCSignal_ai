import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  serverExternalPackages: ["@electric-sql/pglite"],
  async redirects() {
    // Legacy Hugo URLs whose paths changed.
    return [
      { source: "/terms/terms-of-use", destination: "/terms-of-use", permanent: true },
      { source: "/terms/privacy-policy", destination: "/privacy-policy", permanent: true },
      { source: "/terms/accessibility-statement", destination: "/accessibility-statement", permanent: true },
      { source: "/tags/:tag*", destination: "/learn", permanent: true },
      { source: "/categories/:cat*", destination: "/learn", permanent: true },
      { source: "/posts/page/:n", destination: "/posts", permanent: true },
      { source: "/learn/page/:n", destination: "/learn", permanent: true },
      { source: "/:section(posts|learn)/index.xml", destination: "/:section", permanent: false },
      { source: "/index.xml", destination: "/posts", permanent: false },
      { source: "/chart-demo", destination: "/smart-chart", permanent: true },
      { source: "/owner-trading", destination: "/owner", permanent: true },
    ];
  },
  partialPrefetching: true,
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
