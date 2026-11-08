import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Splash screens are consumed transiently by iOS at launch
  // (AppleStartupImages) — precaching them only bloats the offline install
  // (~108KB, ~25% of the precache).
  publicExcludes: ["!noprecache/**/*", "!icons/splash-*.png"],
  workboxOptions: {
    exclude: [
      /\/_next\/static\/.*(?<!\.p)\.woff2/,
      /\.map$/,
      /^manifest.*\.js$/,
      /middleware-manifest\.json$/,
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
