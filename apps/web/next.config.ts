import dotenv from 'dotenv';
import path from 'node:path';
import type { NextConfig } from 'next';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
