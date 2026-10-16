// 型の見分け(index.html の <script id="core">)の検算。実行: node source/run-checks.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script id="core">([\s\S]*?)<\/script>/)[1];
const ctx = {}; vm.createContext(ctx); vm.runInContext(src + ';this.X=PP;', ctx); const X = ctx.X;
let n = 0, f = 0; const J = v => JSON.stringify(v);
const eq = (a, b, m) => { n++; if (J(a) !== J(b)) { f++; console.log('NG', m, J(a), '!=', J(b)); } };
const tr = (c, m) => eq(!!c, true, m);
const A = t => X.analyze(t);
const hooks = t => A(t).hooks;
const has = (t, h, m) => tr(hooks(t).includes(h), (m || t) + ' → ' + h + ' が出る (実際: ' + J(hooks(t)) + ')');
const not = (t, h, m) => tr(!hooks(t).includes(h), (m || t) + ' → ' + h + ' が出ない (実際: ' + J(hooks(t)) + ')');
const ct = t => A(t).closeType;
const bases = t => A(t).lines.map(l => l.base);

// S1 書き出しの型
has('3つのコツ', '数字'); has('4選', '数字'); has('4選', '予告'); has('50%オフの話', '数字'); has('３ヶ月続けた', '数字');
has('副業を始めて3ヶ月で気づいた4つのこと', '数字'); has('副業を始めて3ヶ月で気づいた4つのこと', '予告');
has('1,000円の話', '数字'); has('3.5倍になった', '数字'); has('三つの理由', '数字'); has('10人が見た', '数字'); has('3日間やってみた', '数字');
not('10月15日に開催', '数字', '日付(月日)'); not('2026年の話', '数字', '4桁の年'); not('2026/10/15の話', '数字', '日付スラッシュ'); not('10/15の話', '数字', 'm/d');
not('見て https://example.com/3つ', '数字', 'URL内');
has('本当ですか', '問いかけ'); has('本当？', '問いかけ'); has('どう思う?', '問いかけ'); has('どう思いますか？😀', '問いかけ', '？の後ろの絵文字'); not('今日は休みです', '問いかけ');
has('正直しんどい', '共感'); has('実は悩んでいました', '共感'); has('ぶっちゃけ難しい', '共感');
has('昨日、私は走った', '体験'); has('今日は休みました', '体験'); not('先月の話です', '体験', '時間語だけ(自分語なし)'); not('昨日は晴れ', '体験');
has('方法をまとめました', '予告'); has('理由は2つ', '予告', '理由'); has('5選', '予告'); not('選んだ', '予告', '「選」だけでは予告にしない');
eq(hooks('こんにちは'), [], 'どれにも当てはまらない');
eq(hooks('3つのコツは？').slice(0, 2), ['数字', '問いかけ'], '主な型の順 数字>問いかけ');
eq(A('').empty, true, 'S1 空'); eq(A('   \n 　 ').empty, true, 'S1 空白だけ'); eq(A(null).empty, true, 'S1 null'); eq(A(undefined).empty, true, 'S1 undefined');
eq(A('\n\n\nはじめ').lines[3].open, true, 'S1 先頭の空行は飛ばして最初の非空行が書き出し'); eq(A('\n\n\nはじめ').lines.filter(l => l.open).length, 1, 'S1 書き出しは1行だけ');

// S2 締めの型
eq(ct('導入\n最後に試してみてください'), '呼びかけ', 'S2 呼びかけ'); eq(ct('導入\nどうですか？'), '問いかけ', 'S2 問い');
eq(ct('導入\nありがとう'), 'ひとこと', 'S2 ひとこと'); eq(ct('導入\n' + 'あ'.repeat(21)), '決められない', 'S2 21字→決められない'); eq(ct('導入\n' + 'あ'.repeat(20)), 'ひとこと', 'S2 20字→ひとこと');
eq(ct('導入\n詳細はこちら👇'), 'リンク誘導', 'S2 こちら👇'); eq(ct('導入\n詳しくは https://x.example/a'), 'リンク誘導', 'S2 文+URL');
eq(ct('導入\nどうですか？\n#a #b'), '問いかけ', 'S2 末尾のタグ行は飛ばす'); eq(ct('導入\nどうですか？\nhttps://x.example/a'), '問いかけ', 'S2 末尾のURLだけの行は飛ばす');
eq(ct('#a #b'), 'タグで終わる', 'S2 タグだけ'); eq(ct('https://x.example/a'), 'リンク誘導', 'S2 URLだけ');
eq(A('ひとこと\n#a').lines.map(l => [l.open, l.close]), [[true, true], [false, false]], 'S2 書き出しと締めが同じ行');
eq(A('導入\nどうですか？\n#a').lines.map(l => [l.open, l.close]), [[true, false], [false, true], [false, false]], 'S2 書き出し・締め・タグ');

// S3 行の役割と優先順
eq(bases('#2025 #a'), ['tag'], 'S3 タグの行(数字入りでもタグ)'); eq(bases('https://x.example/2026'), ['link'], 'S3 URLの行(数字入りでもリンク)');
eq(bases('どうですか？'), ['q'], 'S3 問い'); eq(bases('3個ある'), ['num'], 'S3 数字'); eq(bases('ふつう'), ['body'], 'S3 本文'); eq(bases('a\n\nb'), ['body', 'blank', 'body'], 'S3 空行');
eq(bases('3個あるか？'), ['q'], 'S3 問い>数字'); eq(bases('10月15日に会う'), ['body'], 'S3 日付だけの行は数字を含む行にしない');
eq(A('3個と10月15日').lines[0].marks, [[0, 2]], 'S3 印は数字(＋単位)のみ・日付は除く'); eq(A('1,000円と2.5倍').lines[0].marks, [[0, 6], [7, 11]], 'S3 印: 1,000円 と 2.5倍');
eq(A('abc 12 def').lines[0].marks, [[4, 6]], 'S3 単位なしの数字にも印'); eq(A('#3つ').lines[0].marks, [], 'S3 タグ行には印を付けない');
eq(A('tag #a と #b').metrics.tags, 2, 'S3 本文中のタグ'); eq(A('見て https://x.example/a#frag').metrics.tags, 0, 'S3 URLの#はタグではない');

// S4 数え方・長さ・位置
eq(A('あ'.repeat(140)).metrics.units, 280, 'S4 140字=280'); eq(A('a'.repeat(280)).metrics.units, 280, 'S4 半角280'); eq(A('😀').metrics.units, 2, 'S4 絵文字=2'); eq(A('😀').metrics.chars, 1, 'S4 絵文字は1字');
eq(A('ab\ncd').metrics.units, 5, 'S4 改行も数える'); eq(A('a b').metrics.units, 3, 'S4 空白も数える');
eq(A('ab\n\ncd\nef').metrics.paras, 2, 'S4 段落数'); eq(A('ab\n\ncd\nef').metrics.lines, 3, 'S4 行数(空行を除く)'); eq(A('ab\n\ncdef\ng').metrics.longest, 4, 'S4 一番長い行');
eq(A('本文 #a\nb\n#c').metrics.tagPos, '本文中と末尾', 'S4 タグ位置:両方'); eq(A('b\n#c #d').metrics.tagPos, '末尾', 'S4 タグ位置:末尾'); eq(A('#a\nb').metrics.tagPos, '本文中', 'S4 タグ位置:本文中(先頭)'); eq(A('b').metrics.tagPos, 'なし', 'S4 タグ位置:なし');
eq(A('b\n#c #d').metrics.tags, 2, 'S4 タグの数'); eq(A('a😀😀b🎉').metrics.emoji, 3, 'S4 絵文字の数'); eq(A('見て https://x.example/a と https://y.example/b').metrics.urls, 2, 'S4 リンクの数');
const corpusPath = path.join(__dirname, 'corpus.json');
if (fs.existsSync(corpusPath)) { const corp = JSON.parse(fs.readFileSync(corpusPath, 'utf8')); corp.forEach((c, i) => eq(X.units(c.s), c.u, 'S4 Python一致 #' + i + ' ' + c.s.slice(0, 12))); console.log('corpus', corp.length); }

// S5 骨組み
eq(A(X.SAMPLE1).hooks, ['数字', '予告'], 'S5 サンプル1の書き出し'); eq(A(X.SAMPLE1).closeType, '問いかけ', 'S5 サンプル1の締め');
eq(A(X.SAMPLE1).skeleton, '数字＋予告で始める → 空行 → 本文3行 → 空行 → 問いで締める → タグ2個', 'S5 サンプル1の骨組み');
eq(A(X.SAMPLE2).hooks, ['共感'], 'S5 サンプル2の書き出し'); eq(A(X.SAMPLE2).closeType, 'ひとこと', 'S5 サンプル2の締め');
eq(A(X.SAMPLE2).skeleton, '共感で始める → 本文3行 → ひとことで締める → タグ1個', 'S5 サンプル2の骨組み');
eq(A('一行だけ').skeleton, '書き出しの型は決められない → 1行だけ', 'S5 1行だけ');
eq(A('#a #b').skeleton, '書き出しの型は決められない → 1行だけ', 'S5 タグだけ(1行)');
eq(A('3つの話\nhttps://x.example/a\n#a').skeleton, '数字で始める（同じ行でひとことで締める） → リンク1件 → タグ1個', 'S5 同じ行が書き出しと締めを兼ねる・リンク行・タグ行');
eq(A(X.SAMPLE1).skeleton === A(X.SAMPLE1).skeleton, true, 'S5 決定的');
// 貼った文の語句が骨組みに入らない
const W1 = ['ゼッタイユニーク', 'ヒミツノ合言葉', 'QZXQZX', 'ﾎﾞｲｽ', '薔薇', 'wxyz'];
const text5 = W1[0] + 'の3つのコツ\n' + W1[1] + '\n\n' + W1[2] + ' ' + W1[3] + '\n' + W1[4] + 'を見て\n' + W1[5] + 'ですか？\nhttps://x.example/' + W1[0] + '\n#' + W1[1] + ' #' + W1[2];
const sk5 = A(text5).skeleton; W1.forEach(w => tr(!sk5.includes(w), 'S5 骨組みに「' + w + '」が入らない: ' + sk5));
tr(!/undefined|null|NaN|[{}]/.test(sk5), 'S5 骨組みに変な文字が残らない: ' + sk5);
console.log('骨組み例:', sk5, '/', A('3つの話\nhttps://x.example/a\n#a').skeleton);

// S6 異常系・ゆらぎ
const rnd = (() => { let s = 12345; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
const pool = ['あ', 'ア', 'a', 'Z', '1', '２', '？', '?', '！', '。', '、', '#', '＃', '#tag', 'https://x.example/a', ' ', '　', '\n', '\n', '\n\n', '😀', '👍', '🇯🇵', 'は', 'です', 'ました', '正直', '3つ', '10月15日', '2026年', '<script>', '<img src=x onerror=1>', '"', "'", '\\', '\r', '\r\n', '\t', '‍', '️', 'ｱ', '（', '）', '「', '」'];
let bad = 0;
for (let k = 0; k < 3000; k++) {
  let t = ''; const L = 1 + Math.floor(rnd() * 40); for (let i = 0; i < L; i++) t += pool[Math.floor(rnd() * pool.length)];
  let r; try { r = A(t); } catch (e) { bad++; console.log('NG 例外', J(t), e.message); continue; }
  if (r.empty) { if (t.replace(/\s+/g, '') !== '') { bad++; console.log('NG 空扱い', J(t)); } continue; }
  if (r.lines.length !== t.replace(/\r\n?/g, '\n').split('\n').length) { bad++; console.log('NG 行数', J(t)); }
  if (r.lines.filter(l => l.open).length !== 1) { bad++; console.log('NG 書き出しが1行でない', J(t)); }
  if (r.lines.filter(l => l.close).length > 1) { bad++; console.log('NG 締めが2行以上', J(t)); }
  if (/undefined|null|NaN|[{}]/.test(r.skeleton) || r.skeleton === '' || /(^| → ) → /.test(r.skeleton) || /→ $/.test(r.skeleton)) { bad++; console.log('NG 骨組み', J(t), r.skeleton); }
  r.lines.forEach(l => l.marks.forEach(m => { if (!(m[0] >= 0 && m[1] > m[0] && m[1] <= l.raw.length)) { bad++; console.log('NG 印の範囲', J(t)); } }));
}
n += 3000; f += bad;
const big = 'あ'.repeat(5000); eq(A(big).truncated, false, 'S6 5000字は切らない'); eq(A(big).metrics.chars, 5000, 'S6 5000字');
const huge = 'あ'.repeat(9000); eq(A(huge).truncated, true, 'S6 9000字は切る'); eq(A(huge).metrics.chars, X.MAXC, 'S6 切った後は8000字');
eq(A('<script>alert(1)</script>').lines[0].raw, '<script>alert(1)</script>', 'S6 そのまま保持(表示側でtextContent)');
eq(A('\n\n\n').empty, true, 'S6 改行だけ');
eq(A('😀'.repeat(200)).metrics.emoji, 200, 'S6 絵文字だらけ');

// S8 保存系を使っていない（画面側。クリップボード書き込みは骨組みのコピーにだけ使う）
const pre = html.slice(0, html.indexOf('cloudflareinsights'));
['localStorage', 'sessionStorage', 'indexedDB', 'download', 'navigator.share', 'toDataURL', 'createObjectURL', 'fetch(', 'XMLHttpRequest', 'innerHTML', 'eval(', 'document.write', 'insertAdjacentHTML'].forEach(w => tr(!pre.includes(w), 'S8 使っていない: ' + w));
tr((pre.match(/clipboard/g) || []).length === 3, 'S8 clipboard は骨組みのコピーの行だけ: ' + (pre.match(/clipboard/g) || []).length);
tr(!/href="#"|href="https?:\/\/(bit\.ly|forms\.gle|lin\.ee|goo\.gl|t\.co)/.test(html), 'S8 href="#"・短縮URLなし');
tr(/mw-footer/.test(html) && /みちAIワークス/.test(html), 'S8 素性表記フッタ');
const visible = html.replace(/<style[\s\S]*?<\/style>/, '').replace(/<script id="core">[\s\S]*?<\/script>/, '');
['バズる', '刺さる', '伸びる', '神', '正解', '診断', '分析', '完璧', '安心', '勝てる'].forEach(w => tr(!visible.includes(w), 'S8 禁止語なし: ' + w));
console.log(`${n - f}/${n} passed`); process.exit(f ? 1 : 0);
