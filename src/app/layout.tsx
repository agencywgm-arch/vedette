import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  openGraph: {
    type: "website",
    siteName: "Vedette",
    locale: "fr_FR",
    title: "Vedette — Vêtement Snob Villain Arrogant",
    description:
      "Une boutique 3D immersive : scrollez de la rue jusqu'à l'intérieur de la boutique Vedette.",
  },
  twitter: { card: "summary_large_image" },
  title: "Vedette — Vêtement Snob Villain Arrogant",
  description:
    "Entrez dans la boutique Vedette. Une expérience 3D immersive, scrollez depuis la rue jusqu'à l'intérieur de la boutique.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#08080b]">{children}</body>
    </html>
  );
}
