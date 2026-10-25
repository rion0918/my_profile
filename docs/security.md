# 公開サイトのセキュリティ

このサイトは Next.js の静的書き出しを使う。認証・投稿・ファイルアップロード・Server Actions・API・Cookie は使用しない。公開物は `npm run build` または `pnpm build` で生成した `out/` のみとし、リポジトリ全体や開発サーバーを公開しない。

## 実装した保護

- Next.js を修正版の 16.4.3 以上へ更新。npm・pnpm 両方のロックファイルを更新した。
- ビルドの最後に `scripts/secure-static-export.mjs` を実行し、全 HTML（404 を含む）に CSP を追加する。ページごとのインラインスクリプトの SHA-256 を計算し、未登録のインラインスクリプト・イベント属性・外部スクリプト・外部通信・フォーム送信・プラグイン・フレーム読み込み・base タグによる URL の変更を制限する。
- 自転車の Rapier に必要な WebAssembly のみ `wasm-unsafe-eval` で許可する。JavaScript の `unsafe-eval` と `unsafe-inline` は許可しない。`style-src` の `unsafe-inline` は、既存の React・Three.js 周辺の動的スタイルに必要なため残す。画像の `data:`・`blob:` はローカルの画像・モデル用。
- リファラーを HTML と配信ヘッダーの両方で `no-referrer` にする。既存の別タブリンクには `noreferrer` または `noopener` が付いている。
- `.env*`・秘密鍵を Git の対象から除外する。生成物に `.env`・秘密鍵・ソースマップ・`.git` が混入した場合は、公開前にビルドを失敗させる。既にコミットされた秘密情報を取り消す機能ではない。

## 配信ヘッダー

`public/_headers` はビルド時に `out/_headers` へコピーされる。Cloudflare Pages / Netlify など、この形式を解釈する静的ホスティングに `out/` を配置すると以下が適用される。

- `Content-Security-Policy: frame-ancestors 'none'` と `X-Frame-Options: DENY` による埋め込み防止。
- `X-Content-Type-Options: nosniff` による MIME 推測の抑止。
- `Permissions-Policy` によるカメラ・マイク・位置情報・決済・USB の不使用。
- HTTPS での `Strict-Transport-Security: max-age=31536000`。別用途のサブドメインには影響させない。
- `Referrer-Policy: no-referrer`。

Vercelでは`vercel.json`の全パス向け設定で同じヘッダーを適用する。他の`_headers`を解釈しない配信先でも、同じヘッダーをホスティング側で設定する必要がある。Next.js の `headers()` は静的書き出しに適用されない。HTML 内の CSP は配信先に依存せず有効だが、`frame-ancestors`・HSTS・nosniff・Permissions-Policy は HTTP レスポンスヘッダーでのみ有効。

デプロイ後は`node scripts/verify-deployment.mjs <公開URL>`でトップ・通常表示・作品ページ・404・JS・画像・音声・モデルの実際のレスポンスとCSPを確認する。VercelはNext.jsのサーバー出力ではなく、保護処理済みの`out/`だけを公開する。詳細は[デプロイ手順](deployment.md)を参照。

## 検証と更新

```sh
npm ci
npm audit
npm test
npm run build
pnpm audit
```

`tests/security.test.mjs` はスクリプトのハッシュ・生成物の検査・配信ヘッダー・秘密ファイルの Git 除外を検証する。ブラウザ検証用の `tests/browser/security.js` は Playwright CLI の `run-code --filename` で使う関数で、`out/` をポート 3001 で配信した状態で実行する。ローカルプレビューは `_headers` を解釈しないため、この検証では同ファイルのヘッダーをレスポンスに適用してブラウザの挙動を確認する。公開先への反映を保証する検証ではない。

2026-10-24 時点で npm・pnpm の監査はともに既知の脆弱性 0 件。将来の脆弱性まで保証するものではないため、依存更新時と公開前に再監査する。新しくフォーム・認証・API・外部サービスを追加する場合は、必要な入力検証・権限管理と CSP を別途見直す。

仕様の参照: [Next.js の静的書き出し](https://nextjs.org/docs/app/guides/static-exports)、[CSP の script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src)、[frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)、[Cloudflare Pages のヘッダー設定](https://developers.cloudflare.com/pages/configuration/headers/)。
