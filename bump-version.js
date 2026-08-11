#!/usr/bin/env node
/**
 * ブラウザキャッシュ対策：index.html のJS/CSS読み込みにバージョンを付け直す
 *
 * ■ なぜ必要か
 * GitHub Pages は JS/CSS を Cache-Control: max-age=600 で配信するため、
 * 更新をプッシュしても各利用者のブラウザは最大10分間キャッシュを使い続ける。
 * さらに厄介なことに、ファイルごとにキャッシュの期限が独立しているため、
 * 「新しい index.html ＋ 古い project.js」のようにバージョンが混ざった状態で
 * 動いてしまい、原因の分かりにくい不具合になる。
 *
 * 読み込みURLに ?v=xxxx を付けてバージョンを変えると、ブラウザは
 * 別ファイルとして扱うためキャッシュを無視して取りに行く。
 * index.html とJS/CSSのバージョンが必ず一致するので、混ざった状態にならない。
 *
 * ■ 使い方
 *   node bump-version.js            現在時刻から自動採番（推奨）
 *   node bump-version.js 3.1.0      バージョンを明示して指定
 *
 * 実行後、index.html の差分を確認してコミット・プッシュしてください。
 *
 * ■ 注意
 * index.html 自体も10分キャッシュされるため、全員に行き渡るまで
 * 最大10分かかります。即座に確認したい場合はスーパーリロード
 * （Ctrl+Shift+R / Cmd+Shift+R）を使ってください。
 */

const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, 'index.html');

/**
 * バージョン文字列を決める
 * 引数があればそれを使い、無ければ現在時刻から YYYYMMDDHHmm を生成する
 */
function resolveVersion(arg) {
  if (arg) {
    // URLに乗せるため、扱いに困る文字は弾く
    if (!/^[A-Za-z0-9._-]+$/.test(arg)) {
      console.error('バージョンに使えるのは英数字と . _ - のみです: ' + arg);
      process.exit(1);
    }
    return arg;
  }

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return (
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes())
  );
}

function main() {
  const version = resolveVersion(process.argv[2]);

  if (!fs.existsSync(INDEX_PATH)) {
    console.error('index.html が見つかりません: ' + INDEX_PATH);
    process.exit(1);
  }

  const before = fs.readFileSync(INDEX_PATH, 'utf8');

  // src="js/xxx.js" / href="css/xxx.css" を対象にする。
  // 既に ?v=... が付いていれば置き換える。
  // http(s) で始まる外部CDNのURLは js/ css/ で始まらないため対象外になる。
  const pattern = /(\s(?:src|href)=")((?:js|css)\/[^"?]+)(\?v=[^"]*)?"/g;

  let count = 0;
  const after = before.replace(pattern, (match, attr, filePath) => {
    count++;
    return `${attr}${filePath}?v=${version}"`;
  });

  if (count === 0) {
    console.error('対象のJS/CSS読み込みが見つかりませんでした。index.html を確認してください。');
    process.exit(1);
  }

  if (before === after) {
    console.log(`変更なし（既に ?v=${version} が付いています）`);
    return;
  }

  fs.writeFileSync(INDEX_PATH, after);

  console.log(`バージョンを ?v=${version} に更新しました（${count}ファイル）`);
  console.log('');
  console.log('次の手順:');
  console.log('  git add index.html');
  console.log('  git commit -m "Deploy: キャッシュバージョンを更新"');
  console.log('  git push origin main');
}

main();
