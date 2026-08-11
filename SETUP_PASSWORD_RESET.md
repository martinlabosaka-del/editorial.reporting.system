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

Resend を使う場合の具体的な手順は下記「2-A」を参照してください。

設定後、**Authentication → Rate Limits** の
「Rate limit for sending emails」も必要に応じて調整してください
（内蔵サービスの2通/時はSMTP設定後に解除されます）。

---

## 2-A. Resend を外部SMTPとして設定する

### ⚠️ 前提: 独自ドメインが必須です

**Resend でメールを送るには、自分が所有するドメインの登録と
DNS認証が必要です。** 公式ドキュメントに明記されています。

> You must add and verify at least one domain to send emails with Resend.
> （[Verified Domains](https://resend.com/docs/dashboard/domains/introduction)）

Resend の初期画面に出てくる送信元 `onboarding@resend.dev` は
**テスト専用**で、**Resendアカウントに登録したメールアドレス宛にしか
送信できません。** それ以外の宛先は 403 エラーになります。
（[403 Error Using resend.dev Domain](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)）

つまり `onboarding@resend.dev` のままだと、
`martinlab.osaka@gmail.com` にしかメールが届きません。
**Supabase内蔵SMTPと全く同じ制約に引っかかります。**
外部SMTPに乗り換える意味が無くなるので、必ずドメインを用意してください。

**gmail.com のような他人のドメインは認証できません**
（DNSレコードを設定できないため）。会社で所有しているドメインを使うか、
無ければ取得してください（年1,000〜2,000円程度）。

ドメインを用意できない場合は、メール経路は諦めて
`migrations/021_admin_reset_password.sql` の管理者リセットで運用してください。
20名規模なら十分に回ります。

### 手順1: ドメインを追加してDNSを認証する

1. Resend → **Domains** → **Add Domain**
2. ドメイン名を入力
   - **ルートドメインではなくサブドメインを推奨**（例: `send.example.com`）
   - 送信の評判をコーポレートサイトのメールと分離できるため
3. リージョンを選ぶ（日本からなら Tokyo が近いですが、どこでも動きます）
4. 表示された DNS レコードを、ドメインを管理しているDNS
   （お名前.com、Cloudflare、Route 53 など）に登録する

登録するのは次の3種類です。値は Resend の画面に表示されたものを使ってください。

| 種別 | 用途 |
|---|---|
| **MX** | バウンス・苦情の受信（`feedback-smtp.<region>.amazonses.com`） |
| **TXT (SPF)** | 送信元サーバーの認証（`v=spf1 include:amazonses.com ~all`） |
| **TXT (DKIM)** | 電子署名（`resend._domainkey` に長い公開鍵） |

5. **Verify** を押して認証されるのを待つ（数分〜最大48時間、通常は数分）

> **よくある失敗**: MXレコードの値が
> `feedback-smtp.us-east-1.amazonses.com.example.com` のように
> 自ドメインが後ろに付いてしまう場合は、値の末尾にピリオド `.` を付けて
> `feedback-smtp.us-east-1.amazonses.com.` としてください。
> 末尾のピリオドが「これは完全修飾名なので加工するな」という意味になります。
> （[What if my domain is not verifying?](https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying)）

### 手順2: API キーを発行する

1. Resend → **API keys** → **Create API Key**
2. 権限は **Sending access** で十分（Full access は不要）
3. 表示された `re_` で始まるキーをコピー
   **この画面を閉じると二度と表示されません。** 必ず控えてください

### 手順3: Supabase に SMTP を設定する

Supabase ダッシュボード → **Project Settings** → **Authentication**
→ **SMTP Settings** → **Enable Custom SMTP** をオン

| 項目 | 設定値 |
|---|---|
| Sender email | `noreply@send.example.com`（**認証したドメインのアドレス**） |
| Sender name | `編集報告システム` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend`（固定文字列。メールアドレスではありません） |
| Password | 手順2で発行した APIキー（`re_...`） |

（[Send with SMTP](https://resend.com/docs/send-with-smtp)）

ポートは `465` / `2465` が暗号化必須（implicit TLS）、
`25` / `587` / `2587` が平文開始→暗号化（STARTTLS）です。
**Supabase からは `465` を推奨**します。

> **Username を間違えやすいので注意。**
> メールアドレスではなく、`resend` という固定の文字列です。

> **Sender email は必ず認証済みドメインのアドレスにしてください。**
> gmail.com などのアドレスを入れると送信が拒否されます。
> 受信は不要なので、実在しない `noreply@` で構いません。

### 手順4: 動作確認

Supabase の SMTP 設定画面で保存した後、
アプリのログイン画面 →「パスワードをお忘れの方」から
**自分以外のメールアドレス**で試してください。
自分のアドレスだけだと、resend.dev の制約に引っかかっているのか
正しく動いているのかが区別できません。

送信の成否は Resend → **Logs** で確認できます。
ここに記録が無ければ Supabase から送信自体が行われていません
（SMTP設定の誤り）。記録があって届いていなければ受信側の問題です
（迷惑メール振り分けなど）。

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
