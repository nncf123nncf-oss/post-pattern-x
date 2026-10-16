// 実ブラウザ(Chrome headless / CDP)での検算。実行: node source/e2e.js
const path = require('path'), fs = require('fs');
const { launch } = require('./cdp');
const PAGE = 'file:///' + path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
let n = 0, f = 0;
const ok = (c, m) => { n++; if (!c) { f++; console.log('NG', m); } };
(async () => {
  const b = await launch(9381);
  const setText = t => b.ev(`(()=>{const e=document.getElementById('txt');e.value=${JSON.stringify(t)};e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  const wait = () => b.sleep(260);
  const info = () => b.ev(`(()=>({rows:document.querySelectorAll('#lines li').length, marks:document.querySelectorAll('#lines mark').length, hook:document.getElementById('hookV').textContent, close:document.getElementById('closeV').textContent, skel:document.getElementById('skel').value, resHidden:document.getElementById('result').hidden, emptyHidden:document.getElementById('empty').hidden, met:document.getElementById('met').textContent, sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, errs:window.__errs||0}))()`);
  await b.open(PAGE, 375, 800, 2, true);
  await b.ev(`window.__errs=0;window.addEventListener('error',()=>window.__errs++);true`);
  let i = await info(); ok(i.resHidden && !i.emptyHidden, 'E1 初期状態は空');
  await b.ev(`document.getElementById('sample1Btn').click()`); await wait(); i = await info();
  ok(!i.resHidden && i.rows === 8, 'E2 サンプル1 8行 ' + i.rows); ok(/数字＋予告/.test(i.hook) && i.close === '問いかけ', 'E2 型の目安 ' + i.hook + '/' + i.close);
  ok(i.skel === '数字＋予告で始める → 空行 → 本文3行 → 空行 → 問いで締める → タグ2個', 'E2 骨組み ' + i.skel); ok(i.marks >= 4, 'E2 数字に印 ' + i.marks);
  ok(i.sw <= i.cw, 'E2 375px 横スクロールなし ' + i.sw + '/' + i.cw);
  ok(/ユニット数193/.test(i.met.replace(/\s+/g, '')) || /193/.test(i.met), 'E3 ユニット数193: ' + i.met);
  await b.ev(`document.getElementById('sample2Btn').click()`); await wait(); i = await info();
  ok(i.hook === '共感' && i.close === 'ひとこと' && i.rows === 6, 'E4 サンプル2 ' + i.hook + '/' + i.close + '/' + i.rows);
  // 役割の文字ラベルが出る(色だけに頼らない)
  const lab = await b.ev(`Array.from(document.querySelectorAll('#lines .bd')).map(e=>e.textContent)`); ok(lab.includes('書き出し') && lab.includes('締め') && lab.includes('タグの行'), 'E5 役割ラベル ' + lab.join(','));
  // 編集に追従
  await setText('3つの話\n\n#a'); await wait(); i = await info(); ok(i.skel.startsWith('数字で始める') && i.rows === 3, 'E6 編集で再計算 ' + i.skel);
  // XSS
  await setText('<img src=x onerror="window.__x=1"><script>window.__x=2<\/script> 3つ'); await wait();
  ok(await b.ev(`window.__x===undefined && document.querySelectorAll('#lines img, #lines script, #result img').length===0`), 'E7 HTMLとして解釈されない');
  ok((await b.ev(`document.getElementById('lines').textContent`)).includes('<img src=x'), 'E7 そのまま文字として表示');
  // コピー
  await setText(fs.readFileSync(path.resolve(__dirname, 'sample1.txt'), 'utf8')); await wait();
  await b.ev(`document.getElementById('copyBtn').click()`); await b.sleep(300);
  const st = await b.ev(`document.getElementById('copyStatus').textContent`); ok(/コピーしました|選択しました/.test(st), 'E8 コピー結果が知らされる: ' + st);
  // 空に戻す
  await b.ev(`document.getElementById('clearBtn').click()`); await wait(); i = await info(); ok(i.resHidden && !i.emptyHidden && i.skel === '', 'E9 消す');
  // 異常系の画面
  const big = 'あ'.repeat(9000); await setText(big); await wait(); i = await info(); ok(!i.resHidden && !(await b.ev(`document.getElementById('trunc').hidden`)), 'E10 9000字で切った案内');
  await setText('あ'.repeat(5000)); await wait(); i = await info(); ok(await b.ev(`document.getElementById('trunc').hidden`), 'E10 5000字は案内なし');
  const dur = await b.ev(`new Promise(r=>{const s=performance.now();const e=document.getElementById('txt');e.value=${JSON.stringify('3つの話\n' + 'あ。\n'.repeat(1500))};e.dispatchEvent(new Event('input',{bubbles:true}));const iv=setInterval(()=>{if(document.querySelectorAll('#lines li').length>1000){clearInterval(iv);r(performance.now()-s)}},5);setTimeout(()=>r(-1),3000)})`);
  console.log('1500行: 入力→一覧 約', Math.round(dur), 'ms（debounce 120ms 込み）'); ok(dur > 0 && dur < 1000, 'E10 1秒未満 ' + dur);
  // 横スクロール(極端な入力)
  for (const [name, t] of [['全文URL', 'https://' + 'a'.repeat(120) + '.example/' + 'b'.repeat(120)], ['半角カナ', 'ｱ'.repeat(300)], ['絵文字', '😀'.repeat(200)], ['長い語', 'あ'.repeat(400)], ['長いタグ', '#' + 'a'.repeat(150)], ['2000字の複数行', ('これは行です\n').repeat(200)]]) {
    await setText(t); await wait(); i = await info(); ok(i.sw <= i.cw, 'E11 横スクロールなし: ' + name + ' ' + i.sw + '/' + i.cw);
  }
  ok((await info()).errs === 0, 'E12 JSエラーなし');
  // ダーク
  await b.open(PAGE, 375, 800, 2, true, 'dark'); await b.ev(`document.getElementById('sample1Btn').click()`); await wait();
  const dk = await b.ev(`(()=>{const q=s=>getComputedStyle(document.querySelector(s));return {body:q('body').backgroundColor, row:q('#lines .r-open').backgroundColor, rowInk:q('#lines .r-open .tx').color, mark:q('#lines mark').color}})()`);
  console.log('dark', JSON.stringify(dk)); ok(dk.body !== 'rgb(245, 246, 241)', 'E13 ダークが効く');
  // コントラスト比(ライト・ダーク × 役割行・ボタン)
  async function contrasts(scheme) {
    await b.open(PAGE, 375, 800, 2, true, scheme); await setText(['3つのコツ', '普通の行', '途中の問いですか？', '10分かかる行', '試してみてください', 'https://x.example/a', '#a #b'].join('\n')); await wait();
    return b.ev(`(()=>{
      const lum=c=>{const m=c.match(/[\\d.]+/g).map(Number);const a=m.slice(0,3).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]};
      const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
      const out={};
      const pairs=[['.rl.r-open .tx','.rl.r-open'],['.rl.r-num .tx','.rl.r-num'],['.rl.r-q .tx','.rl.r-q'],['.rl.r-close .tx','.rl.r-close'],['.rl.r-tag .tx','.rl.r-tag'],['.rl.r-body .tx','.rl.r-body'],['.rl.r-link .tx','.rl.r-link'],['.rl.r-num .ln','.rl.r-num'],['.rl.r-link .ln','.rl.r-link'],['.rl.r-close .ln','.rl.r-close'],['.bd.k-link','.bd.k-link'],['.bd.k-body','.bd.k-body'],['.bd.k-open','.bd.k-open'],['.bd.k-num','.bd.k-num'],['.bd.k-q','.bd.k-q'],['.bd.k-close','.bd.k-close'],['.bd.k-tag','.bd.k-tag'],['button.pri','button.pri'],['.notes','.notes'],['.hint','body']];
      pairs.forEach(([fg,bg])=>{const e=document.querySelector(fg),g=document.querySelector(bg);if(!e||!g){out[fg]=null;return}const fc=getComputedStyle(e).color;let bc=getComputedStyle(g).backgroundColor;if(bc==='rgba(0, 0, 0, 0)')bc=getComputedStyle(document.body).backgroundColor;out[fg+' on '+bg]=Math.round(cr(fc,bc)*100)/100});
      return out})()`);
  }
  for (const sc of ['light', 'dark']) { const c = await contrasts(sc); console.log(sc, JSON.stringify(c)); Object.entries(c).forEach(([k, v]) => ok(v === null ? false : v >= 4.5, 'E14 コントラスト4.5以上 ' + sc + ' ' + k + ' ' + v)); }
  b.close(); console.log(`${n - f}/${n} passed`); setTimeout(() => process.exit(f ? 1 : 0), 300);
})().catch(e => { console.error(e); process.exit(2); });
