import {createStore} from './github.mjs?v=journal-1';
import {createManualStore} from './manual.mjs?v=journal-1';
import {escapeHTML as e,siteInfo} from './site.mjs?v=journal-1';
const $=id=>document.getElementById(id);
let editingArticle=null,selectedArticleImage='',articlePreviewURL='';
let config,store,data,mode='github',exportURL='',dirty=false,busy=false,filter='all',editing=null,selectedImage='',previewURL='',noticeTimer;
const labels={plants:'植物',pots:'3Dプリント鉢',apparel:'アパレル',art:'アート'},stagedURLs=new Map();
function notify(message,error=false){clearTimeout(noticeTimer);$('notice').textContent=message;$('notice').classList.toggle('error',error);$('notice').hidden=false;noticeTimer=setTimeout(()=>$('notice').hidden=true,error?15000:7000);}
function changed(){dirty=true;$('save').disabled=busy;$('save-status').textContent='未保存の変更あり';}
function imageURL(path){if(stagedURLs.has(path))return stagedURLs.get(path);const blob=store.preview(path);if(blob){const url=URL.createObjectURL(blob);stagedURLs.set(path,url);return url;}return siteInfo(config).base+path;}
function seoPreview(){$('preview-title').textContent=$('setting-title').value;$('preview-description').textContent=$('setting-description').value;}
function fill(){for(const key of ['hero','about','contact','title','description','googleVerification'])$(`setting-${key}`).value=data.settings[key];seoPreview();}
function render(){
 $('nav-count').textContent=data.products.length;$('stat-total').innerHTML=`${data.products.length} <small>items</small>`;
 const q=$('search').value.toLocaleLowerCase(),list=data.products.filter(p=>(filter==='all'||p.cat===filter)&&p.name.toLocaleLowerCase().includes(q));
 $('product-list').innerHTML=list.map(p=>`<tr><td><div class="product-cell"><img src="${e(imageURL(p.img))}" alt="" width="56" height="62"><div><strong>${e(p.name)}</strong><small>ITEM ${String(p.id).padStart(3,'0')}</small></div></div></td><td><span class="category">${labels[p.cat]}</span></td><td class="price">¥${p.price.toLocaleString('ja-JP')}</td><td><span class="tag">${e(p.tag||'—')}</span></td><td><div class="actions"><button data-edit="${p.id}">編集</button><button data-delete="${p.id}" class="delete">削除</button></div></td></tr>`).join('');
 renderArticles();
 $('empty').hidden=!!list.length;$('result-count').textContent=`${data.products.length}件中 ${list.length}件を表示`;
}
function showApp(){
 $('token').value='';$('login-view').hidden=true;$('app').hidden=false;dirty=false;$('save').disabled=true;$('save-status').textContent='読み込み済み';
 $('save').textContent=mode==='manual'?'更新用ZIPを書き出す':'変更を保存・反映';
 $('logout').textContent=mode==='manual'?'編集を終了':'接続を解除';
 $('mode-note').textContent=mode==='manual'?'手動アップロードモード：編集内容はこの画面にだけあります。ZIPの中身をGitHubにアップロードすると公開サイトが更新されます。':'GitHub接続モード：保存するとGitHubへ直接更新し、通常数分で公開サイトに反映されます。';
 $('publish-help').textContent=mode==='manual'?'ZIPの中身をGitHubにアップロードすると反映されます':'保存後、通常数分で公開サイトに反映されます';
 $('export-result').hidden=true;
 $('preview-url').textContent=config.siteURL+'/';$('publish-status').textContent=`公開URL：${config.siteURL}/ ／ サイトマップ：${config.siteURL}/sitemap.xml`;
 fill();render();
}
function revokeURLs(){if(articlePreviewURL)URL.revokeObjectURL(articlePreviewURL);articlePreviewURL='';if(exportURL)URL.revokeObjectURL(exportURL);exportURL='';for(const url of stagedURLs.values())URL.revokeObjectURL(url);stagedURLs.clear();if(previewURL)URL.revokeObjectURL(previewURL);previewURL='';}
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;$('login-error').textContent='';
 try{if(!config)throw new Error('管理ページの設定を読み込み中です。しばらくして再試行してください。');const next=createStore(config),loaded=await next.login($('token').value);revokeURLs();store=next;mode='github';data=loaded;showApp();}catch(error){$('login-error').textContent=error.message;}finally{button.disabled=false;}
});
$('manual-start').addEventListener('click',async()=>{
 if(busy)return;busy=true;$('manual-start').disabled=true;$('login-error').textContent='';
 try{if(!config)throw new Error('管理ページの設定を読み込み中です。');const next=createManualStore(config),loaded=await next.login();revokeURLs();store=next;mode='manual';data=loaded;showApp();}
 catch(error){$('login-error').textContent=error.message;}finally{busy=false;$('manual-start').disabled=false;}
});
$('logout').addEventListener('click',()=>{
 if(busy)return;if(dirty&&!confirm('未保存の変更を破棄して接続を解除しますか？'))return;
 store.logout();revokeURLs();data=null;dirty=false;$('app').hidden=true;$('login-view').hidden=false;$('token').focus();
});
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));document.querySelectorAll('.panel').forEach(p=>p.hidden=p.id!==`tab-${button.dataset.tab}`);
 $('breadcrumb').textContent={products:'商品管理',content:'サイトの文章',seo:'検索・公開設定',journal:'読みもの'}[button.dataset.tab];
}));
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b===button));render();}));
$('search').addEventListener('input',render);
for(const key of ['hero','about','contact','title','description','googleVerification'])$(`setting-${key}`).addEventListener('input',()=>{data.settings[key]=$(`setting-${key}`).value;changed();seoPreview();});
function editProduct(id){
 const p=data.products.find(p=>p.id===id);editing=p?.id||null;$('product-form').reset();$('product-error').textContent='';$('dialog-title').textContent=p?'商品を編集':'商品を追加';
 $('product-name').value=p?.name||'';$('product-cat').value=p?.cat||'plants';$('product-price').value=p?.price??'';$('product-tag').value=p?.tag||'';$('product-description').value=p?.description||'';
 selectedImage=p?.img||'/assets/plants-cat.webp';$('product-preview').src=imageURL(selectedImage);$('product-dialog').showModal();
}
$('add-product').addEventListener('click',()=>{if(!busy)editProduct(null);});
$('product-list').addEventListener('click',event=>{
 if(busy)return;const button=event.target.closest('button');if(!button)return;
 if(button.dataset.edit)editProduct(Number(button.dataset.edit));
 if(button.dataset.delete){const id=Number(button.dataset.delete),p=data.products.find(p=>p.id===id);if(confirm(`「${p.name}」を削除しますか？保存するまでは公開サイトに残ります。`)){data.products=data.products.filter(p=>p.id!==id);changed();render();}}
});
$('product-file').addEventListener('change',()=>{
 if(previewURL)URL.revokeObjectURL(previewURL);previewURL='';$('product-error').textContent='';const file=$('product-file').files[0];
 if(!file){$('product-preview').src=imageURL(selectedImage);return;}
 if(file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type)){$('product-error').textContent='JPEG・PNG・WebP形式の5MB以下の画像を選んでください。';$('product-file').value='';$('product-preview').src=imageURL(selectedImage);return;}
 previewURL=URL.createObjectURL(file);$('product-preview').src=previewURL;
});
function closeEditor(){if(busy)return;$('product-dialog').close();if(previewURL)URL.revokeObjectURL(previewURL);previewURL='';}
$('close-editor').addEventListener('click',closeEditor);$('cancel-edit').addEventListener('click',closeEditor);$('product-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
$('product-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;busy=true;$('apply-product').disabled=true;$('product-error').textContent='';
 try{
  const name=$('product-name').value.trim();if(!name)throw new Error('商品名を入力してください。');
  const file=$('product-file').files[0],img=file?await store.upload(await file.arrayBuffer()):selectedImage;
  const product={id:editing||Math.max(Date.now(),...data.products.map(p=>p.id+1)),name,price:Number($('product-price').value),cat:$('product-cat').value,img,tag:$('product-tag').value.trim(),description:$('product-description').value.trim()};
  if(editing)data.products=data.products.map(p=>p.id===editing?product:p);else data.products.push(product);
  changed();render();busy=false;closeEditor();notify(mode==='manual'?'編集内容を追加しました。「更新用ZIPを書き出す」でファイルを作成してください。':'編集内容を追加しました。「変更を保存・反映」でショップに反映できます。');
 }catch(error){$('product-error').textContent=error.message;}finally{busy=false;$('apply-product').disabled=false;$('save').disabled=!dirty;}
});
function renderArticles(){
 $('article-count').textContent=data.articles.length;
 const query=$('article-search').value.toLocaleLowerCase(),list=data.articles.filter(a=>a.title.toLocaleLowerCase().includes(query));
 $('article-list').innerHTML=list.map(a=>`<tr><td><div class="product-cell"><img src="${e(imageURL(a.img))}" alt="" width="56" height="62"><div><strong>${e(a.title)}</strong><small>${e(a.excerpt.slice(0,70))}</small></div></div></td><td class="article-meta">${e(a.date||'日付なし')}</td><td><div class="actions"><button data-article-edit="${a.id}">編集</button><button data-article-delete="${a.id}" class="delete">削除</button></div></td></tr>`).join('');
 $('article-empty').hidden=!!list.length;$('article-result-count').textContent=`${data.articles.length}件中 ${list.length}件を表示`;
}
$('article-search').addEventListener('input',renderArticles);
function editArticle(id){
 const a=data.articles.find(a=>a.id===id);editingArticle=a?.id||null;$('article-form').reset();$('article-error').textContent='';$('article-dialog-title').textContent=a?'記事を編集':'記事を追加';
 $('article-title').value=a?.title||'';$('article-date').value=a?.date||'';$('article-excerpt').value=a?.excerpt||'';$('article-body').value=a?.body||'';
 selectedArticleImage=a?.img||'/assets/journal-1.webp';$('article-preview').src=imageURL(selectedArticleImage);$('article-dialog').showModal();
}
$('add-article').addEventListener('click',()=>{if(!busy)editArticle(null);});
$('article-list').addEventListener('click',event=>{
 if(busy)return;const button=event.target.closest('button');if(!button)return;
 if(button.dataset.articleEdit)editArticle(Number(button.dataset.articleEdit));
 if(button.dataset.articleDelete){const id=Number(button.dataset.articleDelete),a=data.articles.find(a=>a.id===id);if(confirm(`「${a.title}」を削除しますか？書き出したZIPをアップロードするまでは公開記事は変わりません。`)){data.articles=data.articles.filter(a=>a.id!==id);changed();renderArticles();}}
});
$('article-file').addEventListener('change',()=>{
 if(articlePreviewURL)URL.revokeObjectURL(articlePreviewURL);articlePreviewURL='';$('article-error').textContent='';const file=$('article-file').files[0];
 if(!file){$('article-preview').src=imageURL(selectedArticleImage);return;}
 if(file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type)){$('article-error').textContent='JPEG・PNG・WebP形式の5MB以下の画像を選んでください。';$('article-file').value='';$('article-preview').src=imageURL(selectedArticleImage);return;}
 articlePreviewURL=URL.createObjectURL(file);$('article-preview').src=articlePreviewURL;
});
function closeArticle(){if(busy)return;$('article-dialog').close();if(articlePreviewURL)URL.revokeObjectURL(articlePreviewURL);articlePreviewURL='';}
$('close-article').addEventListener('click',closeArticle);$('cancel-article').addEventListener('click',closeArticle);$('article-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
$('article-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;busy=true;$('apply-article').disabled=true;$('article-error').textContent='';
 try{
  const title=$('article-title').value.trim();if(!title)throw new Error('タイトルを入力してください。');
  const file=$('article-file').files[0],img=file?await store.upload(await file.arrayBuffer()):selectedArticleImage;
  const article={id:editingArticle||Math.max(Date.now(),...data.articles.map(a=>a.id+1)),title,date:$('article-date').value,excerpt:$('article-excerpt').value.trim(),body:$('article-body').value.trim(),img};
  if(editingArticle)data.articles=data.articles.map(a=>a.id===editingArticle?article:a);else data.articles.unshift(article);
  changed();renderArticles();busy=false;closeArticle();notify(mode==='manual'?'記事の編集内容を追加しました。「更新用ZIPを書き出す」でファイルを作成してください。':'記事の編集内容を追加しました。「変更を保存・反映」で公開します。');
 }catch(error){$('article-error').textContent=error.message;}finally{busy=false;$('apply-article').disabled=false;$('save').disabled=!dirty;}
});
$('save').addEventListener('click',async()=>{
 if(busy||!dirty)return;
 for(const key of ['hero','about','contact','title','description','googleVerification'])if(!$(`setting-${key}`).checkValidity()){document.querySelector(`[data-tab="${['title','description','googleVerification'].includes(key)?'seo':'content'}"]`).click();$(`setting-${key}`).reportValidity();return;}
 busy=true;$('save').disabled=true;$('save-status').textContent=mode==='manual'?'更新用ZIPを作成中…':'GitHubへ保存中…';
 const snapshot=JSON.stringify(data);
 try{
  const saved=await store.save(JSON.parse(snapshot)),editedDuringSave=JSON.stringify(data)!==snapshot;
  if(mode==='manual'){
   if(exportURL)URL.revokeObjectURL(exportURL);exportURL=URL.createObjectURL(saved.blob);
   $('export-download').href=exportURL;$('export-download').download=saved.filename;$('export-result').hidden=false;
   if(!editedDuringSave)dirty=false;
   $('save-status').textContent=dirty?'未保存の変更あり':'ZIP作成済み・公開は未反映';
   $('export-result').scrollIntoView({behavior:'smooth',block:'center'});
   notify('更新用ZIPを作成しました。ダウンロードして、展開した中身をGitHubにアップロードしてください。');
  }else{
   delete saved.savedCommit;data.revision=saved.revision;
   if(!editedDuringSave){data=saved;dirty=false;fill();render();}
   $('save-status').textContent=dirty?'未保存の変更あり':'GitHubに保存済み';notify('GitHubに保存しました。公開サイトへの反映には通常数分かかります。');
  }
 }catch(error){$('save-status').textContent=error.status===409?'競合：再読み込みが必要':'保存に失敗';notify(error.message,true);}
 finally{busy=false;$('save').disabled=!dirty;}
});
window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
try{const response=await fetch('./config.json',{cache:'no-store'});if(!response.ok)throw new Error('管理ページの設定を取得できません。');config=await response.json();store=createStore(config);}catch(error){$('login-error').textContent=error.message;}
