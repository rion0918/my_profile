import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://rion0918.dev"),
  title: "橋本怜苑 | Student Engineer",
  description:
    "神戸電子専門学校に所属する学生エンジニア、橋本怜苑のプロフィールサイト。",
  openGraph: {
    title: "橋本怜苑 | Student Engineer",
    description:
      "Next.js, React, NestJS, GraphQL, gRPCなどを学ぶ学生エンジニアのプロフィール。",
    images: ["/images/student-desk-kobe.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
