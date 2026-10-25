import { halls } from './world-halls.ts';

export const sections = [
  ...halls.map(h => ({ id: h.id, title: h.name, label: h.name, href: h.href, tagline: h.tagline })),
  { id: "about", title: "プロフィール", label: "プロフィール", href: "/about", tagline: "橋本怜苑について" },
  { id: "tech", title: "技術スタック", label: "技術スタック", href: "/tech", tagline: "使用技術の一覧" },
  { id: "career", title: "学歴・経歴・活動", label: "経歴の一覧", href: "/career", tagline: "経験と、これまでの歩み" },
  { id: "social", title: "外部リンク", label: "外部リンク", href: "/social", tagline: "GitHub・Zenn・X" },
];
