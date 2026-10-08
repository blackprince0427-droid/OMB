import type { Metadata } from "next";
import { OfficeProvider } from "@/components/office-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "小型辦公軟件 · 網頁版",
  description: "網頁版第一版：登入、主框架、月視圖日曆，以及 CEO 新增使用者。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full">
        <OfficeProvider>{children}</OfficeProvider>
      </body>
    </html>
  );
}
