type ProductLink = { label: string; href: string };

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
  primaryLink: ProductLink;
  officialSite?: ProductLink;
  sourceLink?: ProductLink;
  media?: { src: string; alt: string; caption: string }[];
  mediaNote?: string;
};

export const products: Product[] = [
  {
    slug: "pop-reminder",
    name: "ふわっと。",
    status: "Android",
    primaryLink: { label: "Google Playで入手", href: "https://play.google.com/store/apps/details?id=com.rion0918.popreminder&hl=ja" },
    officialSite: { label: "公式サイトを見る", href: "https://fuwatto.riomaru.jp/" },
    sourceLink: { label: "GitHubでコードを見る", href: "https://github.com/rion0918/fuwatto" },
    summary: "数秒話すだけで、思いついた用事を残せるリマインダー。",
    media: [
      { src: "/images/projects/pop-reminder/home.png", alt: "ふわっと。のAndroid画面。牛乳を買うなどのデモ予定が泡として浮かぶ", caption: "ホーム画面" },
      { src: "/images/projects/pop-reminder/add.png", alt: "ふわっと。のAndroid画面。タイトルと日付、時間帯を選んで予定を追加する", caption: "予定の追加画面" },
    ],
    technologies: [
      "TypeScript",
      "React Native",
      "Expo",
      "SQLite",
      "Drizzle ORM",
    ],
    features: [
      { title: "傾けて話す", description: "「明日の朝」のような日時も、声で登録。" },
      { title: "タップで完了", description: "期限が近づくと泡の色が変わり、用事が済んだらタップで割れます。" },
    ],
  },
  {
    slug: "idea-boost",
    name: "Idea Boost",
    team: "チーム開発",
    summary: "使う人が本当に欲しいものを、誰でも迷わず考えられるアイデアボード。",
    primaryLink: { label: "Idea Boostを開く", href: "https://ideaboost.dev/" },
    sourceLink: { label: "GitHubでコードを見る", href: "https://github.com/engineer-first/idea-boost" },
    media: [
      { src: "/images/projects/idea-boost/board.png", alt: "Idea Boostの評価ボード。色分けされた12枚の案を、価値と実現のしやすさの2軸に並べた画面", caption: "価値と実現のしやすさで、案を比べる" },
      { src: "/images/projects/idea-boost/outcome.png", alt: "Idea Boostの成果画面。採用したアイデアと、そのもとになった課題・問いを振り返る画面", caption: "チームで決めた一案を持ち帰る" },
    ],
    technologies: ["TypeScript", "Next.js", "Cloudflare Workers", "Durable Objects", "D1"],
    features: [
      { title: "問いをつくる", description: "身近な困りごとから、チームで考えたい問いを選びます。" },
      { title: "案を絞る", description: "付箋を並べて案を比べ、投票を参考に一案を選びます。" },
    ],
  },
];
