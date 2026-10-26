// Shared by the visual editor and the exported site. The archive HTML is the source.
export function newsDate(row){
 const time=row.querySelector('time'),raw=(time?.textContent.trim()||time?.getAttribute('datetime')||'');
 const match=raw.match(/^(\d{4})(?:[.\-/]|年)\s*(\d{1,2})(?:[.\-/]|月)\s*(\d{1,2})(?:日)?$/);
 if(!match)return {value:-Infinity,iso:null};
 const [,y,m,d]=match.map(Number),value=Date.UTC(y,m-1,d),date=new Date(value);
 if(y<1000||date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return {value:-Infinity,iso:null};
 return {value,iso:String(y)+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')};
}
export function archiveRows(source){
 const archive=source.querySelector('[data-news-archive]');
 if(!archive)throw Error('ニュース履歴の一覧が見つかりません。');
 return [...archive.children].filter(row=>row.classList.contains('news-item')).map((row,index)=>({row,index,date:newsDate(row)})).sort((a,b)=>(b.date.value-a.date.value)||(a.index-b.index)).map(item=>item.row);
}
export function safeNewsRow(row,sourceURL){
 const clone=row.cloneNode(true),allowed=new Set(['DIV','TIME','P','A','SPAN','STRONG','EM','B','I','U','S','BR','SMALL','CODE','UL','OL','LI']);
 const forbidden=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','META','LINK','BASE','SVG','MATH','IMG']);
 for(const node of [...clone.querySelectorAll('*')].reverse()){
  if(forbidden.has(node.tagName))node.remove();
  else if(!allowed.has(node.tagName))node.replaceWith(...node.childNodes);
 }
 for(const node of [clone,...clone.querySelectorAll('*')]){
  const style=node.style?.cssText||'';
  for(const attr of [...node.attributes])if(!['class','title','aria-label','href','target','rel','datetime'].includes(attr.name))node.removeAttribute(attr.name);
  if(style){const original=node.ownerDocument.createElement('span');original.style.cssText=style;for(const property of ['font-weight','font-style','font-size','text-decoration','color']){const value=original.style.getPropertyValue(property);if(value)node.style.setProperty(property,value);}}
  if(node.tagName==='A'){
   const href=node.getAttribute('href');
   try{if(!href)throw Error();const url=new URL(href,sourceURL),base=new URL(sourceURL);if(!['http:','https:','mailto:','tel:'].includes(url.protocol))throw Error();node.setAttribute('href',url.origin===base.origin?url.pathname+url.search+url.hash:url.href);}catch{node.removeAttribute('href');}
   if(node.getAttribute('target')==='_blank')node.setAttribute('rel','noopener noreferrer');else node.removeAttribute('target');
  }else for(const attr of ['href','target','rel'])node.removeAttribute(attr);
 }
 const date=newsDate(clone);if(date.iso)clone.querySelector('time')?.setAttribute('datetime',date.iso);
 return clone;
}
export function fillNewsFeed(feed,source,sourceURL){
 const requested=Number(feed.getAttribute('data-news-limit')),limit=Number.isInteger(requested)&&requested>0?Math.min(requested,50):5;
 const rows=archiveRows(source).slice(0,limit).map(row=>safeNewsRow(row,sourceURL));
 if(rows.length)feed.replaceChildren(...rows);
 else{const empty=feed.ownerDocument.createElement('p');empty.textContent='お知らせはまだありません。';feed.replaceChildren(empty);}
}
async function startNews(){
 // The editor uses unsaved working HTML instead of fetching stale files from disk.
 if(document.querySelector('base[data-vhs-owned]'))return;
 const archive=document.querySelector('[data-news-archive]');
 if(archive)archive.append(...archiveRows(document));
 const requests=new Map();
 await Promise.all([...document.querySelectorAll('[data-news-source]')].map(async feed=>{
  try{
   const sourceURL=new URL(feed.getAttribute('data-news-source'),document.baseURI);
   if(sourceURL.origin!==location.origin||!['http:','https:'].includes(sourceURL.protocol))throw Error('Invalid news source');
   if(!requests.has(sourceURL.href))requests.set(sourceURL.href,fetch(sourceURL.href,{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error('News request failed');return response.text();}).then(html=>new DOMParser().parseFromString(html,'text/html')));
   fillNewsFeed(feed,await requests.get(sourceURL.href),sourceURL.href);
  }catch(error){console.warn('ニュースの取得に失敗したため、保存済みの内容を表示します。',error);}
 }));
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{startNews();},{once:true});
 else startNews();
}
