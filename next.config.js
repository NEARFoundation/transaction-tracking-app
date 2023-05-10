/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = {
  env: {
    ...nextConfig.env,
    GIT_COMMIT: process.env.GIT_COMMIT,
  },
  ...nextConfig,
};
