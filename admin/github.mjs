import {renderSite,validate} from './site.mjs?v=journal-1';
import {addImage} from './images.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const decode=value=>new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g,'')),c=>c.charCodeAt(0)));
function encode(bytes){let value='';for(let i=0;i<bytes.length;i+=8192)value+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(value);}
export function createStore(config,transport=fetch){
 if(!/^[\w.-]+$/.test(config.owner)||!/^[\w.-]+$/.test(config.repository)||typeof config.branch!=='string')fail(400,'GitHubの設定を確認してください。');
 const base=`https://api.github.com/repos/${config.owner}/${config.repository}`;
 let token='',loadedSHA='';const images=new Map();
 async function api(route,options={}){
  if(!token)fail(401,'管理用トークンで接続してください。');
  const res=await transport(base+route,{...options,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:`Bearer ${token}`,...(options.body?{'Content-Type':'application/json'}:{})},cache:'no-store',credentials:'omit',redirect:'error'});
  if(!res.ok){
   if(res.status===401){token='';fail(401,'トークンが無効または期限切れです。');}
   if([409,422].includes(res.status))fail(409,'別の更新またはブランチ制限があります。再読み込み後に変更をやり直してください。');
   if(res.status===403)fail(403,'GitHubの権限・API制限を確認してください。対象リポジトリのContents: Read and writeが必要です。');
   fail(res.status,`GitHubへの接続に失敗しました（${res.status}）。リポジトリとトークンの設定を確認してください。`);
  }return res.status===204?{}:res.json();
 }
 async function file(name,ref=config.branch){const f=await api(`/contents/${name}?ref=${encodeURIComponent(ref)}`);if(f.encoding!=='base64'||typeof f.content!=='string')fail(400,'GitHub上のファイルを読み取れません。');return {text:decode(f.content),sha:f.sha};}
 async function load(){const f=await file('data/content.json');const value=validate(JSON.parse(f.text));loadedSHA=f.sha;return value;}
 async function login(value){if(typeof value!=='string'||!value.trim()||value.length>1024)fail(400,'管理用トークンを入力してください。');token=value.trim();loadedSHA='';images.clear();try{return await load();}catch(e){token='';throw e;}}
 function logout(){token='';loadedSHA='';images.clear();}
 async function upload(buffer){if(!token)fail(401,'接続してください。');return addImage(images,buffer);}
 async function save(input){
  const next=validate(input);if(!loadedSHA)fail(409,'再読み込み後に保存してください。');
  const head=await api(`/git/ref/heads/${encodeURIComponent(config.branch)}`),parent=head.object.sha;
  const currentFile=await file('data/content.json',parent),current=validate(JSON.parse(currentFile.text));
  if(currentFile.sha!==loadedSHA||next.revision!==current.revision)fail(409,'別の画面で更新されました。再読み込み後に変更をやり直してください。');
  const template=await file('templates/storefront.html',parent),commit=await api(`/git/commits/${parent}`);
  next.revision++;
  const files=renderSite(template.text,next,config),entries=Object.entries(files).map(([path,content])=>({path,mode:'100644',type:'blob',content}));
  const used=new Set([...next.products,...next.articles].map(p=>p.img));
  for(const [url,bytes] of images){if(!used.has(url))continue;const blob=await api('/git/blobs',{method:'POST',body:JSON.stringify({encoding:'base64',content:encode(bytes)})});entries.push({path:url.slice(1),mode:'100644',type:'blob',sha:blob.sha});}
  for(const p of current.products)if(!next.products.some(n=>n.id===p.id))entries.push({path:`products/${p.id}/index.html`,mode:'100644',type:'blob',sha:null});
  // 旧データに記事がない場合、既存の静的記事URLは存在しないので削除しない。
  const previousArticles=JSON.parse(currentFile.text).articles||[];
  for(const a of previousArticles)if(!next.articles.some(n=>n.id===a.id))entries.push({path:`journal-${a.id}.html`,mode:'100644',type:'blob',sha:null});
  const tree=await api('/git/trees',{method:'POST',body:JSON.stringify({base_tree:commit.tree.sha,tree:entries})});
  const created=await api('/git/commits',{method:'POST',body:JSON.stringify({message:'Update PAN products and site content',tree:tree.sha,parents:[parent]})});
  try{await api(`/git/refs/heads/${encodeURIComponent(config.branch)}`,{method:'PATCH',body:JSON.stringify({sha:created.sha,force:false})});}
  catch(error){try{const ref=await api(`/git/ref/heads/${encodeURIComponent(config.branch)}`);if(ref.object.sha!==created.sha)throw error;}catch{throw error;}}
  // 成功したコミットの内容からSHAを算出し、保存後の追加通信失敗で成功扱いを失わない。
  const bytes=new TextEncoder().encode(files['data/content.json']);const header=new TextEncoder().encode(`blob ${bytes.length}\0`);const full=new Uint8Array(header.length+bytes.length);full.set(header);full.set(bytes,header.length);
  loadedSHA=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',full)),b=>b.toString(16).padStart(2,'0')).join('');
  images.clear();return {...next,savedCommit:created.sha};
 }
 return {login,logout,load,upload,save,preview(url){return images.has(url)?new Blob([images.get(url)]):null;}};
}
