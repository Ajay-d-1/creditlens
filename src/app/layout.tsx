import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
      <body className="min-h-full flex flex-col bg-[#0f172a]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#334155] bg-[#0f172a] px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-cyan-400">CreditLens</span>
            <span className="rounded border border-[#334155] px-2 py-0.5 text-xs text-slate-400">
              Built for Credex
            </span>
          </div>
          <nav className="flex gap-6 text-sm text-slate-400">
            <span className="cursor-pointer border-b border-cyan-400 pb-1 text-cyan-400">
              Audits
            </span>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
