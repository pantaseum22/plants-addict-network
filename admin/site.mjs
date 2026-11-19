export const defaultArticles=[
 {id:1,title:'食虫植物の育て方ガイド',excerpt:'植物との暮らしを楽しむヒント。',body:'',img:'/assets/journal-1.webp',date:''},
 {id:2,title:'3Dプリント鉢のこだわり',excerpt:'機能性と造形の両立を目指して。',body:'',img:'/assets/journal-2.webp',date:''},
 {id:3,title:'イラストに込めた想い',excerpt:'植物の魅力を、別のかたちで。',body:'',img:'/assets/journal-3.webp',date:''}
];
export const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const scriptJSON=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
function text(value,label,max,required=false){if(typeof value!=='string'||value.length>max||(required&&!value.trim()))fail(`${label}を確認してください（最大${max}文字）。`);return value.trim();}
export function validate(input){
 if(!input||!Number.isSafeInteger(input.revision)||!input.settings||!Array.isArray(input.products)||input.products.length>500)fail('保存データが不正です。');
 const s=input.settings,settings={title:text(s.title,'検索タイトル',100,true),description:text(s.description,'検索説明',300,true),hero:text(s.hero,'トップの文章',150,true),about:text(s.about,'ABOUT',2000,true),contact:text(s.contact,'連絡先',254),googleVerification:text(s.googleVerification??'','Google確認コード',200)};
 if(settings.contact&&!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(settings.contact))fail('連絡先はメールアドレスで入力してください。');
 if(settings.googleVerification&&!/^[A-Za-z0-9_-]+$/.test(settings.googleVerification))fail('Google確認コードはcontent属性の値だけを入力してください。');
 const ids=new Set(),products=input.products.map(p=>{
  if(!p||!Number.isSafeInteger(p.id)||p.id<1||ids.has(p.id))fail('商品IDが不正または重複しています。');ids.add(p.id);
  if(!Number.isSafeInteger(p.price)||p.price<0||p.price>100000000)fail('価格は0〜100,000,000の整数で入力してください。');
  if(!['plants','pots','apparel','art'].includes(p.cat))fail('カテゴリーを確認してください。');
  const img=text(p.img,'商品画像',250,true);
  if(!/^\/(assets\/[\w-]+\.webp|uploads\/[a-f0-9-]+\.(webp|jpg|png))$/.test(img))fail('画像をアップロードしてください。');
  return {id:p.id,name:text(p.name,'商品名',150,true),price:p.price,cat:p.cat,img,tag:text(p.tag,'ラベル',20),description:text(p.description,'商品説明',5000)};
 });
 if(input.articles!==undefined&&(!Array.isArray(input.articles)||input.articles.length>200))fail('記事データを確認してください（最大200件）。');
 const articleIDs=new Set(),articles=(input.articles??structuredClone(defaultArticles)).map(a=>{
  if(!a||!Number.isSafeInteger(a.id)||a.id<1||articleIDs.has(a.id))fail('記事IDが不正または重複しています。');articleIDs.add(a.id);
  const img=text(a.img,'記事画像',250,true);
  if(!/^\/(assets\/[\w-]+\.webp|uploads\/[a-f0-9-]+\.(webp|jpg|png))$/.test(img))fail('記事画像をアップロードしてください。');
  const date=text(a.date??'','記事の日付',10);
  if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))fail('記事の日付は有効な年月日を指定してください。');
  return {id:a.id,title:text(a.title,'記事タイトル',150,true),excerpt:text(a.excerpt,'記事の紹介文',300),body:text(a.body,'記事本文',50000),img,date};
 });return {revision:input.revision,settings,products,articles};
}
export function siteInfo(config){const u=new URL(config.siteURL);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)fail('公開URLはHTTPSのURLを指定してください。');return {url:u.href.replace(/\/$/,''),base:u.pathname.replace(/\/$/,'')};}
const e=escapeHTML;
function seo(title,description,url,image){return `<title>${e(title)}</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${e(url)}"><meta property="og:type" content="website"><meta property="og:site_name" content="PLANTS ADDICT NETWORK"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(url)}"><meta property="og:image" content="${e(image)}"><meta name="twitter:card" content="summary_large_image">`;}
function cards(products,base){return products.map(p=>`<article class="product"><div class="product-img"><a href="${base}/products/${p.id}/"><img src="${e(base+p.img)}" alt="${e(p.name)}" loading="lazy" width="400" height="440"></a><span class="pill ${p.tag==='HOT'?'hot':''}">${e(p.tag||'PAN')}</span><button class="fav" aria-label="お気に入り" onclick="toggleFav(${p.id})">♡</button></div><div class="product-info"><h3><a href="${base}/products/${p.id}/">${e(p.name)}</a></h3><b>¥${p.price.toLocaleString('ja-JP')}</b><button class="cart-add" aria-label="デモカートに追加" onclick="addCart(${p.id})">＋</button></div></article>`).join('');}
export function renderSite(template,input,config){
 const data=validate(input),{url,base}=siteInfo(config),s=data.settings;
 const runtime={...data,products:data.products.map(p=>({...p,img:base+p.img}))};
 let home=template.replace(/<title>.*?<\/title>/,'').replace(/<meta name="description"[^>]*>/,'');
 home=home.replace('</head>',()=>seo(s.title,s.description,url+'/',url+'/assets/hero.webp')+`<link rel="sitemap" type="application/xml" href="${base}/sitemap.xml"><script type="application/ld+json">${scriptJSON({'@context':'https://schema.org','@type':'WebSite',name:'PLANTS ADDICT NETWORK',url:url+'/',description:s.description})}</script></head>`);
 if(s.googleVerification)home=home.replace('</head>',()=>`<meta name="google-site-verification" content="${e(s.googleVerification)}"></head>`);
 home=home.replace(/__PAN_DATA_JSON__|__PAN_PRODUCTS_HTML__|__PAN_BASE__/g,key=>({'__PAN_DATA_JSON__':scriptJSON(runtime),'__PAN_PRODUCTS_HTML__':cards(data.products,base),'__PAN_BASE__':base}[key]));
 home=home.replace('id="hero-jp">植物に魅了されたすべての人へ',()=>`id="hero-jp">${e(s.hero)}`).replace('id="about-text">植物が、日常を少し特別にする。',()=>`id="about-text">${e(s.about)}`);
 if(s.contact)home=home.replace(/href="mailto:hello@example.com" onclick="[^"]*"/,()=>`href="mailto:${e(s.contact)}"`);else home=home.replace(/<a href="mailto:hello@example.com"[^>]*>CONTACT<\/a>/,'');
 const journalCards=articles=>articles.map(a=>`<article><a href="${base}/journal-${a.id}.html"><img src="${e(base+a.img)}" alt="${e(a.title)}" loading="lazy" width="520" height="400"></a>${a.date?`<time datetime="${e(a.date)}">${e(a.date)}</time>`:'<time>JOURNAL</time>'}<h3><a href="${base}/journal-${a.id}.html">${e(a.title)}</a></h3><p>${e(a.excerpt)}</p></article>`).join('');
 home=home.replace(/<div class="journal-grid">[\s\S]*?<\/div><\/section>/,()=>`<div class="journal-grid">${journalCards(data.articles.slice(0,3))||'<p>読みものは準備中です。</p>'}</div></section>`);
 home=home.replace('<span class="text-link">VIEW ALL →</span>',()=>`<a class="text-link" href="${base}/journal.html">VIEW ALL →</a>`);
 const files={'index.html':home,'data/content.json':JSON.stringify(data,null,2)+'\n','.nojekyll':'','sitemap.xml':`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/',...data.products.map(p=>`/products/${p.id}/`),'/journal.html',...data.articles.map(a=>`/journal-${a.id}.html`)].map(p=>`<url><loc>${e(url+p)}</loc></url>`).join('')}</urlset>\n`,'404.html':`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>ページが見つかりません | PAN</title></head><body><h1>ページが見つかりません。</h1><p>商品が削除・移動された可能性があります。</p><a href="${base}/">ショップに戻る</a></body></html>`};
 // GitHub Pagesのプロジェクト配下のrobots.txtはドメイン全体を制御できない。
 if(!base)files['robots.txt']=`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${url}/sitemap.xml\n`;
 for(const p of data.products){
  const desc=p.description||`${p.name}のご紹介。PLANTS ADDICT NETWORK。`,canonical=`${url}/products/${p.id}/`;
  // 現在はデモ掲載のため販売Offerや在庫情報を構造化データに含めない。
  const schema={'@context':'https://schema.org','@type':'Product',name:p.name,description:desc,image:url+p.img,url:canonical,category:p.cat};
  files[`products/${p.id}/index.html`]=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${seo(p.name+' | PLANTS ADDICT NETWORK',desc.slice(0,300),canonical,url+p.img)}<link rel="stylesheet" href="${base}/admin/product.css"><script type="application/ld+json">${scriptJSON(schema)}</script></head><body><header><a href="${base}/">PLANTS ADDICT NETWORK</a></header><main><nav aria-label="パンくず"><a href="${base}/">ホーム</a> / <a href="${base}/#shop">商品一覧</a> / ${e(p.name)}</nav><article><img src="${e(base+p.img)}" alt="${e(p.name)}" width="600" height="660"><div><span>${e(p.tag||'PAN')}</span><h1>${e(p.name)}</h1><p class="price">¥${p.price.toLocaleString('ja-JP')}</p><p class="description">${e(desc)}</p><p class="notice">掲載商品・価格はサンプルです。現在、注文・決済は受け付けていません。</p><a class="button" href="${base}/#shop">商品一覧に戻る →</a></div></article></main><footer>PLANTS, PEOPLE, IDEAS. ALL CONNECTED.</footer></body></html>`;
 }
 const journalShell=(title,description,path,body,schema)=>`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${seo(title,description,url+path,url+'/assets/journal-1.webp')}<link rel="stylesheet" href="${base}/admin/journal.css">${schema?`<script type="application/ld+json">${scriptJSON(schema)}</script>`:''}</head><body><header><a href="${base}/">PLANTS ADDICT NETWORK</a><a href="${base}/#shop">SHOP →</a></header><main>${body}</main><footer>PLANTS, PEOPLE, IDEAS. ALL CONNECTED.</footer></body></html>`;
 files['journal.html']=journalShell('JOURNAL | PLANTS ADDICT NETWORK','植物との暮らし、鉢づくり、アートについての読みもの。','/journal.html',`<nav aria-label="パンくず"><a href="${base}/">ホーム</a> / JOURNAL</nav><p class="eyebrow">PLANTS, PEOPLE, IDEAS.</p><h1>JOURNAL</h1><p class="intro">読みもの</p><div class="journal-grid">${journalCards(data.articles)||'<p>読みものは準備中です。</p>'}</div>`);
 for(const a of data.articles){
  const path=`/journal-${a.id}.html`,description=(a.excerpt||a.body||a.title).slice(0,300);
  const schema={'@context':'https://schema.org','@type':'BlogPosting',headline:a.title,description,image:url+a.img,url:url+path,...(a.date?{datePublished:a.date}:{}),articleBody:a.body};
  files[`journal-${a.id}.html`]=journalShell(a.title+' | PLANTS ADDICT NETWORK',description,path,`<nav aria-label="パンくず"><a href="${base}/">ホーム</a> / <a href="${base}/journal.html">JOURNAL</a> / ${e(a.title)}</nav><article class="story"><p class="eyebrow">JOURNAL ${a.date?`/ <time datetime="${e(a.date)}">${e(a.date)}</time>`:''}</p><h1>${e(a.title)}</h1>${a.excerpt?`<p class="intro">${e(a.excerpt)}</p>`:''}<img class="story-image" src="${e(base+a.img)}" alt="${e(a.title)}" width="960" height="720"><div class="story-body">${a.body?e(a.body):'<p>記事の本文は準備中です。</p>'}</div><a class="back" href="${base}/journal.html">← 読みもの一覧へ</a></article>`,schema).replace(`property="og:image" content="${e(url+'/assets/journal-1.webp')}"`,()=>`property="og:image" content="${e(url+a.img)}"`);
 }
 return files;
}
