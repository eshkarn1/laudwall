import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // the collect form can carry a video (60 MB cap, checked again in src/lib/media.ts)
  experimental: { serverActions: { bodySizeLimit: "64mb" } },
};

export default config;
