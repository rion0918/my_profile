# りおまるの立体文字

`riomaru.typeface.json`は、Zen Maru Gothic Blackの「りおまる」4文字の輪郭をThree.js用に変換したもの。文字の形は変更せず、字形の面取り・厚み・配置・配色は3D側で設定する。日本語フォント全体はブラウザへ配信しない。

- 原作者: Copyright 2021 The Zen Maru Gothic Project Authors
- 原プロジェクト: https://github.com/googlefonts/zen-marugothic
- 入力: https://raw.githubusercontent.com/google/fonts/main/ofl/zenmarugothic/ZenMaruGothic-Black.ttf
- 入力のSHA-256: `6bd74fe76cd39ee0ec18775c3661d845343fb3f6f8fa09a3076638417baf741f`
- ライセンス: SIL Open Font License 1.1。[原文](./RIOMARU-FONT-OFL.txt)を同梱し、JSONの`license`にも収録。
- 変換後の内部フォント名: `Riomaru Landmark`
- 変換スクリプト: `scripts/build-landmark-font.py`

生成時はPython 3.13とfonttools 4.67.0を使用。取得した入力ファイルから次の手順で再生成できる。Pythonの依存は制作時のみ必要で、Webアプリの実行依存には加えていない。

```sh
python3 -m venv /tmp/riomaru-font-tools
/tmp/riomaru-font-tools/bin/pip install fonttools==4.67.0
/tmp/riomaru-font-tools/bin/python scripts/build-landmark-font.py /path/to/ZenMaruGothic-Black.ttf
```

## ふわっと。館の立体文字

同じ入力フォントから「ふわっと。」の5文字を変換した `fuwatto.typeface.json`（9,247 bytes）も、同じスクリプトで生成する。内部名は `Fuwatto Hall`。出典・入力のSHA-256・ライセンスは上記と共通で、JSONにも同梱している。既存の「りおまる」の出力は変更しない。
