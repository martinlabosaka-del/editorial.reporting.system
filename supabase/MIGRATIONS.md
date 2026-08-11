# SQLファイルの適用順について

このディレクトリには **2系統の番号** が混在しています。

- `supabase/NN_*.sql` … 2桁番号（00〜20）
- `supabase/migrations/NNN_*.sql` … 3桁番号（004〜019）

番号が独立しているため `19_add_milestone_confirmed_by.sql` と
`migrations/019_secure_user_registration.sql` のように **同じ番号で別物** が存在します。
番号順に読むと適用順を誤るので注意してください。

## 実際の適用順（git履歴上の追加順）

| 順 | ファイル | 追加日 |
|---|---|---|
| 1 | `00_setup_all.sql` 〜 `15_check_estimate_breakdown.sql` | 2026-01-06 |
| 2 | `migrations/004_*.sql`, `migrations/015_add_leader_comment.sql` | 2026-01-06 |
| 3 | `migrations/016_create_user_registration_function.sql` | 2026-01-06 |
| 4 | ~~`migrations/017_fix_rls_policies.sql`~~（削除済み） | 2026-01-06 |
| 5 | `migrations/018_add_editor_admin_flags_to_registration.sql` | 2026-01-08 |
| 6 | `16_add_affiliations_teams.sql` 〜 `20_add_milestone_memo.sql` | 2026-02-12〜13 |
| 7 | `migrations/019_secure_user_registration.sql` | 2026-08-11 |
| 8 | `migrations/020_fix_rls_policies.sql` | 2026-08-11 |
| 9 | `migrations/021_admin_reset_password.sql` | 2026-08-11 |
| 10 | `migrations/022_add_estimate_grand_total.sql` | 2026-08-11 |

`00_setup_all.sql` は `01`〜`05` をまとめた初期構築用です。
新規構築では `00` のみ、既存DBへは `01` 以降を個別に適用します。

`check_*.sql` は適用用ではなく、状態確認のための読み取り専用クエリ集です。

## 今後のルール

新しいSQLは **`migrations/` に3桁番号** で追加してください（次は `023_`）。
`supabase/` 直下の2桁番号は追加しません。

## 既知の注意点

### RLS は 020 で作り直し、02 に反映済みです

かつて `migrations/017_fix_rls_policies.sql` が `projects` / `edit_history` /
`estimate_breakdown` / `completed_urls` に `USING (true) WITH CHECK (true)` の
ポリシーを追加していました。PostgreSQL の permissive ポリシーは OR で結合されるため、
細かい制限は事実上すべて無効化されていました。

017 がこうなった原因は、旧 `02_rls_policies.sql` がアプリの実動作と噛み合って
いなかったことです（案件の更新を `created_by` にしか許可していないが実際に
編集するのは `main_editor`、`completed_urls` にポリシーが無い、など）。

`migrations/020_fix_rls_policies.sql` で全体を設計し直し、
**`02_rls_policies.sql` もその結果に書き直しました**。017 は役目を終えたため削除しています。

- **新規構築** … `01_schema.sql` → `02_rls_policies.sql` で現行の状態になります
- **既存DB** … 020 適用済みなので追加作業は不要です

現状確認は `supabase/check_rls_policies.sql`（読み取り専用）を SQL Editor で実行してください。

### 03_functions.sql の関数の多くは未使用です

`approve_project_by_leader` などの承認系関数はフロントエンドから呼ばれておらず、
かつ `SECURITY DEFINER` + anon に EXECUTE 付きという危険な状態だったため、
020 で削除しました。現在フロントエンドが使う RPC は
`generate_*`（ID採番）と `register_new_user` のみです。
