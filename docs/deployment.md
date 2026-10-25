# Vercelへの公開

既存のVercelプロジェクト`my-profile`はGitHubの`rion0918/my_profile`と接続されている。`main`へのpushで本番を更新する。

公開URL: https://my-profile-sand-omega.vercel.app/

`vercel.json`でnpmのロックファイルから依存を導入し、`npm run build`の結果の`out/`だけを配信する。Framework Presetは`Other`に固定し、HTMLのCSPを追加した静的ファイルをそのまま使う。`cleanUrls`で`/profile`・`/projects/yoin`など既存の拡張子なしURLを維持する。`public/_headers`と同じ保護ヘッダーは、Vercel側の`headers`設定で全パスに適用する。

公開前:

```sh
npm test
npm run typecheck
npm run build
git diff --check
```

GitHub上のVercelステータスが対象コミットで成功した後、実際の公開先を確認する:

```sh
node scripts/verify-deployment.mjs https://my-profile-sand-omega.vercel.app
```

検証は8ページと未存在URL、各ページのHTTP保護ヘッダー・インラインスクリプトのCSPハッシュ、JS・音声・モデル・作品画像を確認する。ブラウザでは3Dの読み込み、ツアー、スマホのフリック移動、通常表示を確認する。

ローカルの検証画像・ログ・出力物はGitから除外する。公開されるのは静的出力だけで、検証スクリプト・テスト・ソース全体をWeb配信する構成にはしない。

## Web Analytics

`@vercel/analytics/next` の `Analytics` を共通レイアウトに設置し、3D・通常表示・個別ページの閲覧とクライアント側のページ遷移を計測する。Vercel プロジェクト `my-profile` の Web Analytics は有効化済み。コードのデプロイ後に [Analytics](https://vercel.com/rion0918s-projects/my-profile/analytics) で集計を確認できる。

ローカルの静的プレビューには Vercel の計測エンドポイントがない。`tests/browser/analytics.js` は本番で配信される計測スクリプトをローカルで動かし、送信を捕捉して通常表示→3D→通常表示の計測、二重読み込み、CSP 違反を PC・スマホ幅で検証する。本番へ検証用の閲覧データは送らない。Playwright CLI の `run-code --filename` で使い、`out/` をポート 3001 で配信した状態で実行する。

実装の参照: [Vercel Web Analytics の導入](https://vercel.com/docs/analytics/quickstart)、[公式 SDK の設定](https://vercel.com/docs/analytics/package)。
