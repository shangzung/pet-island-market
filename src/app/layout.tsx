import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "寵物島交易平台 | Pet Island Market",
  description: "讓寵物島玩家快速完成收藏、交換、收集與圖鑑管理的療癒市集平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}