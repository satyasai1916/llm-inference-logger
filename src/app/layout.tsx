import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "./NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LLM Inference Logger",
  description: "Multi-provider LLM chatbot with inference logging",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-[#0f1117] text-white min-h-screen">
        <header className="border-b border-[#2a2d3a] bg-[#1a1d27]">
          <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
            <span className="font-bold text-sm tracking-tight">⚡ LLM Logger</span>
            <NavBar />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
