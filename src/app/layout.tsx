import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reyyztore Multi-QR Interactive Review",
  description: "Platform Ulasan & Photo Wall Interaktif Berbasis Multi-QR by Reyyztore",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
