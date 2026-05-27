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
  title: "CreditLens — AI Spend Audit Tool",
  description:
    "Audit your AI tool spend. Find savings instantly. Free tool for startup founders and engineering managers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-slate-800 bg-slate-950/80 text-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <span className="font-semibold text-cyan-400">CreditLens</span>
            <a
              href="https://credex.rocks"
              className="text-sm text-slate-500 transition-colors hover:text-slate-300"
              target="_blank"
              rel="noreferrer"
            >
              Built for Credex
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
