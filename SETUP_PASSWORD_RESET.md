# パスワード再設定の設定手順

ログイン画面の「パスワードをお忘れの方」を動かすには、
**Supabase 側の設定が2つ必要**です。コードだけでは動きません。

再設定の経路は2通り用意しています。

| 経路 | 使う人 | 必要な設定 |
|---|---|---|
| メールで本人が再設定 | 全員 | 下記の設定が必要 |
| 管理者が直接リセット | 管理者 | `migrations/021_admin_reset_password.sql` の適用のみ |

管理者リセットだけでも運用は回ります。メール送信の準備が整うまでは、
ログイン画面の案内文（「メールが届かない場合は管理者にご連絡ください」）が
その受け皿になります。

---

## 1. Redirect URL の登録（必須）

Supabase ダッシュボード → **Authentication** → **URL Configuration**

- **Site URL**: `https://martinlabosaka-del.github.io/editorial.reporting.system/`
- **Redirect URLs** に同じURLを追加

ここに登録されていないURLへはリダイレクトされず、
メールのリンクを踏んでもエラー画面になります。

> フロントエンドは `window.location.origin + window.location.pathname` を
> リダイレクト先として送ります（`js/auth.js` の `getPasswordResetRedirectUrl()`）。
> 独自ドメインを設定した場合や、ローカルで動作確認する場合
> （例: `http://localhost:5500/`）は、そのURLも Redirect URLs に追加してください。

## 2. SMTP の設定（実質必須）

Supabase ダッシュボード → **Project Settings** → **Authentication** → **SMTP Settings**

**Supabase 内蔵のメール送信は本番運用に使えません。** 制限は2つあります。

1. **1時間あたり2通**まで
2. **Supabase プロジェクトのチームメンバーのアドレスにしか送れない**
   それ以外の宛先は `Email address not authorized` で失敗します

> Unless you configure a custom SMTP server for your project, Supabase Auth will
> refuse to deliver messages to addresses that are not part of the project's team.
> （[Supabase公式ドキュメント](https://supabase.com/docs/guides/auth/auth-smtp)）

### 「チームメンバー」と「アプリの利用者」は別物です

ここを混同しやすいので注意してください。

| | Supabase プロジェクトメンバー | アプリの利用者 |
|---|---|---|
| 正体 | Supabaseダッシュボードにログインできる人 | 編集報告システムにログインする人 |
| 実体 | Organization に招待されたアカウント | `auth.users` / `users` のレコード |
| できること | 課金設定・SQL Editor・RLS変更 | 案件登録・編集時間登録・承認 |
| 人数 | 1〜3名（運用担当） | 20名程度（編集者・リーダー・役員） |

**アプリの利用者を増やしてもプロジェクトメンバーは増えません。**
また、メールを届かせるためにアプリ利用者をプロジェクトメンバーに
招待するのは絶対にやめてください。DB全体を操作できてしまいます。

つまりSMTPを設定しない限り、一般の編集者にはパスワード再設定メールが
1通も届きません。

### 対応

Resend、SendGrid、Amazon SES などの外部SMTPを設定してください。
20名規模なら無料枠で十分です（例: Resend は月3,000通・1日100通まで無料）。

設定後、**Authentication → Rate Limits** の
「Rate limit for sending emails」も必要に応じて調整してください
（内蔵サービスの2通/時はSMTP設定後に解除されます）。

## 3. メール文面の日本語化（任意）

Supabase ダッシュボード → **Authentication** → **Email Templates** → **Reset Password**

既定の文面は英語です。日本語にする場合の例:

```
件名: 【編集報告システム】パスワード再設定のご案内

本文:
<h2>パスワード再設定のご案内</h2>
<p>下記のリンクからパスワードを再設定してください。</p>
<p><a href="{{ .ConfirmationURL }}">パスワードを再設定する</a></p>
<p>このリンクの有効期限は1時間です。</p>
<p>心当たりのない場合は、このメールを破棄してください。</p>
```

`{{ .ConfirmationURL }}` は必ず残してください。

---

## 動作確認

1. ログイン画面 →「パスワードをお忘れの方」
2. メールアドレスを入力して送信
3. 届いたメールのリンクを開く → 「新しいパスワードの設定」画面が出る
4. 新しいパスワードを設定 → ログイン画面に戻る
5. 新しいパスワードでログインできることを確認

### 送信しても届かないとき

- **登録されているメールアドレスが実在するか確認してください。**
  ユーザー登録時に実在しないアドレス（`user@example.com` など）を
  入れていた場合、当然メールは届きません。
  この場合は管理画面からのパスワードリセットを使ってください。

  ```sql
  SELECT u.user_id, u.name, au.email
  FROM users u
  JOIN auth.users au ON au.id = u.auth_user_id
  ORDER BY u.user_id;
  ```

- **SMTP未設定なら、まず上記2を実施してください。**
  未設定の状態では、Supabaseプロジェクトのチームメンバー以外には
  `Email address not authorized` となり1通も届きません。
- 迷惑メールフォルダも確認してください。

### 「リンクの有効期限が切れています」と出るとき

再設定リンクの既定の有効期限は1時間です。
リンクは**1回しか使えない**ため、一度開いたリンクを再度開いた場合も
このメッセージになります。もう一度最初から実行してください。

---

## セキュリティ上の補足

- メールアドレスが未登録でも、画面には「送信しました」と同じ文面を出します。
  どのアドレスが登録済みかを外部に知らせないためです。
  Supabase 側も同様に、未登録アドレスに対してエラーを返しません。

- パスワード再設定の完了後は一時セッションを破棄し、
  ログイン画面に戻して新パスワードでの再ログインを求めます。

- 管理者によるリセット（021）では、`auth.refresh_tokens` を削除して
  対象ユーザーの既存ログイン状態を無効化します。
