import type { Metadata } from "next";
import { QueryProvider } from "@/_queries/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLick",
  description: "오늘의 PL 루머를 한 장에",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="bg-bg text-text">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
