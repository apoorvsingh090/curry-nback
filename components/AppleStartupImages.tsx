"use client";

import { useEffect } from "react";

/**
 * iOS shows a blank white screen when a home-screen app launches unless the
 * page provides an `apple-touch-startup-image`. React 18 does not hoist <link>
 * tags into <head>, so they are added here on mount.
 */
const STARTUP_IMAGES = [
  { width: 640, height: 1136 },
  { width: 750, height: 1334 },
  { width: 828, height: 1792 },
  { width: 1125, height: 2436 },
  { width: 1170, height: 2532 },
  { width: 1242, height: 2688 },
  { width: 1290, height: 2796 },
];

export default function AppleStartupImages() {
  useEffect(() => {
    const head = document.head;
    if (!head.querySelector('link[rel="apple-touch-startup-image"]')) {
      STARTUP_IMAGES.forEach(({ width, height }) => {
        const link = document.createElement("link");
        link.rel = "apple-touch-startup-image";
        link.media = `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)`;
        link.href = `/icons/splash-${width}x${height}.png`;
        head.appendChild(link);
      });
    }
  }, []);

  return null;
}
