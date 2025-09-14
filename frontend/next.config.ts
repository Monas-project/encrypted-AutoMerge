import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Amplify Hosting への簡易アップロードを可能にするため静的書き出し
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
