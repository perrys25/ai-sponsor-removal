const withTwin = require('./config/withTwin.js')

/** @type {import('next').NextConfig} */
const nextConfig = withTwin({
  reactStrictMode: true,
  swcMinify: true,
  productionBrowserSourceMaps: true,
});

module.exports = nextConfig
