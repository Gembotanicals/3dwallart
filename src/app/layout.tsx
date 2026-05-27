import type { Metadata } from "next";
import { Archivo, Space_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import { ToastContainer } from "@/components/ui/Toast";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ReliefForge - Image to 3D Relief",
    template: "%s | ReliefForge",
  },
  description:
    "Transform any image into stunning 3D printable relief wall panels. Upload, customize, and export production-ready STL files.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ReliefForge",
    title: "ReliefForge - Image to 3D Relief",
    description:
      "Transform any image into stunning 3D printable relief wall panels.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReliefForge - Image to 3D Relief",
    description:
      "Transform any image into stunning 3D printable relief wall panels.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${archivo.variable} ${spaceMono.variable}`}>
      <head>
        <meta name="theme-color" content="#101417" />
        <link rel="manifest" href="/manifest.json" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-ink font-sans grid-bg antialiased">
        <SessionProvider>
          {children}
          <ToastContainer />
        </SessionProvider>
      </body>
    </html>
  );
}
