import type { NextConfig } from "next";

// 1. Initialize PWA
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  // 2. React Safety
  reactStrictMode: true,
  // @ts-ignore
  reactCompiler: true, 

  // 3. PERFORMANCE (High-End Machine)
  // We keep source maps OFF because they are rarely needed in prod and slow down the build
  productionBrowserSourceMaps: false,

  // NOTE: We REMOVED the 'experimental' CPU limits. 
  // Your 8-core machine will now use 100% power to build as fast as possible.

  // 4. STRICT MODE (Show All Errors)
  // We REMOVED 'typescript: { ignoreBuildErrors: true }'
  // We REMOVED 'eslint: { ignoreDuringBuilds: true }'
  // The build will now fail if it finds ANY issue.
  
  // 5. Images
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com', port: '', pathname: '/7.x/**' },
      { protocol: 'https', hostname: 'tfxdquzxgvpcvuttglwt.supabase.co', port: '', pathname: '/storage/v1/object/public/**' },
      // Fallback for other providers
      { protocol: 'https', hostname: '**' }
    ],
  },
};

export default withPWA(nextConfig);