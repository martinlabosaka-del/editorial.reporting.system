# 🚀 クイックスタートガイド

編集報告WEBアプリ（Supabase版）を最速でセットアップする方法

## ⏱️ 所要時間: 約15分

## 📝 ステップ1: Supabaseプロジェクト作成 (3分)

1. https://supabase.com にアクセス
2. GitHubアカウントでサインイン
3. "New Project" をクリック
4. 以下を入力:
   - **Name**: `henshi-houkoku-app`
   - **Database Password**: 強力なパスワード（必ず保存！）
   - **Region**: `Northeast Asia (Tokyo)`
   - **Pricing Plan**: Free
5. "Create new project" をクリック
6. プロジェクト作成完了を待つ（1-2分）

## 📋 ステップ2: プロジェクト情報を確認

プロジェクトページで以下を確認:

- **Project URL**: `https://xxxxx.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 🗄️ ステップ3: データベースセットアップ (5分)

### 3-1. 統合SQLを実行

1. Supabase Studio左メニュー > **SQL Editor** をクリック
2. "New query" をクリック
3. [`supabase/00_setup_all.sql`](./supabase/00_setup_all.sql) の内容を全てコピー
4. ペーストして **Run** をクリック
5. "セットアップが完了しました！" メッセージを確認

### 3-2. RLSポリシーを設定

1. SQL Editorで "New query"
2. [`supabase/02_rls_policies.sql`](./supabase/02_rls_policies.sql) をコピー＆ペースト
3. **Run** をクリック

### 3-3. PostgreSQL関数を作成

1. SQL Editorで "New query"
2. [`supabase/03_functions.sql`](./supabase/03_functions.sql) をコピー＆ペースト
3. **Run** をクリック

## 📦 ステップ4: Storageセットアップ (2分)

1. 左メニュー > **Storage** をクリック
2. "Create a new bucket" をクリック
3. 設定:
   - **Name**: `estimate-pdfs`
   - **Public bucket**: オフ（チェックなし）
   - **File size limit**: `10`
   - **Allowed MIME types**: `application/pdf`
4. "Create bucket" をクリック
5. SQL Editorで [`supabase/04_storage_setup.sql`](./supabase/04_storage_setup.sql) を実行（ポリシー設定）

## 👤 ステップ5: テストユーザー作成 (2分)

### 5-1. Supabase Authにユーザー作成

1. 左メニュー > **Authentication** > **Users** をクリック
2. "Add user" > "Create new user" をクリック
3. 入力:
   - **Email**: `test.user@example.com`
   - **Password**: `testpass123`
   - **Auto Confirm User**: チェック
4. "Create user" をクリック
5. 作成されたユーザーの **ID** をコピー（UUIDの長い文字列）

### 5-2. usersテーブルに登録

SQL Editorで以下を実行（User IDを置き換えてください）:

```sql
INSERT INTO users (user_id, name, role, is_active, auth_user_id)
VALUES (
  'test.user',
  'テストユーザー',
  'staff',
  true,
  'ここにコピーしたUser IDを貼り付け'  -- ← 置き換え
);
```

## ⚙️ ステップ6: フロントエンド設定 (3分)

### ✅ すでに設定済み！

`frontend/js/config.js` はすでに以下の情報で設定されています:

```javascript
SUPABASE: {
  URL: 'https://hrywcftzbturamsuoizb.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

### API切り替え

既存のGAS APIからSupabase APIに切り替えます:

```bash
# 既存のapi.jsをバックアップ
mv frontend/js/api.js frontend/js/api-gas-backup.js

# Supabase版をapi.jsとして使用
cp frontend/js/api-supabase.js frontend/js/api.js
```

または、手動で:
1. `frontend/js/api.js` を `api-gas-backup.js` にリネーム
2. `frontend/js/api-supabase.js` を `api.js` にリネーム

## 🧪 ステップ7: ローカルテスト

1. ターミナルを開く
2. 以下を実行:

```bash
cd frontend
npx http-server -p 8080
```

3. ブラウザで http://localhost:8080 を開く
4. ログイン:
   - **ユーザーID**: `test.user`
   - **パスワード**: `testpass123`

## ✅ 動作確認チェックリスト

- [ ] ログインできる
- [ ] ダッシュボードが表示される
- [ ] クライアント一覧が取得できる
- [ ] ジャンル・技術のマスタデータが表示される

## 🎉 完了！

おめでとうございます！Supabase版のセットアップが完了しました。

## 📚 次のステップ

- [詳細なセットアップ手順](./SUPABASE_SETUP_INSTRUCTIONS.md)
- [移行ガイド](./SUPABASE_MIGRATION_GUIDE.md)
- [README](./README_SUPABASE.md)

## 🆘 トラブルシューティング

### ログインできない

1. ブラウザのコンソール（F12）でエラーを確認
2. Supabase Auth設定を確認:
   - Authentication > Settings > Email Auth が有効か
3. `config.js` のURL/Keyが正しいか確認

### データが表示されない

1. SQL Editorで以下を実行して確認:
```sql
SELECT * FROM users WHERE user_id = 'test.user';
SELECT * FROM genres;
SELECT * FROM clients;
```

2. RLSポリシーが正しく設定されているか確認

### その他の問題

[SUPABASE_MIGRATION_GUIDE.md](./SUPABASE_MIGRATION_GUIDE.md#サポートとトラブルシューティング) を参照してください。
