# SQL自動適用のセットアップ手順

GitHub Actions からマイグレーションを自動適用するための初期設定です。
**2026-08-12 に本番環境（`hrywcftzbturamsuoizb`）で実施済み**なので、
通常は読む必要がありません。

必要になるのは次の場合です。

- Supabase プロジェクトを作り直したとき
- リポジトリを移したとき
- 他の人に引き継ぐとき

日々の運用（新しいSQLの追加方法）は [`MIGRATIONS.md`](./MIGRATIONS.md) を参照してください。

---

## 前提の確認

**リポジトリが public であること。**

private かつ GitHub Free プランだと、ステップ3の承認ルール（Environments の
protection rules）が使えません。その場合の代替は末尾に書いています。

---

## ステップ1: ベースラインを登録する

**ここを飛ばすと壊れます。** 最重要です。

Supabase CLI は「どのSQLを適用済みか」を DB 側の
`supabase_migrations.schema_migrations` で管理します。
このテーブルが空のまま自動適用を始めると、CLI は「1本も適用されていない」と
判断して `migrations/` を頭から全部流そうとします。

### 1-1. 現状を確認する

Supabase ダッシュボード → **SQL Editor** → **New query** で実行します。

```sql
SELECT to_regclass('supabase_migrations.schema_migrations') AS 台帳テーブル;
```

- **`NULL`** … 期待どおり。次へ進む
- **テーブル名が返る** … 既に何か記録されている。**先に進まず**、
  `SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;` で中身を確認する

> いきなり `SELECT COUNT(*)` を書くと、テーブルが無いとき
> `relation does not exist` で落ちます。正常な未作成なのか本当の失敗なのか
> 区別できないため、`to_regclass` を使っています。

### 1-2. BASELINE.sql を実行する

[`BASELINE.sql`](./BASELINE.sql) の **STEP 2 セクション**を
SQL Editor に貼り付けて実行します。
STEP 1 / STEP 3 はコメントアウトしてあるので、ファイル全体を貼っても構いません。

**実行時に警告ダイアログが出ます。**

```
Potential issue detected
This query creates a table without enabling Row Level Security.
[Cancel] [Run without RLS] [Run and enable RLS]
```

→ **「Run without RLS」を選んでください。**

`CREATE TABLE` があると必ず出る汎用の警告で、今回は当てはまりません。

- このテーブルは `public` ではなく `supabase_migrations` スキーマにある。
  PostgREST が公開するのは `public` / `graphql_public` / `storage` だけなので、
  anon キーでも REST 経由では到達できない
- 作ったばかりのスキーマで anon / authenticated に GRANT していない
- Supabase CLI 自身もこのテーブルを RLS 無しで作る。ここだけ形を変えると
  将来 CLI と挙動が食い違ったときの切り分けが増える

### 1-3. 件数を確認する

```sql
SELECT COUNT(*) AS 登録件数 FROM supabase_migrations.schema_migrations;
```

**`migrations/` のファイル数と一致していれば成功です**（2026-08-12 時点で30件）。

---

## ステップ2: Secret `SUPABASE_DB_URL` を登録する

### 2-1. 接続文字列を取得する

1. Supabase ダッシュボード上部の **Connect** ボタン
2. **Connection Method** で **Session pooler** を選ぶ
3. **Type** は `URI`

**必ず Session pooler を選んでください。** 既定で選ばれている
Direct connection は IPv6 専用で、GitHub Actions のランナー（IPv4）からは
つながりません。Transaction pooler（ポート 6543）は prepared statement や
advisory lock が使えず、マイグレーションには使えません。

正しく選べているかは host と user で判別します。**ポートはどちらも 5432 なので
ポートでは見分けられません。**

| | Direct（使わない） | Session pooler（これを使う） |
|---|---|---|
| host | `db.<ref>.supabase.co` | `aws-<n>-<region>.pooler.supabase.com` |
| user | `postgres` | `postgres.<ref>` |

本番の例:

```
postgresql://postgres.hrywcftzbturamsuoizb:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
```

### 2-2. パスワードを埋める

`[YOUR-PASSWORD]` を角括弧ごと実際のDBパスワードに置き換えます。

分からない場合は、Connect ダイアログの Connection string 枠の右上にある
**Reset database password** でリセットします。Supabase はDBパスワードを
表示できない（ハッシュ保存）ので、控えが無ければリセット一択です。
フロントエンドは anon key で REST 経由のため影響はありません。

**記号を含む場合は percent-encode が必要です。**

| 文字 | 書き換え |
|---|---|
| `@` | `%40` |
| `#` | `%23` |
| `/` | `%2F` |
| `:` | `%3A` |
| `?` | `%3F` |
| `&` | `%26` |
| `+` | `%2B` |

エンコード漏れは `password authentication failed` という紛らわしいエラーになります。
リセットするなら**英数字だけ**にしておくのが確実です。

### 2-3. GitHub に登録する

1. リポジトリ → **Settings** → **Secrets and variables** → **Actions**
2. **Secrets** タブ → **New repository secret**
3. Name: `SUPABASE_DB_URL` ／ Secret: 2-2 で作った文字列
4. **Add secret**

登録後は中身を読み出せません（上書きのみ）。手元に控えておいてください。

---

## ステップ3: Environment `production` を作る

1. リポジトリ → **Settings** → 左メニュー **Environments** → **New environment**
2. Name: `production`

   **ワークフローの `environment: production` と完全一致させること。**
   名前が違うと GitHub は新しい環境を勝手に作り、承認ルールが付かないまま
   素通りします。

3. **Configure environment** → **Required reviewers** にチェック
4. 承認者のアカウントを追加
5. **Save protection rules**

チェックを入れただけで保存を忘れると効きません。
Environments 一覧に戻って `production` に「1 protection rule」と
表示されていること、行をクリックして Required reviewers にチェックが
入っていることを確認してください。

> 一覧の `github-pages` は GitHub Pages が自動で作った別物です。触らないこと。

---

## ステップ4: Variable `DB_MIGRATE_ENABLED` を登録する

安全装置の解除です。**ステップ1〜3が全て終わってから**実施してください。

1. **Settings** → **Secrets and variables** → **Actions**
2. **Variables** タブ

   **Secrets タブとは別のタブです。** ここを間違えると
   `vars.DB_MIGRATE_ENABLED` が読めず、適用ジョブがずっと skip されます。

3. **New repository variable**
4. Name: `DB_MIGRATE_ENABLED` ／ Value: `true`

   **小文字の `true`。** `True` や `TRUE` では一致しません。

---

## ステップ5: 動作確認

DBを変更しない確認方法があります。

1. **Actions** タブ → 左の **DB migrate**
2. **Run workflow** → Branch: `main` → **Run workflow**
3. `apply` ジョブが `production waiting for review` で停止する
4. **Review deployments** → `production` にチェック → **Approve and deploy**

### 期待する結果

**「適用予定の確認」ステップ**

```
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Remote database is up to date.
```

**「適用後の一覧」ステップ** で Local と Remote が全行一致していれば完了です。

### ここで異常だった場合

**何かを適用しようとしていたら、絶対に放置しないでください。**
ベースラインが効いていないので、次に本物のマイグレーションを足したときに
全部が流れます。ステップ1をやり直してください。

`dry-run` ジョブがグレー（skip）になるのは正常です。
あちらは `pull_request` のときだけ動きます。

---

## トラブルシューティング

| 症状 | 原因 |
|---|---|
| `connection refused` / タイムアウト | Direct connection の URL を登録している。Session pooler に差し替え |
| `password authentication failed` | パスワードの percent-encode 漏れ、または置換ミス |
| `apply` ジョブが skip される | `DB_MIGRATE_ENABLED` が Variables タブに `true`（小文字）で入っていない |
| 承認なしで走り始める | Required reviewers が保存されていない |
| `found local migration files to be inserted before the last migration` | 追加したファイル名の日時が、適用済みのものより古い |
| 何かを適用しようとする | ベースライン未実施、または件数が合っていない |

### 対応不要な警告

```
Node.js 20 is deprecated. The following actions target Node.js 20 but are
being forced to run on Node.js 24: actions/checkout@v4, supabase/setup-cli@v1
```

各アクションの提供元（GitHub と Supabase）の問題で、こちらのコードは無関係です。
実行は成功しています。提供元が更新すれば自然に消えます。

---

## private + Free プランだった場合

Environments の承認ルールが使えないので、ステップ3を飛ばし、
[`../.github/workflows/db-migrate.yml`](../.github/workflows/db-migrate.yml) から
`push:` トリガーと `environment: production` の行を削除してください。

`workflow_dispatch` だけが残り、**Actions 画面から手動起動する形**になります。
承認ボタンの代わりに起動ボタンが人間の判断ポイントになるので、安全性は同等です。
