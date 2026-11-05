# Vercelへの公開

既存のVercelプロジェクト `my-profile` とカスタムドメイン `riomaru.jp` を継続利用する。この移行作業ではpush・デプロイ・ドメイン変更を行わない。既存のGit連携では `main` へのpushが本番更新につながるため、公開時は先に別ブランチのPreviewで確認する。

`vercel.json` は Framework Preset `Astro`、Install Command `npm ci --include=dev`、Build Command `npm run build`、Output Directory `dist` を指定する。Astroは `output: "static"`、`build.format: "file"` で生成する。アダプター・SSR・Functionsは不要。`cleanUrls: true` で `/profile`・`/projects/yoin`・`/world` などの拡張子なしURLを維持する。`public/_headers` と同じHTTP保護ヘッダーをVercelの全パスへ適用する。

Astro・Sharpに対応するNode.js 24をVercelプロジェクトのNode.js Versionに設定し、`package.json` の `engines.node` も `24.x` に固定する。これによりVercelのProject Settingsがエンジン指定に上書きされないようにする。インストール元は `package-lock.json` に統一し、旧Next.jsの `pnpm-lock.yaml` は削除した。

トップは通常表示で、Reactや3D素材は自動読込しない。`world-map.json` はAstroの静的エンドポイントからビルド時に `dist/` へ生成する。旧 `/?mode=world`・`/?detail=...` はクライアントルーターで `/world` に移す。[アーキテクチャ](architecture.md) と [移行の検証結果](astro-migration.md) を参照。

公開前のローカル確認:

```sh
npm ci --include=dev
npm run security:audit
npm test
npm run typecheck
npm run build
node scripts/verify-static-build.mjs
git diff --check
node scripts/preview-static.mjs
```

別ターミナルでHTTPヘッダーと静的出力を確認する:

```sh
node scripts/verify-deployment.mjs http://localhost:3001
```

`tests/browser/*.js` はPlaywright CLIの `run-code --filename` に渡すブラウザ検証関数。静的出力をポート3001で配信してから実行する。検証用のAPIサーバーや本番へのデータ書き込みは必要ない。

公開するときは、既存プロジェクトのFramework・Build・Outputのダッシュボード上の古い上書き設定が `vercel.json` と矛盾していないことを確認する。承認されたコミットをPreviewへ反映し、通常本文、旧URL、3D、CSP、WASM、BGM、タッチ、Analytics/Speed Insightsを確認してから本番へ反映する。既存のカスタムドメインは付け替えない。公開後は実際のURLで検証する:

```sh
node scripts/verify-deployment.mjs https://riomaru.jp
```

静的ファイルを配信するため、公開物は保護処理済み `dist/` のみ。`out/`・`.next/` は移行前のローカル生成物で、公開しない。ソース・テスト・検証画像・ログも公開しない。

## Analytics / Speed Insights

`src/components/Telemetry.astro` はReactに依存しないVercel SDKを使用する。`astro:page-load` で実際のclean URLを読み、ページ遷移ごとに1回だけpageviewを送る。SDKの自動追跡は無効化し、同じパス内の館の詳細開閉では重複計測しない。Speed Insightsは同じスクリプトを維持したままrouteを更新する。送信先は同一オリジンの `/_vercel/` を使用し、CSPへ外部許可を追加しない。

ローカルにはVercelの計測エンドポイントがないため、通常のプレビューでは該当スクリプトが404になる。`tests/browser/analytics.js` は実際のAnalyticsスクリプトをローカルで動かし、送信を捕捉してPC・スマホ幅で重複とCSP違反を検証する。本番へ検証用ページビューは送らない。本番のSpeed Insights集計と実ユーザーのINPは公開後に確認する。

参照: [Astro on Vercel](https://vercel.com/docs/frameworks/frontend/astro)、[Web Analytics SDK](https://vercel.com/docs/analytics/package)、[Speed Insights](https://vercel.com/docs/speed-insights/quickstart)。
