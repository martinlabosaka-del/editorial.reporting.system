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
| 4 | `migrations/017_fix_rls_policies.sql` | 2026-01-06 |
| 5 | `migrations/018_add_editor_admin_flags_to_registration.sql` | 2026-01-08 |
| 6 | `16_add_affiliations_teams.sql` 〜 `20_add_milestone_memo.sql` | 2026-02-12〜13 |
| 7 | `migrations/019_secure_user_registration.sql` | 2026-08-11 |

`00_setup_all.sql` は `01`〜`05` をまとめた初期構築用です。
新規構築では `00` のみ、既存DBへは `01` 以降を個別に適用します。

`check_*.sql` は適用用ではなく、状態確認のための読み取り専用クエリ集です。

## 今後のルール

新しいSQLは **`migrations/` に3桁番号** で追加してください（次は `020_`）。
`supabase/` 直下の2桁番号は追加しません。

## 既知の注意点

`migrations/017_fix_rls_policies.sql` は `projects` / `edit_history` /
`estimate_breakdown` / `completed_urls` に `USING (true) WITH CHECK (true)` の
ポリシーを追加しています。PostgreSQL の permissive ポリシーは OR で結合されるため、
`02_rls_policies.sql` の細かい制限は事実上無効化されています
（＝ログイン済みなら誰でも全案件を更新できる状態）。

これは `02_rls_policies.sql` がアプリの実動作と噛み合っていなかった
（案件の更新を `created_by` にしか許可していないが、実際に編集するのは `main_editor`。
`completed_urls` にはポリシーが1つも無い、など）ことへの暫定対処と思われます。
修正する場合は 017 を消すだけでは動かなくなるため、
ポリシー全体を設計し直す必要があります。
