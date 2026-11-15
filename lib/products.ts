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
    links: [{ label: "GitHubでコードを見る", href: "https://github.com/rion0918/Yoin" }],
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
    status: "Android向けに正式リリース · Google Play 配信中",
    links: [
      { label: "公式サイトを見る", href: "https://fuwatto.riomaru.jp/" },
      { label: "Google Playで入手", href: "https://play.google.com/store/apps/details?id=com.rion0918.popreminder&hl=ja" },
      { label: "GitHubでコードを見る", href: "https://github.com/rion0918/pop-reminder" },
    ],
    summary: "傾けて話すだけ。小さな用事を「泡」にして残せる、Android向けリマインダーアプリ。",
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
        title: "傾けて話す音声入力と泡のUI",
        description:
          "端末を傾けて話すだけで日時まで自動で「泡」に登録。期限が近づくほど泡の色が変わり、用事が済んだらタップで割れます。",
      },
      {
        title: "通知・ホーム画面ウィジェット",
        description:
          "前夜と当日の2回通知や事前通知に対応。Androidのホーム画面ウィジェットからも、アプリを開かずに予定を確認・完了できます。",
      },
      {
        title: "広告なし・端末内への保存",
        description:
          "アカウント登録不要・広告なしで、有効6件まで無料（Pro版買い切り）。予定や音声はSQLiteとDrizzle ORMで端末内に保存します。",
      },
    ],
  },
];
