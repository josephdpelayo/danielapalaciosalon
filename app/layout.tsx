import type { Metadata } from "next";
import { Josefin_Sans, Jost } from "next/font/google";
import "./globals.css";
import "react-day-picker/dist/style.css";

const josefinSans = Josefin_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const jost = Jost({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Daniela Palacio — Hair Room",
  description: "Estudio especializado en color, cortes y tratamientos. Mazatlán, Sinaloa. Agenda tu cita en línea.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DP Hair Room",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Daniela Palacio — Hair Room",
    description: "Estudio especializado en color, cortes y tratamientos. Mazatlán, Sinaloa.",
    siteName: "Daniela Palacio Hair Room",
  },
  other: {
    'theme-color': '#16181E',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${josefinSans.variable} ${jost.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
