import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TALIO — Intelligence meets opportunity",
  description: "AI-Powered Talent Matching Platform — Upload your CV, extract structured skills, discover relevant jobs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
