# データベースマイグレーションについて

SQLの適用は **GitHub Actions で自動化されています**。
SQL Editor に手でコピペする運用は終了しました。

初期設定は 2026-08-12 に完了しています。
環境を作り直す場合の手順は [`SETUP_AUTO_MIGRATE.md`](./SETUP_AUTO_MIGRATE.md) を参照してください。

## ディレクトリの役割

| 場所 | 中身 | 自動適用 |
|---|---|---|
| `migrations/` | スキーマ・データの変更 | **される** |
| `queries/` | 状態確認用の読み取り専用クエリ | されない |
| `archive/` | 役目を終えたファイル | されない |
| `BASELINE.sql` | 台帳の初期登録（一度きり・手動・適用済み） | されない |
| `SETUP_AUTO_MIGRATE.md` | 自動適用の初期設定手順 | — |

## 新しいSQLを追加する手順

1. `migrations/` に **`YYYYMMDDHHMMSS_説明.sql`** の名前で作る
   例: `20260815093000_add_milestone_revision_count.sql`
   ローカルに Supabase CLI があれば `supabase migration new 説明` で雛形が作れます。
2. プルリクエストを出す
   → CI が `--dry-run` を実行し、何が流れるかがログに出ます
3. `main` にマージ
   → GitHub Actions が `production` 環境の**承認待ちで止まります**
4. Actions の画面で承認
   → 未適用のものだけが順に適用されます

**ファイル名の日時が適用順です。** 必ず「今の時刻」で作ってください。
既に適用済みのものより古い日時を付けると CI が失敗します
（順番の取り違えに気づくための仕様です）。

## 適用済みかどうかはどこを見るか

DB 側の `supabase_migrations.schema_migrations` テーブルが台帳です。
このドキュメントの表ではなく、**そちらが正**です。

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

---

## 過去の経緯（2026-08-12 の整理）

以前は `supabase/NN_*.sql`（2桁）と `supabase/migrations/NNN_*.sql`（3桁）の
**2系統の番号が混在**していました。番号が独立しているため
`19_add_milestone_confirmed_by.sql` と `migrations/019_secure_user_registration.sql`
のように同じ番号で別物が存在し、番号順に読むと適用順を誤る状態でした。

自動化にあたり、全て `migrations/` に14桁のタイムスタンプで統合しました。
**元の番号はファイル名の中に残してあります**（`20260213120921_19_add_milestone_confirmed_by.sql`）。
過去のドキュメントやコミットログとの突き合わせ用です。

### 旧ファイル名との対応

適用順は git 履歴の追加順から復元しました。
2026-01-06 に一括で取り込まれた分は、日時が同一で順序を復元できないため、
`00〜15` → `migrations/004〜016` の順（当時のドキュメント記載順）で
1分刻みの仮の時刻を振っています。すべて適用済みで再実行されないため、
この仮の並びが実害を生むことはありません。

| 現在のファイル | 旧 |
|---|---|
| `20260106120100_01_schema.sql` | `01_schema.sql` |
| `20260106120200_02_rls_policies.sql` | `02_rls_policies.sql` |
| `20260106120300_03_functions.sql` | `03_functions.sql` |
| `20260106120400_04_storage_setup.sql` | `04_storage_setup.sql` |
| `20260106120500_05_initial_data.sql` | `05_initial_data.sql` |
| `20260106120600_06_fix_estimate_breakdown.sql` | `06_fix_estimate_breakdown.sql` |
| `20260106120700_06_fix_estimate_breakdown_v2.sql` | `06_fix_estimate_breakdown_v2.sql` |
| `20260106120800_07_add_missing_functions.sql` | `07_add_missing_functions.sql` |
| `20260106120900_08_add_main_editor_message.sql` | `08_add_main_editor_message.sql` |
| `20260106121000_09_add_estimate_and_delivery_columns.sql` | `09_add_estimate_and_delivery_columns.sql` |
| `20260106121100_10_storage_setup.sql` | `10_storage_setup.sql` |
| `20260106121200_11_add_admin_flag.sql` | `11_add_admin_flag.sql` |
| `20260106121300_12_add_editor_flag.sql` | `12_add_editor_flag.sql` |
| `20260106121400_13_fix_edit_time_references.sql` | `13_fix_edit_time_references.sql` |
| `20260106121500_14_fix_estimate_breakdown_column.sql` | `14_fix_estimate_breakdown_column.sql` |
| `20260106121700_004_fix_edit_history_structure.sql` | `migrations/004_fix_edit_history_structure.sql` |
| `20260106121800_004_rename_edit_item_to_estimate_item.sql` | `migrations/004_rename_edit_item_to_estimate_item.sql` |
| `20260106121900_015_add_leader_comment.sql` | `migrations/015_add_leader_comment.sql` |
| `20260106122000_016_create_user_registration_function.sql` | `migrations/016_create_user_registration_function.sql` |
| `20260108120000_018_add_editor_admin_flags_to_registration.sql` | `migrations/018_add_editor_admin_flags_to_registration.sql` |
| `20260212113851_16_add_affiliations_teams.sql` | `16_add_affiliations_teams.sql` |
| `20260213101030_17_add_project_milestones.sql` | `17_add_project_milestones.sql` |
| `20260213115234_18_add_milestone_types.sql` | `18_add_milestone_types.sql` |
| `20260213120921_19_add_milestone_confirmed_by.sql` | `19_add_milestone_confirmed_by.sql` |
| `20260213164333_20_add_milestone_memo.sql` | `20_add_milestone_memo.sql` |
| `20260811104902_019_secure_user_registration.sql` | `migrations/019_secure_user_registration.sql` |
| `20260811113908_020_fix_rls_policies.sql` | `migrations/020_fix_rls_policies.sql` |
| `20260811120052_021_admin_reset_password.sql` | `migrations/021_admin_reset_password.sql` |
| `20260811152935_022_add_estimate_grand_total.sql` | `migrations/022_add_estimate_grand_total.sql` |
| `20260812102858_023_recalculate_target_hours.sql` | `migrations/023_recalculate_target_hours.sql` |

### 移動したファイル

- `15_check_estimate_breakdown.sql` → `queries/`
  番号が付いていましたが中身は `SELECT` のみの確認用でした。
  `migrations/` に置くと適用対象になってしまうため移しました。
- `migrations/check_edit_history_structure.sql` → `queries/`
- `check_*.sql` → `queries/`
- `00_setup_all.sql` → `archive/`
  `01`〜`05` を束ねた初期構築用でしたが、`migrations/` が
  一本の列になったため役目を終えました。新規構築は
  `migrations/` を頭から流せば同じ状態になります。

### 017 は欠番です

`migrations/017_fix_rls_policies.sql` は 020 で作り直したため削除済みです。
経緯は下の「既知の注意点」を参照してください。

---

## 既知の注意点

### RLS は 020 で作り直し、02 に反映済みです

かつて `017_fix_rls_policies.sql` が `projects` / `edit_history` /
`estimate_breakdown` / `completed_urls` に `USING (true) WITH CHECK (true)` の
ポリシーを追加していました。PostgreSQL の permissive ポリシーは OR で結合されるため、
細かい制限は事実上すべて無効化されていました。

017 がこうなった原因は、旧 `02_rls_policies.sql` がアプリの実動作と噛み合って
いなかったことです（案件の更新を `created_by` にしか許可していないが実際に
編集するのは `main_editor`、`completed_urls` にポリシーが無い、など）。

`020_fix_rls_policies.sql` で全体を設計し直し、
**`02_rls_policies.sql` もその結果に書き直しました**。017 は役目を終えたため削除しています。

現状確認は `queries/check_rls_policies.sql`（読み取り専用）を SQL Editor で実行してください。

### 03_functions.sql の関数の多くは未使用です

`approve_project_by_leader` などの承認系関数はフロントエンドから呼ばれておらず、
かつ `SECURITY DEFINER` + anon に EXECUTE 付きという危険な状態だったため、
020 で削除しました。現在フロントエンドが使う RPC は
`generate_*`（ID採番）と `register_new_user` のみです。

### ロールバックはできません

Supabase CLI に down マイグレーションはありません。
Point-in-Time Recovery も有料プラン限定です。
`UPDATE` / `DELETE` を含むマイグレーションは、
`023` のように「確認クエリ → 適用 → 確認クエリ」の構成で書き、
プルリクの `--dry-run` ログを確認してから承認してください。
