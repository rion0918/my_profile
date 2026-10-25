import { products } from './products.ts';
import { socials } from './portfolio.ts';

export type HallId = 'experience' | 'yoin' | 'pop-reminder' | 'history' | 'github' | 'zenn' | 'x';
export const hallIconDisplay = { width: 2.18, depth: .9, scale: 1.2, rotation: Math.atan2(12, 20) };
export type Hall = {
  id: HallId;
  name: string;
  tagline: string;
  model: 'workshop' | 'music' | 'bubble' | 'gallery' | 'atelier' | 'bookshop';
  x: number; z: number; width: number; depth: number; height: number;
  href: string;
  theme?: { word: string; primary: number; surface: number; light: number; lettering: number };
  icon?: 'github' | 'zenn' | 'x';
  external?: { label: string; href: string };
};
const fuwatto = products.find(p => p.slug === 'pop-reminder')!;
export const halls: Hall[] = [
  { id: 'experience', name: '経験館', tagline: 'Skyでのインターンと、We部の立ち上げ', model: 'workshop',
    x: 8, z: 23, width: 4, depth: 3, height: 2.9, href: '/career#experience',
    theme: { word: 'Experience', primary: 0x356f5d, surface: 0xf0eadb, light: 0xb9cfb2, lettering: 0x356f5d } },
  { id: 'yoin', name: 'Yoin館', tagline: '会話・日時・場所と曲を記録するアプリ', model: 'music',
    x: -8, z: 6, width: 3.1, depth: 2.5, height: 2.9, href: '/projects/yoin',
    theme: { word: 'Yoin', primary: 0x795166, surface: 0xe9c9c2, light: 0xf4d9a6, lettering: 0xfff1db } },
  { id: 'pop-reminder', name: `${fuwatto.name}館`, tagline: '通知・ウィジェット対応のリマインダーアプリ', model: 'bubble',
    x: 8, z: 6, width: 3, depth: 2.6, height: 3.5, href: '/projects/pop-reminder',
    theme: { word: fuwatto.name, primary: 0x67adb5, surface: 0xffddd6, light: 0xfff0dc, lettering: 0x2f7078 },
    external: { label: 'ふわっと。の公式サイトへ', href: fuwatto.links![0].href } },
  { id: 'history', name: 'キャリア館', tagline: '学歴・社歴', model: 'gallery',
    x: -8, z: 23, width: 4, depth: 3.4, height: 2.9, href: '/career#history',
    theme: { word: 'Career', primary: 0x243b55, surface: 0xf2ebdb, light: 0xc5a46b, lettering: 0xf2ebdb } },
  { id: 'github', name: 'GitHub館', tagline: 'ソースコード・開発記録', model: 'atelier',
    x: -22, z: 14, width: 3.6, depth: 2.7, height: 3.8, href: '/social#github',
    icon: 'github',
    theme: { word: 'GitHub', primary: 0x0fbf3e, surface: 0x232925, light: 0xf2f5f3, lettering: 0xf2f5f3 },
    external: { label: 'GitHubへ', href: socials.find(s => s.label === 'GitHub')!.href } },
  { id: 'zenn', name: 'Zenn館', tagline: '技術記事', model: 'bookshop',
    x: 22, z: 14, width: 3.6, depth: 2.7, height: 2.9, href: '/social#zenn',
    icon: 'zenn',
    theme: { word: 'Zenn', primary: 0x3ea8ff, surface: 0xffffff, light: 0xe7f4ff, lettering: 0x3ea8ff },
    external: { label: 'Zennへ', href: socials.find(s => s.label === 'Zenn')!.href } },
  { id: 'x', name: 'X館', tagline: 'Xの本人プロフィール', model: 'workshop',
    x: -32, z: 7, width: 3.6, depth: 2.7, height: 2.9, href: '/social#x',
    icon: 'x',
    theme: { word: 'X', primary: 0x202327, surface: 0x171a1e, light: 0xf4f5f6, lettering: 0xffffff },
    external: { label: 'Xへ', href: socials.find(s => s.label === 'X')!.href } },
];
