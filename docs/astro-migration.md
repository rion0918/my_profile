# Astro移行・性能検証（2026-11-05）

## 結果と判定

Astroの静的ビルドへ移行し、通常本文のReact Hydrationと自動3D先読みを取り除いた。既存のデザイン・本文・主要な3D操作・URL・位置の保存形式を維持した。通常表示の取得量は大幅に削減した。ローカル実装のみで、push・公開・Vercelプロジェクトやカスタムドメインの変更は行っていない。

**既存の厳しいFPS基準は現在の環境では移行前後とも未達である。すべての性能試験が成功した状態ではない。** 単体テスト・型チェック・静的ビルド・セキュリティ・機能検証の成功とは区別する。以下の数値はローカルChromiumでの計測であり、実機・実ユーザーの保証ではない。

## 最終アーキテクチャ

- Astro 7の静的生成。出力は `dist/`。通常本文・プロフィール・セクション・作品詳細は `.astro` コンポーネント。
- `/world` のみ `WorldApp client:only="react"`。既存React 19・Three.js・遅延Rapierを使用する。
- Astro ClientRouterで文書を再読み込みせずに移動。`transition:persist` で同じ `/world` 内の詳細履歴ではIsland・Canvasを維持する。通常ページへ移ると既存の終了処理を実行し、復帰時は保存位置とカメラを復元する。
- `lib/portfolio.ts`、`products.ts`、館・移動の定義を共有し、情報は二重管理しない。通常HTMLと館の描画テンプレートはそれぞれのフレームワークで同じデータを表示する。
- `src/pages/world-map.json.ts` がビルド時にJSONを生成。構造・値は旧出力と同じ。共有要求・失敗時の再試行・文書間の再検証は既存の `world-map-loader.ts` を維持。
- CSSは基礎の `common.css`、本文共有の `content.css`、通常の `normal.css`、3D専用の `world.css`。元の順序と後段の共通操作スタイルを保ち、通常ページへ3D専用CSSを送らない。未使用に見える3D規則は推測で削除していない。
- Astro Imageでプロフィール・プレビュー・作品スクリーンショットの複数幅WebPをビルド時生成。固有サイズとCSSを維持し、プロフィールに高い取得優先度、作品画像に遅延読込を指定。拡大用リンクと3D用の原画像は残す。
- 同一オリジンのVercel Analytics / Speed Insights SDKを一度だけ注入。表示中のclean URLを計測し、詳細開閉でpageviewを重複させない。

独立HTMLを通常のリンクで毎回再読み込みする方式は、既存の文書維持と読書位置のUXに影響する。Reactで通常ページ全体を保持する方式は初期JavaScriptを残す。小さなClientRouterと必要時だけのReact Islandを選択した。

## 主要変更と再利用

| ファイル | 変更 |
| --- | --- |
| `astro.config.mjs`、`src/pages/`、`src/layouts/Layout.astro` | 静的ルーティング・共通メタデータ・3D Island・404 |
| `src/components/*.astro` | 通常本文・画像・モード切り替え・計測 |
| `src/scripts/navigation.ts`、`lib/reading-position.ts` | 旧クエリURL互換・意図時先読み・安全な読書位置・CSP保持 |
| `components/ModeBar.tsx`、`world/WorldExperience.tsx` | Next Link/dynamicを通常のリンクとReact lazy/Suspenseへ変更。Astroのhistory.stateを保持 |
| `src/styles/` | 共通・通常・3Dの配信境界を分離 |
| `scripts/secure-static-export.mjs` | Astro HTML・dist・ClientRouterに対応するCSP |
| `scripts/preview-static.mjs`、`verify-static-build.mjs`、`verify-deployment.mjs` | HTTPヘッダー付きローカル配信、React/3Dの初期混入・地図・資源・公開形状の検証 |
| `vercel.json`、`package.json`、`.github/workflows/security.yml` | Astroとdist、Node要件、CIの静的出力検証 |
| `tests/`、`docs/` | 新境界・履歴・状態・失敗試験、URLと設計記録の更新 |

Next.jsを含む旧依存19パッケージを除去した。React・React DOM・Three.js・Rapier・polygon-clipping・計測SDKは継続。Astro、React integration、Astro check、ビルド用oxcを追加したため、インストール総パッケージ数の削減を主張するものではない。npmを唯一のインストール元とし、旧pnpmロックファイルは削除した。

`@astrojs/react@7.0.0` と `@vitejs/plugin-react@6.1.1` は互換のoxc peer範囲で固定した。最新のintegrationとpluginの組み合わせではoxcのpeer範囲が一致しなかったため、互換の公開バージョンを使用した。`npm ci` と `npm ls` が成功し、監査で既知の脆弱性は0件。

WorldCanvas、全create関数、キャラクター、物理、地図、幾何キャッシュ、フレーム処理、カメラ、タッチ、音声、施設、ツアーのロジックは再利用した。描画DPR・画質・施設数・アニメーションを性能のために削減していない。

## 計測条件

Apple M4 / macOS、Chromium 156。PCは1440×900・DPR 2・CPU等速。スマホ相当は390×844・DPR 3・CPU 4倍低速化。通信はlocalhost、圧縮なし、新規ブラウザコンテキスト、通常表示から5秒待機。Vercelの収集スクリプトは同じ空応答で置換し、本番へデータを送らない。移行前は現行ソースをNext.jsで再ビルドして保存した静的出力、移行後は保護処理済みAstro出力。

下表のJS/CSS/全体量は `PerformanceResourceTiming.encodedBodySize` とHTMLサイズで求めた取得ボディ量。HTTPヘッダー、実ネットワークの圧縮率、Vercel CDNの性能は含めない。リクエスト数には文書とローカルの計測用空応答を含む。

| 通常表示 | Next.js | Astro |
| --- | ---: | ---: |
| HTML | 30,725 B | 11,214 B |
| 初期JS（3Dの自動先読み前） | 482,662 B | 24,765 B |
| 5秒間のJS（先読み含む） | 1,499,841 B | 24,765 B |
| CSS | 67,356 B | 13,789 B |
| PCの全体ボディ量 | 6,098,411 B | 80,582 B |
| スマホ相当の全体ボディ量 | 6,098,411 B | 105,704 B |
| リクエスト数 | 32 | 12 |
| PC LCP / CLS | 124 ms / 0 | 48 ms / 0 |
| スマホ相当 LCP / CLS | 172 ms / 0 | 120 ms / 0 |
| PC load完了 | 93 ms | 40 ms |
| スマホ相当 load完了 | 243 ms | 119 ms |
| 通常表示の最長タスク・スマホ相当 | 113 ms | 50 ms以上なし |
| PC JSヒープ | 8,030,856 B | 2,412,300 B |
| スマホ相当 JSヒープ | 7,311,684 B | 2,462,928 B |

初期JSの依存グラフにはReactのコードがないことを別途検査した。Astroの初期JSのgzip合計は9,745B（ローカル計算値であり配信実測ではない）。プロフィール写真の取得サイズは、PCのDPR 2で1,406,301Bから21,740B、DPR 3で46,862Bになった。本文テキストは8ルートで移行前後一致し、PC・スマホのスクリーンショットを比較した。

Lighthouse 13.6.0のmobile既定条件（412×823、DPR 1.75、CPU 4倍・1,638.4Kbps/150msをsimulate）で、別プロセスを同時測定せずに再計測した。

| 通常ページのLighthouse | Next.js | Astro |
| --- | ---: | ---: |
| Performance | 74 | 100 |
| 推定LCP | 34,293 ms | 1,245 ms |
| CLS | 0 | 0 |
| TBT | 103 ms | 0 ms |
| Speed Index | 1,205 ms | 1,245 ms |

3Dページは別に評価した。Next.jsの `/?mode=world` とAstroの `/world` を同じLighthouse設定で測定した。

| 3DページのLighthouse | Next.js | Astro |
| --- | ---: | ---: |
| Performance | 45 | 44 |
| 推定LCP | 20,865 ms | 14,942 ms |
| CLS | 0 | 0 |
| TBT | 6,391 ms | 5,688 ms |
| Speed Index | 1,438 ms | 3,446 ms |

3DのPerformanceスコアは1点下がった。旧トップは3D起動前に通常プロフィールHTMLを描画する一方、新3D専用ページは準備表示を描画する。Speed Indexは初期に占める画面の違いも受けるため、実際の3D操作準備完了時間と合わせて評価した。これは測定と出力HTMLからの解釈であり、スコア低下を解消できたとは主張しない。大きいシーンを生成するCPUタスクは残り、重い初期処理を削除してスコアを上げる対応はしていない。

単回のラボ比較であり、通常ページでもSpeed Indexはわずかに増えている。INPは実ユーザー集計を取得していないため未測定。LighthouseのTBTをINPとして扱わない。

## 先読み4条件

同じAstro出力で比較。automaticはDOM準備後に開始、idleはアイドルコールバック、hoverは1.5秒後に意図を発生させ、全条件で約3秒後に3Dへ遷移。各条件は新規コンテキスト。保存位置・画質・CPU条件は同じ。これはLANでの単回比較で、低速ネットワークの起動時間は保証しない。

| 条件 | PCの通常表示取得量 | PC 3D準備 | スマホ相当取得量 | スマホ相当3D準備 |
| --- | ---: | ---: | ---: | ---: |
| 自動 | 4,109,433 B | 2,598 ms | 4,134,555 B | 7,231 ms |
| アイドル | 4,109,433 B | 2,623 ms | 4,134,555 B | 7,231 ms |
| Hover | 4,118,240 B | 2,574 ms | 4,143,362 B | 7,199 ms |
| 遷移時 | 69,368 B | 2,595 ms | 94,490 B | 7,412 ms |

この表の取得量は文書を除く。全条件で先読み中のWebGL・音声開始は0。ローカルではシーン生成が支配的で、先読みの起動時間の差は小さい。一方で自動/アイドルは3Dを使わない閲覧にも約4MBを使うため廃止した。Hover/Focusの明示的な関心があるときだけ既存の要求共有を利用し、Save-Data/2Gでは遷移時に取得する。通常ページの最初のJSに先読みモジュール自体も含めない。

## 3Dの評価

通常表示5秒後の切り替えで比較。Next.jsは自動先読みあり、Astroはクリック時の意図による読み込み。

| 項目 | Next.js | Astro |
| --- | ---: | ---: |
| PCの3D準備 | 2,897 ms | 2,574 ms |
| スマホ相当の3D準備 | 7,905 ms | 7,820 ms |
| ジオメトリ数 | 853 | 853 |
| ジオメトリのバッファ容量 | 79,716,256 B | 79,716,256 B |
| 準備中の最長タスク・PC | 535 ms | 505 ms |
| 準備中の最長タスク・スマホ相当 | 2,141 ms | 2,114 ms |

FPSは `world-frame-rate.js` と同じネイティブrAF・performance.nowで主画面の実描画だけを測った。日付だけ固定し、温泉へ歩く1秒の助走後に5秒間収集する。反射をFPSに加算しない。以下は旧予算を無効化した合格試験ではなく、**元の厳格試験を失敗のまま残し、全8条件を収集した比較測定**である。

| ネイティブ描画条件 | Next.js FPS / p95 | Astro FPS / p95 |
| --- | ---: | ---: |
| PC・昼・通常画質 | 30.00 / 33.9 ms | 30.00 / 38.2 ms |
| PC・昼・低設定 | 29.99 / 35.1 ms | 29.99 / 35.0 ms |
| PC・夜・通常画質 | 30.00 / 37.9 ms | 30.01 / 34.7 ms |
| PC・夜・低設定 | 30.00 / 35.1 ms | 30.00 / 35.0 ms |
| スマホ相当・昼・通常画質 | 29.87 / 50.4 ms | 29.69 / 48.5 ms |
| スマホ相当・昼・低設定 | 29.99 / 35.2 ms | 30.00 / 34.3 ms |
| スマホ相当・夜・通常画質 | 29.42 / 46.9 ms | 29.80 / 47.1 ms |
| スマホ相当・夜・低設定 | 29.99 / 35.4 ms | 29.99 / 34.4 ms |

この試験では旧構成・新構成とも8条件で55FPS/p95 30msの予算を満たさなかった。PCの診断では可視状態でもブラウザ自身のネイティブrAFが30.00Hz、実描画が30.00FPSだった。表示更新の制約とアプリの描画負荷を区別し、過去資料の60Hz環境での値と直接比較しない。低設定の30FPS制限をアプリへ追加したものではない。PC昼のp95は33.9→38.2ms、夜は37.9→34.7msで変動し、全条件のFPSはほぼ同じ。単回比較だけで厳密な性能同等性や60FPSを保証しない。

短時間の別測定に含まれていたPlaywright時計補助API適用後のFPSは、ネイティブrAFの測定値として採用しなかった。`migration-performance.js` からそのAPIを除去した。起動時間・通常ページ取得量は時計APIの適用前に収集しており、上の値へ影響しない。

3D準備完了時のPCのCDP JSヒープは65,931,296→37,832,800B、backing storageは131,575,107→95,040,344B。GCを強制していない単回観測で、文書・フレームワークも含む。シーンのメモリ全量やGPU VRAM削減率を表す値ではない。ジオメトリバッファ79,716,256Bは不変。WebGLネイティブメモリ全量・GPU VRAM全量は未測定。

## セキュリティとURL

全静的HTMLに同じビルド内の正確なインラインスクリプトハッシュを付ける。ClientRouterは初期文書のCSPで後続ページも動くため、ページごとのハッシュだけではworldの初回導入を遮断する。ビルド所有コードのハッシュの和集合を使い、ポリシーmetaを維持する。`unsafe-inline`/`unsafe-eval`をscript-srcへ追加せず、Rapier用の `wasm-unsafe-eval` のみを保持した。

`public/` と `dist/` の秘密設定・鍵・ソースマップ・シンボリックリンク検査、frame-ancestors、nosniff、referrer、Permissions-Policy、HSTSは維持する。世界地図の失敗によって本文表示を待たせず、WebGL/モデル/Islandモジュールの失敗時にも通常本文へ戻るリンクを残した。

既存の `/profile`・`/about`・`/career`・`/tech`・`/social`・`/projects/[slug]` は引き続き静的ファイル。旧クエリURLはクエリとハッシュを保持し、履歴に余分な項目を作らない。詳細の開閉ではAstroのhistory.stateを消さない。

## 検証・制約・公開手順

最終確認結果:

- `npm ci --include=dev` と、CI相当の `npm ci --ignore-scripts` からのビルド成功。
- `npm test`: 136件成功、失敗・スキップなし。移行用3件・読書位置1件を追加し、地図エンドポイントとCSPの既存試験を移行した。
- `npm run typecheck`: エラー0。既存の `create-world.ts` に未使用 `pot` のhintが1件あり、この移行と無関係なので変更していない。
- `npm run build`: 静的HTML 10ページ、地図JSON、最適化画像の生成とCSP付与成功。
- `npm run test:static`: 通常8ルートのReact/3D不在、共有メタデータ、生成資源、JSON一致、CSS分離が成功。
- `node scripts/verify-deployment.mjs http://localhost:3001`: 9ページ・404のHTTP保護ヘッダーとHTMLスクリプト、13資源の配信が成功。
- `npm run security:audit`: 既知の脆弱性0。`git diff --check`: 成功。
- ブラウザの15スクリプトが成功: `astro-boundaries`、`normal-first`、`world-history`、`world-mode-switch`、`security`、`analytics`、`world-data-loading`、`world-touch-gestures`、`hall-exhibits`、`mobile-resolution`、`world-frame-input`、`world-entrance`、`world-ux-loading`、`world-tour`、`architecture-performance`。
- `world-frame-rate.js` の55FPS/p95 30msという旧予算は失敗。比較測定では新旧とも8条件未達で、成功として扱っていない。予算を緩和したり試験を無効化したりしていない。

ブラウザでは、通常本文のJavaScript無効表示、3Dコード/モデル/音声の自動取得なし、Focus先読み中の非起動、Save-Data、旧URL・クエリ・ハッシュ、戻る/進む、読書位置、街の現在地、館開閉時の同じCanvas、ツアー・中断・Reduced Motion、画像ビューアー、狭い画面、タッチ・ピンチ・自転車、CSP・WASM・BGM、地図遅延/503・WebGL/モデル/Island失敗・構築途中のコンテキスト喪失・資源解放を検証した。

古いブラウザ試験には初期の6展示ツアー・旧保存キー・旧文言が残っていた。実装を旧仕様へ戻さず、現在の4館ツアー、version 5、館名、探索状態に試験を移行した。検証意図を維持し、失敗を単にスキップしていない。15本以外の過去のブラウザスクリプトすべてを再実行したわけではない。

再現コマンドとVercelで必要な操作は [deployment.md](deployment.md) にまとめる。生成ログ・JSON・スクリーンショットは `output/playwright/astro-migration/` に保存し、Git/Web公開から除外する。

実機iPhone/Android、Safari、実WAN・CDN上の速度、実ユーザーINP、公開後のSpeed Insights送信集計、実際のVercel Preview/本番環境は未検証。ローカルのヘッダー付き出力検証は成功しているが、未公開のため本番の設定反映を保証するものではない。
