import type { Metadata, Viewport } from "next";
import "../style.css";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "2024-2026 高考录取数据查询",
  description: "江西省2024-2026年高考录取数据查询，支持院校、专业、分数、排名等多维度筛选。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#39C5BB",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
      <Analytics />
    </html>
  );
}
