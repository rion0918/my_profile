export type Product = {
  slug: string;
  name: string;
  summary: string;
  technologies: string[];
  features: { title: string; description: string }[];
  // Add only verified, approved facts. Unknown fields stay absent from the public UI.
  status?: string;
  audience?: string;
  period?: string;
  team?: string;
  role?: string;
  decisions?: string[];
  outcomes?: string[];
  links?: { label: string; href: string }[];
  media?: { src: string; alt: string; caption: string }[];
  mediaNote?: string;
};

export const products: Product[] = [
  {
    slug: "yoin",
    name: "Yoin",
    summary:
      "会話から生まれた曲を、日時・場所・元の会話と一緒に聴き返すアプリ。",
    technologies: ["TypeScript", "React Native", "Expo", "SQLite"],
    media: [
      { src: "/images/projects/yoin/library.jpg", alt: "Yoinのライブラリ。歌詞の一節と日時から思い出の曲を選ぶ画面", caption: "ライブラリ画面" },
      { src: "/images/projects/yoin/music.jpg", alt: "Yoinの曲詳細。歌詞と元の会話をたどり、曲を再生する画面", caption: "曲の詳細画面" },
    ],
    mediaNote: "本実装の画面コンポーネントを、サンプルデータで表示しています。",
    features: [
      {
        title: "曲・会話・日時・場所の記録",
        description:
          "曲だけでなく、そのときの会話や日時、場所を一緒に残す体験。",
      },
      {
        title: "端末での録音と取り込み",
        description: "Android版で録音・端末ファイルの取り込みに対応。",
      },
    ],
  },
  {
    slug: "pop-reminder",
    name: "ふわっと。",
    links: [{ label: "公式サイトを見る", href: "https://fuwatto.pages.dev/" }],
    summary: "忘れたくないことを、ふわっと泡にして残せるリマインダーアプリ。",
    media: [
      { src: "/images/projects/pop-reminder/home.png", alt: "ふわっと。のAndroid画面。牛乳を買うなどのデモ予定が泡として浮かぶ", caption: "ホーム画面" },
      { src: "/images/projects/pop-reminder/add.png", alt: "ふわっと。のAndroid画面。タイトルと日付、時間帯を選んで予定を追加する", caption: "予定の追加画面" },
    ],
    mediaNote: "Androidの実画面（デモ予定）です。",
    technologies: [
      "TypeScript",
      "React Native",
      "Expo",
      "SQLite",
      "Drizzle ORM",
    ],
    features: [
      {
        title: "泡の表示・操作",
        description:
          "浮遊する泡のUIと、削除時のアニメーション・触覚フィードバック。4つの時間帯プリセットから予定を追加できます。",
      },
      {
        title: "通知・ウィジェット",
        description:
          "予定時刻と事前のローカル通知に対応。Androidのホーム画面ウィジェットからも確認・完了できます。",
      },
      {
        title: "端末内への保存",
        description:
          "リマインダーはSQLiteに保存。ローカルでの永続化にDrizzle ORMを使用しています。",
      },
    ],
  },
];
