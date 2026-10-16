// 投稿カード用の実画面を撮る(Chrome headless / CDP)。実行: node source/shoot.js <出力フォルダ> [YYYY-MM-DD]
const fs = require('fs'), path = require('path');
const { launch } = require('./cdp');
const OUT = path.resolve(process.argv[2]); const DATE = process.argv[3] || '2026-10-17';
const PAGE = 'file:///' + path.resolve(__dirname, '..', 'index.html').split(path.sep).join('/');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await launch(9382);
  const rect = sel => b.ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top+scrollY,bottom:r.bottom+scrollY,left:r.left,right:r.right,h:r.height}})()`);
  // Card1: デスクトップ1000px・2カラム。サンプル1
  await b.open(PAGE, 1000, 1300, 2, false);
  await b.ev(`document.getElementById('sample1Btn').click()`); await b.sleep(400);
  const lay = await rect('.layout'), out = await rect('.a-out'), inp = await rect('.a-in');
  const pl = await b.ev(`(()=>{const r=document.getElementById('lines').parentElement.getBoundingClientRect();const s=document.getElementById('hookV').closest('.panel').getBoundingClientRect();return {sumTop:s.top+scrollY,linesBottom:r.bottom+scrollY}})()`);
  console.log('card1', JSON.stringify({ lay, out, inp, pl }));
  await b.shot(path.join(OUT, '01-desktop-sample1-' + DATE + '.png'), { x: 0, y: Math.max(0, lay.top - 12), width: 1000, height: Math.max(out.bottom, inp.bottom) - lay.top + 8 });
  await b.shot(path.join(OUT, 'source-desktop-full.png'), { x: 0, y: 0, width: 1000, height: await b.ev('document.documentElement.scrollHeight') });
  // Card2: 375px・DPR2。サンプル2(共感・問いなし・タグ1つ)
  await b.open(PAGE, 375, 900, 2, true);
  await b.ev(`document.getElementById('sample2Btn').click()`); await b.sleep(400);
  const r1 = await rect('#result'), sk = await rect('#skel'), btn = await rect('#copyBtn');
  const pl2 = await b.ev(`(()=>{const r=document.getElementById('lines').parentElement.getBoundingClientRect();const s=document.getElementById('hookV').closest('.panel').getBoundingClientRect();return {sumTop:s.top+scrollY,linesBottom:r.bottom+scrollY}})()`);
  console.log('card2', JSON.stringify({ r1, sk, btn, pl2 }));
  await b.shot(path.join(OUT, '02-mobile375-sample2-' + DATE + '.png'), { x: 0, y: r1.top - 8, width: 375, height: btn.bottom - r1.top + 20 });
  await b.shot(path.join(OUT, 'source-mobile375-full.png'), { x: 0, y: 0, width: 375, height: await b.ev('document.documentElement.scrollHeight') });
  b.close(); setTimeout(() => process.exit(0), 300);
})().catch(e => { console.error(e); process.exit(2); });
