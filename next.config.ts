import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // 1. Securely allow SVGs
    dangerouslyAllowSVG: true, 
    
    // 2. Enforce strict security policy (The "Secure" part)
    // - default-src 'self': Only load resources from same origin
    // - script-src 'none': DISABLE all scripts inside the SVG (Prevents XSS)
    // - sandbox: Isolates the SVG from the rest of your site
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/7.x/**',
      },
    ],
  },
};

export default nextConfig;