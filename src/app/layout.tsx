import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const staticBase = process.env.NEXT_PUBLIC_STATIC_BASE ?? "";

export const metadata: Metadata = {
  title: "Copa Libero 2026",
  description: "Torneo amateur 2026 — tabla, partidos y jugadores",
  icons: {
    icon: [{ url: `${staticBase}/copalibero-logo.png`, type: "image/png" }],
    apple: [{ url: `${staticBase}/copalibero-logo.png`, type: "image/png" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#06080c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
