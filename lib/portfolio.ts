export const socials = [
  {
    label: "GitHub",
    href: "https://github.com/rion0918",
    display: "github.com/rion0918",
  },
  {
    label: "Zenn",
    href: "https://zenn.dev/riozenn",
    display: "zenn.dev/riozenn",
  },
  {
    label: "X",
    href: "https://x.com/rioi7_0918",
    display: "x.com/rioi7_0918",
  },
];

export const profile = [
  ["Name", "橋本怜苑 / Rion Hashimoto"],
  ["Age", "22"],
  ["School", "神戸電子専門学校"],
  ["High School", "上宮高等学校"],
  ["Offer", "合同会社DMM.com / 27卒 Webエンジニア内定"],
  ["Internship", "Sky株式会社 / 2025年3月 - 2026年8月"],
];

export interface TimelineEntry {
  period: string;
  title: string;
  prefix?: string;
  suffix?: string;
  description: string;
  links?: { label: string; href: string }[];
}

export const career: TimelineEntry[] = [
  {
    period: "2027卒",
    title: "合同会社DMM.com",
    description: "27卒 Webエンジニアとして内定。",
  },
  {
    period: "2025.03 - 2026.08",
    title: "Sky株式会社",
    description: "社内システム部 労務管理チームに配属。",
  },
  {
    period: "2023 - 2027（在学中）",
    title: "神戸電子専門学校",
    prefix: "",
    suffix: "ITエキスパート学科",
    description: "機械学習やスクラム開発の手法について学習。",
  },
  {
    period: "2019 - 2022",
    title: "上宮高等学校",
    description: "出身高校。",
  },
];

export const activities: TimelineEntry[] = [
  {
    period: "2026.04",
    title: "Webu（We部）",
    prefix: "学生団体",
    suffix: "",
    description: "学校生活の困りごとをサービスで解決する団体を立ち上げ、仲間と運営しています。",
    links: [
      { label: "We部の公式サイト", href: "https://join.web-u.dev/" },
      { label: "神戸電子の紹介記事", href: "https://www.kobedenshi.ac.jp/media/article/career_advice/746/" },
    ],
  },
  {
    period: "開催準備中",
    title: "KOBE STUDENT HACK 2027",
    description: "実行委員会の一員として、神戸の学生向けハッカソンを運営しています。",
    links: [{ label: "イベント公式サイト", href: "https://ksh2027.web-u.dev/" }],
  },
];
