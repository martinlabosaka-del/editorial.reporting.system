# 編集報告WEBアプリ (Supabase版)

動画編集プロジェクトの報告・管理システム

## 📋 概要

このアプリケーションは、動画編集プロジェクトの登録、編集時間の記録、承認フローを管理するためのWebアプリケーションです。

### 主な機能

- **プロジェクト管理**: 案件の登録、検索、詳細表示
- **編集時間登録**: 日々の編集作業時間の記録
- **承認フロー**: リーダー・役員による二段階承認
- **ダッシュボード**: プロジェクトの進捗状況を一覧表示
- **権限管理**: ユーザーの役割に応じた機能制限

## 🏗️ システム構成

```
┌─────────────────────────────────────┐
│  GitHub Pages (フロントエンド)      │
│  - HTML/CSS/JavaScript              │
│  - Supabase JS Client               │
└──────────┬──────────────────────────┘
           │ HTTPS (直接通信)
           ↓
┌─────────────────────────────────────┐
│        Supabase                      │
│  ┌──────────────────────────────┐   │
│  │ PostgreSQL Database          │   │
│  │  - 11テーブル                │   │
│  │  - Row Level Security (RLS)  │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ Supabase Auth (JWT認証)      │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ Supabase Storage (PDF保存)   │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 🚀 セットアップ

### 必要な準備

1. Supabaseアカウント（無料プランで可）
2. GitHubアカウント（GitHub Pagesでホスティング）

### セットアップ手順

詳細な手順は以下のドキュメントを参照してください：

📘 **[SUPABASE_SETUP_INSTRUCTIONS.md](./SUPABASE_SETUP_INSTRUCTIONS.md)** - 初回セットアップ手順

📗 **[SUPABASE_MIGRATION_GUIDE.md](./SUPABASE_MIGRATION_GUIDE.md)** - 移行ガイド（詳細版）

### クイックスタート

```bash
# 1. Supabaseプロジェクトを作成
# https://supabase.com でプロジェクト作成

# 2. データベーススキーマを適用
# Supabase Studio > SQL Editor で以下を実行:
# - supabase/01_schema.sql
# - supabase/02_rls_policies.sql
# - supabase/03_functions.sql
# - supabase/04_storage_setup.sql

# 3. 設定ファイルを更新
# frontend/js/config.js でSupabase URLとAPIキーを設定

# 4. ローカルでテスト
cd frontend
npx http-server -p 8080

# 5. ブラウザでアクセス
# http://localhost:8080
```

## 📁 ディレクトリ構成

```
code/
├── supabase/                    # Supabaseスキーマとポリシー
│   ├── 01_schema.sql           # テーブル定義
│   ├── 02_rls_policies.sql     # Row Level Security設定
│   ├── 03_functions.sql        # PostgreSQL関数とトリガー
│   └── 04_storage_setup.sql    # ストレージ設定
│
├── frontend/                    # フロントエンド
│   ├── index.html              # メインHTML
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── config.js           # 設定（Supabase URL/Key）
│       ├── supabase-client.js  # Supabaseクライアント
│       ├── api.js              # API通信（Supabase版）
│       ├── auth.js             # 認証処理
│       ├── dashboard.js        # ダッシュボード
│       ├── project.js          # プロジェクト管理
│       ├── editTime.js         # 編集時間登録
│       ├── approval.js         # 承認処理
│       └── utils.js            # ユーティリティ
│
├── .env.example                # 環境変数テンプレート
├── .gitignore
├── README.md                   # 旧版README（GAS版）
├── README_SUPABASE.md          # このファイル（Supabase版）
├── SUPABASE_SETUP_INSTRUCTIONS.md  # セットアップ手順
└── SUPABASE_MIGRATION_GUIDE.md     # 移行ガイド
```

## 🔧 開発

### ローカル開発サーバーの起動

```bash
cd frontend
npx http-server -p 8080
```

### デプロイ

GitHub Pagesへの自動デプロイ:

```bash
git add .
git commit -m "Update application"
git push origin main
```

## 🗄️ データベース構成

### テーブル一覧

1. **users** - ユーザーマスタ
2. **clients** - クライアントマスタ
3. **genres** - ジャンルマスタ
4. **technologies** - 使用技術マスタ
5. **estimate_items** - 見積項目マスタ
6. **edit_items** - 編集作業項目マスタ
7. **projects** - 案件マスタ
8. **estimate_breakdown** - 見積内訳
9. **edit_history** - 編集履歴
10. **leader_evaluation** - リーダー評価
11. **notifications** - 通知履歴

### 主要な関数

- `calculate_target_hours()` - 編集目標時間の自動計算
- `calculate_actual_hours()` - 実働編集時間の自動計算
- `calculate_actual_cost()` - 実働編集費の自動計算
- `submit_project()` - 案件申請処理
- `approve_project_by_leader()` - リーダー承認処理
- `reject_project_by_leader()` - リーダー差戻処理

## 🔐 セキュリティ

### Row Level Security (RLS)

すべてのテーブルでRLSが有効化されており、ユーザーの権限に応じたデータアクセス制御を実装しています。

### 認証

Supabase Authによる JWT認証を使用しています。

## 👥 ユーザー権限

- **アルバイト (part_time)**: 自分の案件の閲覧・編集時間登録
- **スタッフ (staff)**: 案件登録、クライアント追加
- **リーダー (leader)**: 案件承認、全案件閲覧
- **役員 (executive)**: 最終承認、全機能アクセス

## 📝 ライセンス

Private - 社内専用

## 📞 サポート

問題が発生した場合は、以下のドキュメントを参照してください:

- [トラブルシューティング](./SUPABASE_MIGRATION_GUIDE.md#サポートとトラブルシューティング)
- [FAQ](./SUPABASE_MIGRATION_GUIDE.md)

---

**Version**: 3.0.0 (Supabase版)
**Last Updated**: 2026-01-03
