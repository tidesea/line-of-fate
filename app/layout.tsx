import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "命运防线 · Line of Fate",
  description: "双阵营轻量化网页战棋游戏：部署卡牌、执行战术、争夺中央据点。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body className="antialiased">{children}</body>
    </html>
  );
}
