import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CreditLens - AI Spend Audit Tool",
  description:
    "Audit your AI tool spend. Find savings instantly. Free tool for startup founders and engineering managers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-screen flex flex-col bg-[#0f172a]">
        <header className="sticky top-0 z-50 shrink-0 border-b border-[#1e293b] bg-[#0f172a]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-lg font-bold text-cyan-400 tracking-tight">CreditLens</Link>
              <span className="hidden sm:inline-block border-l border-[#334155] pl-3 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                Built for Credex
              </span>
            </div>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/dashboard" className="hidden sm:inline text-slate-500 hover:text-cyan-400 transition-colors">Dashboard</Link>
              <Link href="/" className="text-cyan-400 border-b border-cyan-400 pb-0.5">
                Audits
              </Link>
              <Link href="/reports" className="hidden sm:inline text-slate-500 hover:text-cyan-400 transition-colors">Reports</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 flex flex-col">{children}</main>

        <footer className="shrink-0 border-t border-[#1e293b] bg-[#0f172a] px-6 py-4">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-slate-600">
              © 2024 CreditLens AI. All rights reserved.
            </p>
            <div className="flex gap-5 text-xs">
              <a href="#" className="text-cyan-600/60 hover:text-cyan-400 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-cyan-600/60 hover:text-cyan-400 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-cyan-600/60 hover:text-cyan-400 transition-colors">
                Contact Support
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
