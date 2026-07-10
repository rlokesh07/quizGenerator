/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["firebase-admin"],
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
