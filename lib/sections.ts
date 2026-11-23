import { halls } from './world-halls.ts';

export const sections = [
  ...halls.map(h => ({ id: h.id, title: h.name, label: h.name, href: h.href, tagline: h.tagline })),
  { id: "about", title: "プロフィール", label: "プロフィール", href: "/about", tagline: "橋本怜苑について" },
  { id: "career", title: "Career", label: "Career", href: "/career", tagline: "学歴・社歴" },
  { id: "activities", title: "Activities", label: "Activities", href: "/activities", tagline: "コミュニティなどの活動" },
  { id: "social", title: "外部リンク", label: "外部リンク", href: "/social", tagline: "GitHub・Zenn・X" },
];
