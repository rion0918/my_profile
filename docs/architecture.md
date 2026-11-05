# アーキテクチャと最適化

## Astro移行後の構成

Astroの静的生成を基盤とし、通常表示はAstroコンポーネントからHTMLを生成する。Reactのクライアント実行は `/world` の `WorldApp client:only="react"` に限定する。共有の事実・経歴・作品・館・操作ルールは引き続き `lib/` に置く。通常本文と館のReact表示は同じデータを参照する。

| 責務 | 実装 | 守ること |
| --- | --- | --- |
| 静的HTML・SEO | `src/pages/`、`src/layouts/Layout.astro` | JavaScriptなしで主要本文を読める。既存URL・タイトル・OGP・言語・referrerを維持する |
| 通常表示 | `src/components/*.astro` | Hydrationしない。画像はAstroでビルド時にWebPと複数幅を生成する |
| ページ間遷移 | Astro `ClientRouter`、`src/scripts/navigation.ts` | 同じ文書で移動し、読書位置を復元する。旧クエリURLは履歴を増やさず `/world` へ移す |
| 3D Island | `components/world/WorldApp.tsx`、`WorldExperience.tsx` | `/world` 内の詳細履歴では `transition:persist` で同じIsland・Canvasを維持する |
| 地図の生成 | `src/pages/world-map.json.ts`、`lib/world-map-data.ts` | ビルド時に静的JSONを生成し、実行時サーバーを必要としない |
| 地図の取得 | `lib/world-map-loader.ts` | 文書内の要求を共有し、別文書ではHTTPキャッシュを再検証する。失敗を永久キャッシュしない |
| 先読み | `src/scripts/navigation.ts`、`lib/world-preload.ts` | Hover/Focusの意図があるときだけ実行。Save-Data/2Gは遷移時まで待つ。WebGL・音声・Rapierを起動しない |
| 3Dの実行 | `WorldCanvas.tsx`、`create-*.ts` | 既存のThree.js・キャラクター・カメラ・タッチ・BGM・遅延Rapier・資源解放を維持する |
| 静的出力の保護 | `scripts/secure-static-export.mjs` | `public/` と `dist/` を検査し、ビルド内の正確なスクリプトハッシュでCSPを生成する |
| 計測 | `src/components/Telemetry.astro` | Vercel SDKを一度だけ注入し、画面遷移完了後のclean URLを一度だけ計測。館の開閉は重複計測しない |

通常ページの初期依存にはReact・Three.js・Rapier・地図・3D素材を含めない。Astroの小さなクライアントルーターは、既存の文書を再読み込みしないUXを維持するために採用する。Reactの通常ページ全体をクライアントアプリとして残す構成や、常時描画する隠し3Dシーンは使わない。

通常表示から離れると3D Islandを破棄し、既存の終了処理で座標・カメラを保存して描画と音声を停止する。戻ったときは同じ保存形式から復元する。館の詳細履歴は `history.state` のAstro用情報を保持し、既存の `popstate` による詳細同期を使う。同じ `/world` 間ではIslandを永続化するため、閉じる・戻る・進むでWebGLを再初期化しない。

CSSは `common.css`（基礎）、`content.css`（通常本文と3Dパネル共通）、`normal.css`（通常表示の追加規則）、`world.css`（3D専用）に分ける。元の規則の順序を保ち、通常表示向けの後段の共通操作スタイルだけを `normal.css` に含める。既存の3D専用上書きはそのまま `world.css` に残す。

移行時の比較・先読み4条件・検証結果は [Astro移行の検証記録](astro-migration.md) を参照。以降は再利用した3D最適化と、その移行前の設計根拠を記録する。

## 形状と資源の扱い

以前は、同じ丸角の箱や円柱を非インデックス形式へ展開し、施設によっては結合後に全頂点を再走査していた。現在は、構築中だけ共有する `createStaticGeometryCache()` がインデックスを持つ形状を返す。同じ元形状は一度だけ処理し、各オブジェクトの変換は独立したクローンへ適用する。クローンは `BufferGeometry.copy()` で作り、箱や円柱のコンストラクターを再実行しない。

元の属性が確定してからキャッシュへ渡す。位置・法線・UV・色・濡れ具合などの属性を区別して頂点を共有し、許容差は `1e-6` とする。三角形は削減しない。透明な部品、複数マテリアルの看板、動く部品の結合範囲は既存の施設ごとの判断を使う。[Three.jsの結合処理](https://threejs.org/docs/pages/module-BufferGeometryUtils.html)に必要な属性の互換性も維持する。

構築用キャッシュは結合後に解放する。街とPCでは、所有するジオメトリのうちシーンから参照されなくなったものも解放する。実行中に必要な形状・共有元・Pointsの形状を誤って解放しないことをテストする。各施設の `dispose()`、人物・物理・レンダラーの終了処理は、それぞれの所有者が引き続き受け持つ。

## 経路探索の準備

静的な経路グリッドを作るときだけ、障害物の拡張AABBを4mの区画へ登録する。各グリッド点は該当区画の候補に対して既存の `isWalkable()` を実行する。通常の衝突関数の意味や、渡した配列の変更に対する挙動は変えない。グリッドの完成結果は従来と同じく障害物配列ごとにキャッシュする。

候補数を減らした後も、実際の島全域と合成した障害物配置の全グリッド点について、元の直接判定との一致を検証する。

## 以前の3D最適化の測定（2026-10-25）

2026-10-25、ローカルの本番ビルドをChromiumで測定。通常表示後に素材の先読みを待ち、3Dへの切り替えから準備完了までを測った。スマホ相当は390×844、端末DPR 3・描画DPR 2、CPUを4倍低速化。PCは1440×900・端末DPR 2。実機のスマートフォンやSafariの測定値ではない。

| 項目 | 変更前 | 変更後 |
| --- | ---: | ---: |
| トップHTML（未圧縮） | 218,948 B | 30,608 B |
| シーンで使うジオメトリのバッファ合計 | 126,723,616 B | 79,716,256 B |
| スマホ相当の3D準備 | 9,975 ms | 6,664 ms |
| 同条件の最長メインスレッドタスク | 2,872 ms | 1,740 ms |
| スマホ相当・クオリティの描画間隔p95 | 35 ms | 33 ms |

変更前・地図と経路の変更後・形状の変更後を、それぞれ `output/playwright/architecture-before.txt`、`architecture-data-navigation.txt`、`architecture-after.txt` に記録した。表の最終値はクローンの生成を修正後の `output/playwright/architecture-final-performance.txt` に記録している。ローカル環境の単回比較であり、準備時間やFPSの実機保証には使わない。

この最適化はCPU側の生成・転送とバッファ容量を減らす。影・反射を含むクオリティモードのGPU負荷は残る。描画DPR・影・反射・施設・移動速度・地図・保存位置の世代は変更しない。

## 確認方法

```sh
npm test
npm run build
npm run typecheck
npm run security:audit
git diff --check
```

本番書き出しの `dist/` をポート3001で配信し、Playwright CLIの `run-code --filename` から次を実行する。

- `tests/browser/architecture-performance.js`: 通常HTML 64KiB以下、ジオメトリ90MiB以下、描画間隔p95 50ms以下。PCとスマホ相当・両画質の実描画を記録する。
- `tests/browser/world-data-loading.js`: 地図が遅い場合と503の場合の館・案内・通常表示への復帰。本文を読む前に地図が必要にならないことを確認する。
- `tests/browser/normal-first.js`: 先読み中の描画・音声停止、読書位置、旧詳細URL、ツアー、戻る・進む、JavaScriptなしの通常表示。
- `tests/browser/world-mode-switch.js`: 表示モード・記事・街の現在地と狭い画面の操作。
- `tests/browser/mobile-resolution.js`: 縦横のDPRと低設定からの復帰。
- `tests/browser/security.js`: 静的ホストのヘッダーを適用した本文・3D・BGM・画質・WASM自転車のCSPと、不正なクエリ・スクリプト・外部通信の遮断。

地図のビルド結果・要求の共有と再試行・全グリッドの一致・形状の属性・所有資源の解放は、通常のNodeテストにも含める。ブラウザ検証・計測の記録は `output/playwright/` に保存し、Web公開とGit管理から除外する。
