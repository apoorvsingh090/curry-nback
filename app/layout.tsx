import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import AppleStartupImages from "@/components/AppleStartupImages";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  title: "Curry Kitchen — Memory Training for Seniors",
  description:
    "A gentle N-back memory game designed for adults 65+. Caregiver dashboard included.",
  applicationName: "Curry Kitchen",
  appleWebApp: {
    capable: true,
    title: "Curry Kitchen",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#9A3412",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={atkinson.variable}>
      <body className="bg-cream text-ink antialiased">
        <AppleStartupImages />
        {children}
      </body>
    </html>
  );
}
