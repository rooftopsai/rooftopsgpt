const { withSentryConfig } = require("@sentry/nextjs")

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true"
})

const withPWA = require("next-pwa")({
  dest: "public"
})

const nextConfig = withBundleAnalyzer(
  withPWA({
    typescript: {
      // Skip type checking during build - we'll handle types during development
      ignoreBuildErrors: true,
    },
    eslint: {
      // Skip ESLint during build
      ignoreDuringBuilds: true,
    },
    reactStrictMode: true,
    images: {
      remotePatterns: [
        {
          protocol: "http",
          hostname: "localhost"
        },
        {
          protocol: "http",
          hostname: "127.0.0.1"
        },
        {
          protocol: "https",
          hostname: "**"
        }
      ]
    },
    experimental: {
      serverComponentsExternalPackages: ["sharp", "onnxruntime-node"]
    },
    webpack: (config, { isServer }) => {
      // Ignore node-specific modules when bundling for the browser
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          path: false,
          crypto: false,
        }
      }

      // Ignore .node files
      config.module.rules.push({
        test: /\.node$/,
        use: 'node-loader'
      })

      return config
    }
  })
)

// Only wrap with Sentry in production
module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // For all available options, see:
      // https://github.com/getsentry/sentry-webpack-plugin#options

      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Automatically annotate React components to show their full name in breadcrumbs and session replay
      reactComponentAnnotation: {
        enabled: true,
      },

      // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
      // side errors will fail.
      // tunnelRoute: "/monitoring",

      // Hides source maps from generated client bundles
      hideSourceMaps: true,

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,
    })
  : nextConfig
