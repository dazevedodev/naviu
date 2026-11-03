import type { Metadata } from "next";
import { Figtree, Geist_Mono, Unbounded } from "next/font/google";
import "./globals.css";

// Títulos em Unbounded (larga e arredondada, como o traço da logo) e texto
// em Figtree.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Naviu — Agendamento para barbearias",
  description:
    "Agendamento online para barbearias, com confirmação e lembrete automáticos por e-mail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${unbounded.variable} ${figtree.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
