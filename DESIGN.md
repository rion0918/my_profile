# Design System — teenage engineering Style

> **North Star:** industrial catalogue under studio light — the product is the only rich object on the page and everything else is whispered around it.
> （スタジオ照明下の工業カタログ。プロダクトのみが唯一の豊かな実体であり、周囲のUIはすべて静かにささやく。）

**Reference:** [teenage engineering on Refero Styles](https://styles.refero.design/style/aecf9dda-5cba-4dc7-9e73-59b65d895cdf)  
**Target:** Rion Hashimoto Portfolio (`my_profile`)

---

## 1. Principles

1. **The Product is the Hero:**  
   制作物（自作ハードウェア、自作PC、3Dシミュレーション、Webアプリ、物理エンジン）が唯一の密度と色を持つ主役。装飾的なドロップシャドウ、グラデーション、丸角はすべて排し、余白とタイポグラフィの規律で作品を引き立てる。
2. **Straight Cuts (Zero Radius):**  
   すべてのUI要素（ボタン、カード、入力欄、タグ、モーダル、プレビュー枠）の角丸は **`0px`**。鋭利で工業的な直線カットを徹底する。
3. **Typographic Whispers (Hairline Weights):**  
   テキストは自己主張せず、ささやくように配置する。本文・ラベル・メタデータは極細ウェイト（Inter 100〜300、和文も最細ウェイト）。見出しも極細〜細身（Weight 300）かつタイトな行間（leading 1.11）で組む。
4. **Rationed Palette (厳格な色彩制限):**  
   基本は5つのニュートラルカラーのみ。色は装飾ではなく機能（警告・シグナル・現在地表示）のためだけに一握り用いる。
5. **Hairline Architecture:**  
   境界やセクション区切りは、影ではなく `1px` のヘアラインルール（`#e5e5e5` または `#000000`）で構造化する。

---

## 2. Color Palette

| Token | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| `--canvas` / `--bg` | `#f6f8f7` | **Canvas Mist:** ページ背景、スタジオのバックドロップ。すべての基準面 |
| `--ink` | `#000000` | **Ink Black:** 本文、プライマリ見出し、強調ヘアライン境界 |
| `--carbon` | `#0f0e12` | **Carbon:** わずかに紫を帯びた近黒。ダークバンド、フッター、反転セクション、World HUD |
| `--steel` / `--line` | `#e5e5e5` | **Steel Gray:** 構造を仕切る1pxのヘアライン境界線、リスト区切り線 |
| `--graphite` / `--muted` | `#b2b2b2` | **Graphite:** 補足テキスト、メタデータ、ラベル、非アクティブ要素 |
| `--signal` / `--amber` | `#ff9900` | **Signal Amber:** 警告マーク、アクティブインジケーター（極めて限定的に使用） |

---

## 3. Typography

### Font Families
- **Primary Sans:**  
  `Inter`, `ui-sans-serif`, `-apple-system`, `BlinkMacSystemFont`, `"Hiragino Sans"`, `"Noto Sans JP"`, sans-serif
- **Monospace (Coordinates, FPS, Specs):**  
  `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, monospace

### Hierarchy & Scale
| Role | Family | Weight | Size | Line Height | Tracking |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Page H1** | Primary Sans | `300` (Light) | `40px` (clamp 32-44px) | `1.11` | `-0.02em` |
| **Section H2** | Primary Sans | `300` (Light) | `24px`〜`26px` | `1.15` | `-0.01em` |
| **Card Title H3** | Primary Sans | `300`〜`400` | `19px` | `1.20` | `0` |
| **Body Running** | Primary Sans | `100`〜`300` | `13px`〜`14px` | `1.60` | `+0.01em` |
| **Labels / Meta / Nav**| Primary Sans / Mono | `300` | `11px`〜`12px` | `1.20` | `+0.05em` (Uppercase) |
| **Technical Data / HUD**| Monospace | `400` | `11px`〜`12px` | `1.30` | `0` |

> **Note on Japanese Typography:**  
> 日本語テキストの可読性を保つため、本文は `font-weight: 300`（Light）、英語ラベルやコード周辺は `font-weight: 100〜200` を活用する。

---

## 4. Spacing & Layout

- **Page Max Width:** `1200px`（広大なスタジオキャンバス）
- **Content Reading Width:** `980px`（テキスト・プロフィール本文）
- **Section Gap:** `66px`〜`88px`（呼吸感のある大きな垂直余白）
- **Element Gap:** `15px`〜`16px`（緊密なコンポーネント内ギャップ）
- **Hairlines:** `1px solid var(--steel)`（影の代わりにヘアラインでグリッドを作る）

---

## 5. Shape & Elevation

- **Border Radius:**
  - `cards`: `0px`
  - `buttons`: `0px`
  - `inputs`: `0px`
  - `tags`: `0px`
  - `thumbnails`: `0px`
  - `avatar`: `0px`（正方形クロップ）またはミニマルな完全円
- **Shadows:** `none`（一切の `box-shadow` を禁止）
- **Elevation Mechanism:**
  - 階層は影ではなく、**「1pxヘアライン」** または **「Carbon (`#0f0e12`) と Canvas Mist (`#f6f8f7`) の面反転」** で表現する。

---

## 6. Components & Modalities

### Normal Mode (Portfolio & Profile)
- **Profile Header:**  
  スタジオ撮影されたアバター写真（四角またはミニマル円）、極細タイポグラフィによる名前と肩書、1pxヘアラインの区切り。
- **ModeBar (Navigation & Switcher):**  
  シャープな矩形（`0px` radius）、1pxのヘアラインボーダー。アクティブ状態は黒反転（`background: #000000; color: #ffffff;`）。
- **Product Exhibit (Work Cards):**  
  画像は枠いっぱいにエッジ・トゥ・エッジで配置（`0px` radius、内部パディングなし）。写真の下に1pxの罫線と極細のスペック表記。
- **World Preview Banner:**  
  3Dワールドへの導線は、インダストリアルな「SIMULATION / EXPLORE」操作パネルとして提示。

### World Mode (3D Simulation Island)
- **HUD & Cockpit:**  
  漆黒カーボン（`rgba(15, 14, 18, 0.92)`）の矩形パネル、1pxの白ヘアライン（`rgba(255, 255, 255, 0.15)`）。
- **Metrics:**  
  FPS、カメラ座標、マップナビゲーションはモノスペースで精緻に表示。
- **Controls:**  
  角丸のない直角ボタン、アクティブ時のアンバー（`#ff9900`）LED風ドット。

---

## 7. Do's and Don'ts

### DO
- すべてのカード、ボタン、入力フィールドの `border-radius` を `0px` に統一する。
- 余白を広く取り、スタジオ照明の下にプロダクトが置かれているような静謐感を作る。
- セクションの区切りには `1px solid #e5e5e5` のヘアラインを使用する。
- 本文・見出しのウェイトを軽く保ち（100〜300）、タイポグラフィで工学的・知的な印象を生み出す。
- 作品画像やスクリーンショットは余計な枠線やパディングを付けず、クリーンに提示する。

### DON'T
- `border-radius` を使わない（角を丸めない）。
- ドロップシャドウ（`box-shadow`）やぼかし効果を使わない。
- 派手なグラデーションや装飾的な背景パターンを使わない。
- 彩度の高い色（青、緑、赤など）を装飾目的で多用しない（琥珀色・シグナルカラーのみ例外）。
- 太字（`font-weight: 700` 以上）を安易に使わない（見出しはサイズと緊密な行間で立たせる）。
