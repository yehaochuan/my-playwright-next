import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Tabs from "./components/Tabs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Inst Bo 自动化工具",
  description: "inst bo playwright app",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header>
          <Tabs />
        </header>

        <div className="layout">
          <div className="content" style={{ overflow: "auto" }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
