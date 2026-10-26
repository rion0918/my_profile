import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  referrer: "no-referrer",
  metadataBase: new URL("https://riomaru.jp"),
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
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
