import type { Metadata } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";
import "react-day-picker/dist/style.css";

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jost = Jost({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Daniela Palacio — Hair Room",
  description: "Estudio especializado en color, cortes y tratamientos. Mazatlán, Sinaloa. Agenda tu cita en línea.",
  openGraph: {
    title: "Daniela Palacio — Hair Room",
    description: "Estudio especializado en color, cortes y tratamientos. Mazatlán, Sinaloa.",
    siteName: "Daniela Palacio Hair Room",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${playfair.variable} ${jost.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
