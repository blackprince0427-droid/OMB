import type { Metadata } from "next";
import { OfficeProvider } from "@/components/office-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "小型辦公軟件 · 網頁版",
  description: "網頁版：登入、主框架、日曆、部門職位與工作紀錄。",
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
