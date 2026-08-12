# デプロイ手順

このリポジトリの `main` ブランチが、そのまま GitHub Pages で公開されています。
`main` へのプッシュ＝本番反映です。

公開URL: https://martinlabosaka-del.github.io/editorial.reporting.system/

## 手順

```bash
# 1. キャッシュ用のバージョンを更新する（JS/CSSを変更した場合は必須）
node bump-version.js

# 2. コミットしてプッシュ
git add -A
git commit -m "変更内容"
git push origin main
```

`node bump-version.js` は `index.html` のJS/CSS読み込みに
`?v=（現在時刻）` を付け直します。バージョンを明示したい場合は
`node bump-version.js 3.1.0` のように引数で渡せます。

**SQLファイルやドキュメントだけの変更なら、手順1は不要です。**

## なぜバージョンを付けるのか

GitHub Pages は JS/CSS を `Cache-Control: max-age=600` で配信します。
そのため更新をプッシュしても、各利用者のブラウザは**最大10分間、
古いファイルを使い続けます。**

さらに厄介なのは、ファイルごとにキャッシュの期限が独立していることです。
何もしないと「新しい `index.html` ＋ 古い `project.js`」のように
バージョンが混ざった状態で動いてしまい、原因の分かりにくい不具合になります。

読み込みURLに `?v=xxxx` を付けてバージョンを変えると、ブラウザは
別ファイルとして扱うためキャッシュを無視して取りに行きます。
`index.html` とJS/CSSのバージョンが必ず一致するので、混ざった状態になりません。

## 反映されるまでの時間

`index.html` 自体も10分キャッシュされるため、
**全員に行き渡るまで最大10分**かかります。これは仕様上避けられません。

すぐに確認したい場合はスーパーリロードしてください。

| 環境 | 操作 |
|---|---|
| Windows (Chrome / Edge) | `Ctrl` + `Shift` + `R` |
| Mac (Chrome / Safari) | `Cmd` + `Shift` + `R` |

それでも変わらない場合は、DevTools（`F12`）を開いた状態で
リロードボタンを長押し →「キャッシュの消去とハード再読み込み」。

## デプロイされたか確認する

ブラウザのキャッシュに惑わされずに確認したい場合は、
公開中のファイルを直接取得してください。

```bash
# 公開中のバージョンを確認
curl -s https://martinlabosaka-del.github.io/editorial.reporting.system/ | grep "js/app.js"

# 特定のファイルの中身を確認
curl -s https://martinlabosaka-del.github.io/editorial.reporting.system/js/project.js | grep "探したい文字列"
```

ここに新しい内容が出ていれば、デプロイは成功しています。
画面に反映されないのはブラウザキャッシュが原因です。

## データベースの変更を伴う場合

`supabase/migrations/` にSQLを追加した場合は、GitHub Actions の
**DB migrate** ワークフローが適用します。SQL Editor での手作業は不要です。
`main` にマージすると承認待ちで止まるので、Actions の画面で承認してください。
書き方と注意点は `supabase/MIGRATIONS.md` を参照してください。

カラム追加を伴う変更では、**SQLの適用を先に済ませてから**画面を確認してください。
逆になると、カラムが無い状態で新しいJSが動いて保存エラーになります。
JS/CSS は GitHub Pages のキャッシュで最大10分遅れて反映されるため、
承認を先に済ませておけば自然とこの順序になります。
