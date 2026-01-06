# Supabase移行セットアップ手順

## 📋 概要

このドキュメントでは、編集報告WEBアプリをGoogle Apps ScriptからSupabaseに移行するための具体的な手順を説明します。

## ✅ 前提条件

- GitHubアカウント
- Supabaseアカウント（無料プランで可）
- 基本的なSQLの知識

## 🚀 セットアップ手順

### Step 1: Supabaseプロジェクトの作成

1. **Supabaseにアクセス**
   - https://supabase.com にアクセス
   - GitHubアカウントでサインイン

2. **新規プロジェクトを作成**
   - "New Project" をクリック
   - プロジェクト名: `henshi-houkoku-app`
   - データベースパスワード: 強力なパスワードを設定（必ず保存）
   - リージョン: `Northeast Asia (Tokyo)`
   - プランティア: Free プラン

3. **プロジェクト情報を記録**
   - Project URL: `https://xxxxx.supabase.co`
   - API Key (anon, public): `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - これらの情報は後で使用します

### Step 2: データベーススキーマの作成

1. **Supabase Studioを開く**
   - 左メニューから「SQL Editor」を選択

2. **スキーマを実行**

   以下の順序でSQLファイルを実行します：

   a. **テーブル作成**
   ```sql
   -- supabase/01_schema.sql の内容をコピー＆ペースト
   ```

   b. **RLSポリシー設定**
   ```sql
   -- supabase/02_rls_policies.sql の内容をコピー＆ペースト
   ```

   c. **関数とトリガー**
   ```sql
   -- supabase/03_functions.sql の内容をコピー＆ペースト
   ```

3. **実行確認**
   - 左メニューから「Table Editor」を選択
   - 11個のテーブルが作成されていることを確認

### Step 3: Supabase Storageの設定

1. **ストレージバケット作成**
   - 左メニューから「Storage」を選択
   - "Create a new bucket" をクリック
   - バケット名: `estimate-pdfs`
   - Public bucket: オフ（プライベート）
   - File size limit: 10MB

2. **ストレージポリシー設定**
   ```sql
   -- supabase/04_storage_setup.sql の内容をSQL Editorで実行
   ```

### Step 4: 初期データの投入

1. **マスタデータを登録**

   ```sql
   -- ジャンルマスタ
   INSERT INTO genres (genre_id, genre_name, display_order) VALUES
   ('GNR-001', '企業紹介', 1),
   ('GNR-002', 'プロモーション', 2),
   ('GNR-003', 'イベント', 3),
   ('GNR-004', '教育・研修', 4);

   -- 技術マスタ
   INSERT INTO technologies (tech_id, tech_name, display_order) VALUES
   ('TECH-001', 'Premiere Pro', 1),
   ('TECH-002', 'After Effects', 2),
   ('TECH-003', 'DaVinci Resolve', 3),
   ('TECH-004', 'Photoshop', 4);

   -- 見積項目マスタ
   INSERT INTO estimate_items (estimate_item_id, estimate_item_name, hourly_rate, display_order) VALUES
   ('EST-001', '編集作業', 3000, 1),
   ('EST-002', 'モーショングラフィックス', 4000, 2),
   ('EST-003', 'カラーグレーディング', 3500, 3);

   -- 編集項目マスタ
   INSERT INTO edit_items (edit_item_id, edit_item_name, hourly_rate, display_order) VALUES
   ('EDIT-001', '粗編集', 2500, 1),
   ('EDIT-002', '本編集', 3000, 2),
   ('EDIT-003', 'エフェクト作業', 4000, 3),
   ('EDIT-004', '音声編集', 2800, 4);
   ```

2. **テストユーザーを作成**

   a. Supabase Authにユーザーを作成
   ```
   左メニュー「Authentication」→「Users」→「Add User」
   - Email: test.user@example.com
   - Password: testpass123
   - Auto Confirm User: チェック
   ```

   b. usersテーブルにユーザー情報を追加
   ```sql
   INSERT INTO users (user_id, name, role, auth_user_id)
   VALUES (
     'test.user',
     'テストユーザー',
     'staff',
     'ここにSupabase AuthのUser IDを貼り付け'
   );
   ```

### Step 5: フロントエンドの設定

1. **config.jsを更新**

   `frontend/js/config.js` を開いて、Supabaseの情報を設定：

   ```javascript
   const CONFIG = {
     SUPABASE: {
       URL: 'https://xxxxx.supabase.co',  // ← あなたのProject URL
       ANON_KEY: 'eyJhbGciOiJIUzI1NiIs...'  // ← あなたのAnon Key
     },
     // ...
     MODE: 'SUPABASE'  // ← SUPABASEに設定
   };
   ```

2. **api.jsを切り替え**

   ```bash
   # 既存のapi.jsをバックアップ
   mv frontend/js/api.js frontend/js/api-gas-backup.js

   # Supabase版をapi.jsとして使用
   mv frontend/js/api-supabase.js frontend/js/api.js
   ```

### Step 6: ローカルテスト

1. **開発サーバーを起動**
   ```bash
   cd frontend
   npx http-server -p 8080
   ```

2. **ブラウザでアクセス**
   - http://localhost:8080 を開く

3. **ログインテスト**
   - ユーザーID: test.user
   - パスワード: testpass123
   - ログインできることを確認

### Step 7: デプロイ

1. **GitHub Pagesにデプロイ**
   ```bash
   git add .
   git commit -m "Migrate to Supabase"
   git push origin main
   ```

2. **動作確認**
   - GitHub PagesのURLにアクセス
   - 本番環境で動作確認

## 🔧 トラブルシューティング

### ログインできない場合

1. **Supabase Authの設定を確認**
   - Authentication → Settings → Email Auth が有効になっているか確認

2. **RLSポリシーを確認**
   - SQL Editorで以下を実行してテスト
   ```sql
   -- RLSを一時的に無効化
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ```

3. **ブラウザのコンソールを確認**
   - F12でデベロッパーツールを開く
   - Console タブでエラーメッセージを確認

### データが表示されない場合

1. **RLSポリシーを確認**
   ```sql
   -- 現在のユーザーで何が見えるか確認
   SELECT * FROM users WHERE auth_user_id = auth.uid();
   ```

2. **外部キー制約を確認**
   - テーブル間の参照が正しく設定されているか確認

## 📚 参考リンク

- [Supabase公式ドキュメント](https://supabase.com/docs)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

## 🎯 次のステップ

1. 既存データの移行（Google スプレッドシートから）
2. 本番環境での運用テスト
3. ユーザーへの移行通知とトレーニング

---

問題が発生した場合は、`SUPABASE_MIGRATION_GUIDE.md` の「サポートとトラブルシューティング」セクションを参照してください。
