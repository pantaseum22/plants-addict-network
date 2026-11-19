import {renderSite,validate,siteInfo} from './site.mjs?v=journal-1';
import {addImage} from './images.mjs';
import {zipFiles} from './archive.mjs';
export function createManualStore(config,transport=fetch){
 let original=null,template='',active=false;const images=new Map();
 async function read(relative){const r=await transport(new URL(relative,import.meta.url),{cache:'no-store'});if(!r.ok)throw new Error('必要なファイルがありません。ZIPの中身をすべてGitHubにアップロードしてください。');return r.text();}
 async function login(){
  const [source,layout]=await Promise.all([read('../data/content.json'),read('../templates/storefront.html')]);
  original=validate(JSON.parse(source));template=layout;active=true;images.clear();return structuredClone(original);
 }
 async function save(input){
  if(!active)throw new Error('編集を開始してください。');const next=validate(input);
  const current=validate(JSON.parse(await read('../data/content.json')));
  if(JSON.stringify(current)!==JSON.stringify(original))throw Object.assign(new Error('公開データが変わりました。変更内容を控えて再読み込みしてください。'),{status:409});
  // 書き出しは公開保存とは別。ZIPは毎回、読み込み元に対して一回分の更新とする。
  next.revision=original.revision+1;const files=renderSite(template,next,config),used=new Set([...next.products,...next.articles].map(p=>p.img));
  for(const [url,bytes] of images)if(used.has(url))files[url.slice(1)]=bytes;
  const {base}=siteInfo(config);
  // 手動アップロードで古いファイルが残っても、削除商品の内容や検索掲載を残さない。
  for(const p of original.products)if(!next.products.some(n=>n.id===p.id))files[`products/${p.id}/index.html`]=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>掲載終了 | PLANTS ADDICT NETWORK</title><link rel="stylesheet" href="${base}/admin/product.css"></head><body><header><a href="${base}/">PLANTS ADDICT NETWORK</a></header><main><h1>この商品の掲載は終了しました。</h1><a class="button" href="${base}/#shop">商品一覧に戻る</a></main></body></html>`;
  for(const a of original.articles)if(!next.articles.some(n=>n.id===a.id))files[`journal-${a.id}.html`]=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>記事の掲載終了 | PLANTS ADDICT NETWORK</title><link rel="stylesheet" href="${base}/admin/journal.css"></head><body><header><a href="${base}/">PLANTS ADDICT NETWORK</a></header><main><h1>この記事の掲載は終了しました。</h1><a class="back" href="${base}/journal.html">読みもの一覧に戻る</a></main></body></html>`;
  return {blob:zipFiles(files),filename:'pan-update.zip'};
 }
 return {login,save,logout(){active=false;original=null;images.clear();},upload(buffer){if(!active)throw new Error('編集を開始してください。');return addImage(images,buffer);},preview(url){return images.has(url)?new Blob([images.get(url)]):null;}};
}
