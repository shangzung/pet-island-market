import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '寵物島市集 - 遊戲道具交換與許願平台',
  description: '寵物島玩家專用的道具交換、許願媒合與 1v1 即時私訊交易市集',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '寵物島市集',
  },
};

export const viewport: Viewport = {
  themeColor: '#F59E0B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased bg-[#FFFDF7] text-[#4A4238]">{children}</body>
    </html>
  );
}