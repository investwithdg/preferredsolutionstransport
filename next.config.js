/** @type {import('next').NextConfig} */
const withBundleAnalyzer = process.env.ANALYZE === 'true' ? require('@next/bundle-analyzer')({ enabled: true }) : (config => config)

const nextConfig = {
  experimental: {
    modularizeImports: {
      'lucide-react': {
        transform: 'lucide-react/icons/{{member}}',
      },
    },
  },
  webpack: (config) => {
    if (config.plugins) {
      config.plugins = config.plugins.filter(
        plugin => plugin.constructor.name !== 'SentryWebpackPlugin'
      );
    }
    return config;
  },
}

module.exports = withBundleAnalyzer(nextConfig)
