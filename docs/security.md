# 公開サイトのセキュリティ

このサイトは Astro の静的生成を使う。問い合わせフォームは Google フォームを iframe で埋め込み、回答を Google が受け付ける。認証・ファイルアップロード・Server Actions・独自 API・Cookie は使用しない。公開物は `npm run build` で生成した `dist/` のみとし、リポジトリ全体や開発サーバーを公開しない。

## 実装した保護

- Next.jsへの依存を削除し、Astro・React integrationをnpmのロックファイルで固定する。
- ビルドの最後に `scripts/secure-static-export.mjs` を実行し、全 HTML（404 を含む）に CSP を追加する。ビルド内の全HTMLのインラインスクリプトの SHA-256 を計算し、未登録のインラインスクリプト・イベント属性・外部スクリプト・外部通信・プラグイン・base タグによる URL の変更を制限する。外部フォーム送信と iframe は Google フォームの `https://docs.google.com` だけを許可する。
- 自転車の Rapier に必要な WebAssembly のみ `wasm-unsafe-eval` で許可する。JavaScript の `unsafe-eval` と `unsafe-inline` は許可しない。`style-src` の `unsafe-inline` は、既存の React・Three.js 周辺の動的スタイルに必要なため残す。画像の `data:`・`blob:` はローカルの画像・モデル用。
- Vercel Web Analytics は共通レイアウトで読み込み、ページ閲覧を計測する。本番のスクリプトと送信先は同一オリジンの `/_vercel/insights/*`（Vercel がビルド設定で指定した場合はその専用パス）を使うため、CSP に外部ドメインや追加のスクリプト実行許可は加えない。カスタムイベントや利用者 ID の送信は実装しない。
- リファラーを HTML と配信ヘッダーの両方で `no-referrer` にする。既存の別タブリンクには `noreferrer` または `noopener` が付いている。
- `.env*`・秘密鍵・`.npmrc`・`.netrc`・`.vercel/` を Git の対象から除外する。ビルド前の `public/` とビルド後の `dist/` の両方で、これらの設定ファイル・秘密鍵・ソースマップ・`.git` の混入を検査し、検出したらビルドを失敗させる。シンボリックリンクも、公開ディレクトリ外のファイルがコピー・公開されるのを防ぐため拒否する。既にコミットされた秘密情報を取り消す機能や、任意のファイル内容からすべての秘密情報を見つける機能ではない。

ClientRouterでは文書の寿命をまたいでCSPを緩められないため、全ルートが同じビルド所有ハッシュの集合を使う。`data-astro-transition-persist` でポリシーを保持し、遷移先のmetaにも同じ内容を適用する。任意のインライン実行や外部ホストは許可せず、フォーム送信と iframe には Google フォームの HTTPS オリジンだけを許可する。

## 配信ヘッダー

`public/_headers` はビルド時に `dist/_headers` へコピーされる。Cloudflare Pages / Netlify など、この形式を解釈する静的ホスティングに `dist/` を配置すると以下が適用される。

- `Content-Security-Policy: frame-ancestors 'none'` と `X-Frame-Options: DENY` による埋め込み防止。
- `X-Content-Type-Options: nosniff` による MIME 推測の抑止。
- `Permissions-Policy` によるカメラ・マイク・位置情報・決済・USB の不使用。
- HTTPS での `Strict-Transport-Security: max-age=31536000`。別用途のサブドメインには影響させない。
- `Referrer-Policy: no-referrer`。

Vercelでは`vercel.json`の全パス向け設定で同じヘッダーを適用する。他の`_headers`を解釈しない配信先でも、同じヘッダーをホスティング側で設定する必要がある。Astroの静的出力には実行時サーバーがないため、HTTPヘッダーはホスティング側が適用する。HTML 内の CSP は配信先に依存せず有効だが、`frame-ancestors`・HSTS・nosniff・Permissions-Policy は HTTP レスポンスヘッダーでのみ有効。

デプロイ後は`node scripts/verify-deployment.mjs <公開URL>`でトップ・通常表示・作品ページ・404・JS・画像・音声・モデルの実際のレスポンスとCSPを確認する。Vercelは保護処理済みの静的ファイルを配信し、保護処理済みの`dist/`だけを公開する。詳細は[デプロイ手順](deployment.md)を参照。

## 検証と更新

```sh
npm ci
npm run security:audit
npm test
npm run typecheck
npm run build
```

`tests/security.test.mjs` はスクリプトのハッシュ・生成物の検査・配信ヘッダー・秘密ファイルの Git 除外を検証する。ブラウザ検証用の `tests/browser/security.js` は Playwright CLI の `run-code --filename` で使う関数で、`dist/` をポート 3001 で配信した状態で実行する。ローカルプレビューは `_headers` を解釈しないため、この検証では同ファイルのヘッダーをレスポンスに適用してブラウザの挙動を確認する。公開先への反映を保証する検証ではない。

`.github/workflows/security.yml` は PR・main への push・毎週月曜 10:18（日本時間）に、ロックファイルからのインストール、依存監査、テスト、型チェック、本番ビルドを行う。監査は low 以上の既知の脆弱性が1件でもあれば失敗する。インストール時の依存パッケージのライフサイクルスクリプトは実行しない。ワークフローの権限は読み取りのみとし、Git 認証情報をチェックアウト先に残さず、使用する Actions はコミット SHA で固定する。自動デプロイは行わない。

`.github/dependabot.yml` は npm 系の依存と GitHub Actions の更新候補を週次で確認する。自動マージは行わず、更新後も検証する。これらはファイルを GitHub のデフォルトブランチに反映後に有効になる。リポジトリ設定による Actions の無効化や、必須チェックの設定まではこのファイルでは変更しない。

2026-10-25 時点で 旧構成の npm・pnpm の監査はともに既知の脆弱性 0 件。公開サイトの各ページ・404・JS・画像・音声・モデルの配信ヘッダーと CSP も確認した。将来の脆弱性まで保証するものではないため、依存更新時と公開前に再監査する。別のフォーム送信先・認証・API・外部サービスを追加する場合は、必要な入力検証・権限管理と CSP を別途見直す。

仕様の参照: [Astroの静的エンドポイント](https://docs.astro.build/en/guides/endpoints/)、[CSP の script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src)、[frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)、[Cloudflare Pages のヘッダー設定](https://developers.cloudflare.com/pages/configuration/headers/)。

更新監視の参照: [npm audit](https://docs.npmjs.com/cli/commands/npm-audit/)、[Dependabot の設定](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configure-version-updates)、[GitHub Actions の安全な利用](https://docs.github.com/en/actions/reference/security/secure-use)。
