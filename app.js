const DB="comic-vault",STORE="comics";let db,comics=[],idx=0,prev="collection";
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s),esc=s=>(s??"").toString().replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open(DB,2);r.onupgradeneeded=e=>{let d=e.target.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id"});if(!d.objectStoreNames.contains("covers"))d.createObjectStore("covers",{keyPath:"id"})};r.onsuccess=e=>{db=e.target.result;ok()};r.onerror=()=>no(r.error)})}
function coverStore(m="readonly"){return db.transaction("covers",m).objectStore("covers")}
function getCover(id){return new Promise((ok,no)=>{let r=coverStore().get(id);r.onsuccess=()=>ok(r.result||null);r.onerror=()=>no(r.error)})}
function putCover(x){return new Promise((ok,no)=>{let r=coverStore("readwrite").put(x);r.onsuccess=ok;r.onerror=()=>no(r.error)})}
function deleteCover(id){return new Promise((ok,no)=>{let r=coverStore("readwrite").delete(id);r.onsuccess=ok;r.onerror=()=>no(r.error)})}
function store(m="readonly"){return db.transaction(STORE,m).objectStore(STORE)}function all(){return new Promise((ok,no)=>{let r=store().getAll();r.onsuccess=()=>ok(r.result||[]);r.onerror=()=>no(r.error)})}function put(x){return new Promise((ok,no)=>{let r=store("readwrite").put(x);r.onsuccess=ok;r.onerror=()=>no(r.error)})}function remove(id){return new Promise((ok,no)=>{let r=store("readwrite").delete(id);r.onsuccess=ok;r.onerror=()=>no(r.error)})}
function view(id){$$(".view").forEach(x=>x.classList.toggle("active",x.id===id));$$("nav [data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===id));$("#more").classList.toggle("active",["boxes","favorites","settings"].includes(id));if(id==="series")renderSeries()}

const imageCache=new Map();
function imageFor(c){return c.thumb||c.cover||""}
function resizeDataUrl(src,maxW,maxH,quality=.72){
 return new Promise(resolve=>{
  if(!src||!src.startsWith("data:image"))return resolve(src||"");
  let im=new Image();
  im.onload=()=>{let scale=Math.min(1,maxW/im.width,maxH/im.height),w=Math.max(1,Math.round(im.width*scale)),h=Math.max(1,Math.round(im.height*scale)),cv=document.createElement("canvas");cv.width=w;cv.height=h;cv.getContext("2d").drawImage(im,0,0,w,h);try{resolve(cv.toDataURL("image/jpeg",quality))}catch{resolve(src)}};
  im.onerror=()=>resolve(src);im.src=src;
 });
}
async function optimizeCover(id,src){
 if(!src)return {thumb:"",full:""};
 let thumb=await resizeDataUrl(src,320,480,.68);
 let full=await resizeDataUrl(src,1200,1800,.78);
 await putCover({id,full,thumb});
 return {thumb,full};
}
async function hydrateLegacyCovers(){
 let legacy=comics.filter(c=>c.cover&&c.cover.startsWith("data:image")&&!c.thumb);
 if(!legacy.length)return;
 for(let i=0;i<legacy.length;i++){
  let c=legacy[i],o=await optimizeCover(c.id,c.cover);
  c={...c,thumb:o.thumb,cover:"",coverStored:true};
  await put(c);
  let j=comics.findIndex(x=>x.id===c.id);if(j>=0)comics[j]=c;
  if(i%3===2)await new Promise(r=>setTimeout(r,0));
 }
}
function card(c){return `<article class="card" data-id="${esc(c.id)}"><div class="cover">${imageFor(c)?`<img loading="lazy" decoding="async" src="${imageFor(c)}">`:"▣"}</div><div class="meta"><strong>${esc(c.title||"Sans titre")}</strong><small>${esc([c.series,c.issue].filter(Boolean).join(" · "))}</small><div class="tag">${esc(c.status||"À lire")}${c.rating?" · "+esc(c.rating)+"/10":""}${c.favorite?" · ★":""}</div></div></article>`}
function grid(el,a){el.innerHTML=a.length?a.map(card).join(""):"<p>Aucun comics.</p>";el.querySelectorAll(".card").forEach(x=>x.onclick=()=>detail(x.dataset.id))}
function text(c){return Object.values(c).filter(v=>typeof v==="string").join(" ").toLowerCase()}
const fields=["title","series","issue","publisher","year","isbn","writer","artist","status","rating","box","position","characters","keywords","storyArc","editorialCollection","location","summary","review"];
function clear(){ $("#form").reset();$("#comicId").value="";$("#coverPreview").src="";$("#delete").style.visibility="hidden";$("#formTitle").textContent="Ajouter un comics"}
function add(){clear();$("#editor").showModal()}$("#addTop").onclick=add;$("#close").onclick=()=>$("#editor").close();
$("#cover").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader;r.onload=()=>$("#coverPreview").src=r.result;r.readAsDataURL(f)}
async function edit(id){let c=comics.find(x=>x.id===id);if(!c)return;clear();$("#comicId").value=id;fields.forEach(k=>$("#"+(k==="series"?"seriesField":k)).value=c[k]??"");$("#favorite").checked=!!c.favorite;let cv=await getCover(id).catch(()=>null);$("#coverPreview").src=cv?.full||c.cover||c.thumb||"";$("#delete").style.visibility="visible";$("#formTitle").textContent="Modifier le comics";$("#editor").showModal()}
$("#form").onsubmit=async e=>{e.preventDefault();let id=$("#comicId").value||crypto.randomUUID(),old=comics.find(x=>x.id===id)||{},preview=$("#coverPreview").src||"",c={...old,id,updated:Date.now(),favorite:$("#favorite").checked};fields.forEach(k=>c[k]=$("#"+(k==="series"?"seriesField":k)).value.trim());if(preview&&preview.startsWith("data:image")){let o=await optimizeCover(id,preview);c.thumb=o.thumb;c.cover="";c.coverStored=true}else if(!c.thumb&&old.thumb)c.thumb=old.thumb;await put(c);$("#editor").close();await refresh()}
$("#delete").onclick=async()=>{let id=$("#comicId").value;if(id&&confirm("Supprimer ce comics ?")){await remove(id);await deleteCover(id).catch(()=>{});$("#editor").close();await refresh()}}
async function detail(id){let c=comics.find(x=>x.id===id);if(!c)return;let cv=await getCover(id).catch(()=>null),detailCover=cv?.full||imageFor(c);prev=document.querySelector(".view.active")?.id||"collection";let place=[c.box,c.position&&"Position "+c.position,c.location].filter(Boolean).join(" · ");$("#detailContent").innerHTML=`<div class="detailHero">${detailCover?`<img class="detailCover" src="${detailCover}">`:`<div class="detailCover"></div>`}<div><h1>${esc(c.title)}</h1><p>${esc([c.series,c.issue,c.publisher,c.year].filter(Boolean).join(" · "))}</p><div class="chips">${[c.status,c.rating?c.rating+"/10":"",c.favorite?"★ Favori":"",place?"📦 "+place:""].filter(Boolean).map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div><button id="editDetail">Modifier</button></div></div>${c.characters?`<div class="block"><b>Personnages</b><p>${esc(c.characters)}</p></div>`:""}${c.storyArc?`<div class="block"><b>Arc narratif</b><p>${esc(c.storyArc)}</p></div>`:""}${c.summary?`<div class="block"><b>Résumé</b><p>${esc(c.summary)}</p></div>`:""}${c.review?`<div class="block"><b>Mon avis</b><p>${esc(c.review)}</p></div>`:""}`;$("#editDetail").onclick=()=>edit(id);view("detail")}$("#backDetail").onclick=()=>view(prev==="detail"?"collection":prev);
function num(c){let m=(c.issue||"").match(/\d+(?:[.,]\d+)?/);if(m)return +m[0].replace(",",".");m=(c.title||"").match(/(?:tome|t\.?|vol(?:ume)?\.?|n[°ºo]?|#)\s*(\d+(?:[.,]\d+)?)/i);return m?+m[1].replace(",","."):Infinity}
function inferred(c){if((c.series||"").trim())return {name:c.series.trim(),guess:false};let t=(c.title||"").trim(),b=t.replace(/\s*[-–—:]?\s*(?:tome|t\.?|vol(?:ume)?\.?|n[°ºo]?|#)\s*\d+(?:[.,]\d+)?\s*$/i,"").trim();return {name:b&&b!==t?b:"Série non renseignée",guess:true}}
function groups(){let m=new Map;comics.forEach(c=>{let z=inferred(c),k=z.name.toLowerCase();if(!m.has(k))m.set(k,{name:z.name,items:[],unknown:true});let g=m.get(k);g.items.push(c);if(!z.guess)g.unknown=false});m.forEach(g=>g.items.sort((a,b)=>num(a)-num(b)||(a.title||"").localeCompare(b.title||"","fr",{numeric:true})));return [...m.values()].sort((a,b)=>a.name.localeCompare(b.name,"fr",{numeric:true}))}
function renderSeries(){let q=$("#seriesSearch").value.trim().toLowerCase(),gs=groups().filter(g=>!q||g.name.toLowerCase().includes(q)||g.items.some(c=>text(c).includes(q)));$("#seriesDetail").hidden=true;$("#seriesGrid").hidden=false;$("#seriesGrid").innerHTML=gs.map(g=>`<div class="group ${g.unknown?"unknown":""}" data-name="${esc(g.name)}"><strong>${esc(g.name)}</strong><small>${g.items.length} comics</small><small>${g.items.some(c=>Number.isFinite(num(c)))?"Classés par tome":"Tomes à compléter"}</small></div>`).join("")||"<p>Aucune série.</p>";$("#seriesGrid").querySelectorAll(".group").forEach(x=>x.onclick=()=>openSeries(x.dataset.name));let n=comics.filter(c=>!(c.series||"").trim()).length;$("#seriesNote").textContent=n?`${n} fiche(s) sans série renseignée.`:"Toutes les fiches ont une série renseignée."}
function openSeries(name){let g=groups().find(x=>x.name===name);if(!g)return;$("#seriesGrid").hidden=true;$("#seriesDetail").hidden=false;$("#seriesDetail").innerHTML=`<div class="head"><div><button id="backSeries" class="secondary">← Séries</button><h2>${esc(g.name)}</h2></div><span>${g.items.length} comics</span></div><div class="seriesList">${g.items.map(c=>`<article class="seriesComic" data-id="${esc(c.id)}"><div class="cover">${imageFor(c)?`<img loading="lazy" decoding="async" src="${imageFor(c)}">`:"▣"}</div><div class="seriesMeta"><strong>${esc(c.title)}</strong><br><small>${Number.isFinite(num(c))?"Tome "+num(c):esc(c.issue||"Tome non renseigné")}</small></div></article>`).join("")}</div>`;$("#backSeries").onclick=renderSeries;$("#seriesDetail").querySelectorAll(".seriesComic").forEach(x=>x.onclick=()=>detail(x.dataset.id))}
$("#seriesSearch").oninput=renderSeries;$("#missingSeries").onclick=()=>{$("#seriesSearch").value="Série non renseignée";renderSeries()};
function search(){let a=[...comics],q=$("#q").value.trim().toLowerCase();if(q)a=a.filter(c=>text(c).includes(q));if($("#fStatus").value)a=a.filter(c=>c.status===$("#fStatus").value);if($("#fFav").value)a=a.filter(c=>c.favorite);let s=$("#fSort").value;if(s==="title")a.sort((x,y)=>(x.title||"").localeCompare(y.title||"","fr"));if(s==="rating")a.sort((x,y)=>+(y.rating||0)-+(x.rating||0));if(s==="series")a.sort((x,y)=>(x.series||"").localeCompare(y.series||"","fr",{numeric:true})||num(x)-num(y));grid($("#searchGrid"),a)}["q","fStatus","fFav","fSort"].forEach(x=>$("#"+x).oninput=search);
function boxes(){let b={};comics.filter(c=>c.box).forEach(c=>(b[c.box]??=[]).push(c));$("#boxesGrid").innerHTML=Object.entries(b).sort((a,b)=>a[0].localeCompare(b[0],"fr",{numeric:true})).map(([k,v])=>`<div class="group" data-box="${esc(k)}"><strong>📦 ${esc(k)}</strong><small>${v.length} comics</small></div>`).join("")||"<p>Aucune boîte renseignée.</p>";$("#boxesGrid").querySelectorAll(".group").forEach(x=>x.onclick=()=>{$("#q").value=x.dataset.box;view("search");search()})}
function rel(i){let n=comics.length,d=i-idx;if(d>n/2)d-=n;if(d<-n/2)d+=n;return d}function carousel(){let e=$("#carousel");if(!comics.length){e.innerHTML="<p>Aucun comics.</p>";$("#carouselInfo").innerHTML="";return}idx=(idx+comics.length)%comics.length;e.innerHTML=comics.map((c,i)=>{let p=rel(i);return `<div class="ci ${Math.abs(p)>1?"far":""}" data-i="${i}" data-p="${Math.max(-1,Math.min(1,p))}">${imageFor(c)?`<img src="${imageFor(c)}">`:""}</div>`}).join("");let c=comics[idx];$("#carouselInfo").innerHTML=`<h2>${esc(c.title)}</h2><p>${esc([c.series,c.issue].filter(Boolean).join(" · "))}</p>`;$("#collectionBackdrop").style.backgroundImage=imageFor(c)?`url("${imageFor(c).replace(/"/g,"%22")}")`:"none";e.querySelectorAll(".ci").forEach(x=>x.onclick=()=>{let i=+x.dataset.i;if(i===idx)detail(comics[i].id);else{idx=i;carousel()}})}
let sx=null,dx=0;$("#carouselWrap").ontouchstart=e=>{sx=e.touches[0].clientX;dx=0};$("#carouselWrap").ontouchmove=e=>dx=e.touches[0].clientX-sx;$("#carouselWrap").ontouchend=()=>{if(Math.abs(dx)>45){idx=(idx+(dx<0?1:-1)+comics.length)%comics.length;carousel()}sx=null};$("#carouselMode").onclick=()=>{$("#carouselWrap").hidden=false;$("#collectionGrid").hidden=true};$("#gridMode").onclick=()=>{$("#carouselWrap").hidden=true;$("#collectionGrid").hidden=false};
$("#exportBtn").onclick=async()=>{
 let out=[];
 for(let c of comics){
  let cv=await getCover(c.id).catch(()=>null);
  out.push({...c,cover:cv?.full||c.cover||"",thumb:undefined});
 }
 let b=new Blob([JSON.stringify({version:4,exported:new Date().toISOString(),format:"comic-vault-v3.1",comics:out})],{type:"application/json"}),a=document.createElement("a");
 a.href=URL.createObjectURL(b);a.download="comic-vault-sauvegarde.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)
};
function readBackup(file){return new Promise((ok,no)=>{let r=new FileReader;r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsText(file,"UTF-8")})}
function progress(i,n,text){$("#importProgress").hidden=false;$("#importProgressBar").style.width=(n?Math.round(i/n*100):0)+"%";$("#importProgressText").textContent=text}
$("#importFile").onchange=async e=>{
 let file=e.target.files?.[0];if(!file)return;
 try{
  progress(0,1,"Lecture de la sauvegarde…");
  let raw=(await readBackup(file)).replace(/^\uFEFF/,"").trim(),d=JSON.parse(raw),a=Array.isArray(d)?d:(d.comics||d.data||d.collection);
  if(!Array.isArray(a))throw new Error("format");
  for(let i=0;i<a.length;i++){
   let old=a[i];if(!old||typeof old!=="object")continue;
   let id=old.id||crypto.randomUUID(),src=old.cover||old.thumb||"";
   progress(i,a.length,`Optimisation des couvertures ${i+1} / ${a.length}…`);
   let c={...old,id,updated:old.updated||Date.now()};
   if(src&&src.startsWith("data:image")){let o=await optimizeCover(id,src);c.thumb=o.thumb;c.cover="";c.coverStored=true}
   await put(c);
   if(i%2===1)await new Promise(r=>setTimeout(r,0));
  }
  progress(a.length,a.length,`Import terminé : ${a.length} comics.`);
  await refresh();setTimeout(()=>$("#importProgress").hidden=true,1800);
 }catch(err){console.error(err);$("#importProgressText").textContent="Import impossible. Aucune donnée existante n’a été supprimée.";alert("Impossible d’importer cette sauvegarde.")}
 finally{e.target.value=""}
};
$$("[data-view]").forEach(b=>b.onclick=()=>{view(b.dataset.view);$("#moreMenu").hidden=true});$("#more").onclick=e=>{e.stopPropagation();$("#moreMenu").hidden=!$("#moreMenu").hidden};$("#moreMenu").onclick=e=>e.stopPropagation();$$("[data-more]").forEach(b=>b.onclick=()=>{view(b.dataset.more);$("#moreMenu").hidden=true});document.onclick=()=>$("#moreMenu").hidden=true;
async function refresh(){comics=(await all()).sort((a,b)=>(b.updated||0)-(a.updated||0));$("#sTotal").textContent=comics.length;$("#sRead").textContent=comics.filter(c=>c.status==="Lu").length;$("#sUnread").textContent=comics.filter(c=>c.status!=="Lu").length;$("#sFav").textContent=comics.filter(c=>c.favorite).length;grid($("#recent"),comics.slice(0,6));grid($("#collectionGrid"),comics);grid($("#favGrid"),comics.filter(c=>c.favorite));carousel();renderSeries();boxes();search()}
(async()=>{try{await openDB();await refresh();setTimeout(async()=>{try{if(comics.some(c=>c.cover&&c.cover.startsWith("data:image")&&!c.thumb)){await hydrateLegacyCovers();await refresh()}}catch(e){console.warn("Optimisation différée",e)}},800)}catch(e){console.error(e);alert("Comic Vault n’a pas pu ouvrir la base. Ne supprime pas les données Safari.")}})();