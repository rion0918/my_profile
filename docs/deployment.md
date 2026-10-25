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
