/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Sentry's automatic webpack injection since it's not configured
  webpack: (config, { isServer }) => {
    // Disable Sentry webpack plugin if it tries to auto-inject
    if (config.plugins) {
      config.plugins = config.plugins.filter(
        plugin => plugin.constructor.name !== 'SentryWebpackPlugin'
      );
    }
    return config;
  },
}

module.exports = nextConfig
