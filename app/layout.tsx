import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Informes Financieros · Te Quiero",
  description: "Panel financiero premium de Joyerías Te Quiero",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={poppins.variable}>
      <head>
        {/* Tipografía corporativa de titulares: Zodiak (Fontshare) */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=zodiak@700,600,400&display=swap"
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
