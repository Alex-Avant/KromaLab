import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { CommandMenu } from "@/components/site/command-menu";
import { Telemetry } from "@/components/site/telemetry";

const clashDisplay = localFont({
  src: [
    {
      path: "../fonts/clash-display/clash-display-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/clash-display/clash-display-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../fonts/clash-display/clash-display-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-clash",
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "KromaLab — Laboratorio de precisión para impresión digital",
    template: "%s · KromaLab",
  },
  description:
    "Instrumentos de trama, color y calibración para impresión DTF. Semitonos calibrados en tiempo real, 100% en tu navegador. Ninguna imagen sale de tu dispositivo.",
  applicationName: "KromaLab",
  keywords: [
    "halftone",
    "semitono",
    "DTF",
    "impresión digital",
    "LPI",
    "serigrafía",
    "generador de semitonos",
    "trama",
  ],
  authors: [{ name: "KromaLab" }],
  creator: "KromaLab",
  openGraph: {
    type: "website",
    siteName: "KromaLab",
    title: "KromaLab — Laboratorio de precisión para impresión digital",
    description:
      "Síntesis de semitonos DTF en tiempo real. LPI, ángulo, forma de punto y tinta blanca. Procesamiento 100% local.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "KromaLab — Laboratorio de precisión para impresión digital",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KromaLab — Laboratorio de precisión para impresión digital",
    description:
      "Síntesis de semitonos DTF en tiempo real. Procesamiento 100% local.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0B0D12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${clashDisplay.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-foreground focus:ring-2 focus:ring-ring"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <Footer />
        <CommandMenu />
        <Telemetry />
      </body>
    </html>
  );
}
