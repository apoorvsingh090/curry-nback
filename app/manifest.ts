import type { MetadataRoute } from "next";

/**
 * Web app manifest. Next.js serves this at /manifest.webmanifest and adds the
 * <link rel="manifest"> tag automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Curry Kitchen — Memory Training",
    short_name: "Curry Kitchen",
    description:
      "A gentle N-back memory game for adults 65+, with a caregiver progress dashboard.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#FFF6EC",
    theme_color: "#9A3412",
    categories: ["health", "education", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
