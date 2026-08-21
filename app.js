const DB="comic-vault-v5", META="comics", COV="covers";
let db, comics=[], idx=0, prev="home", urls=new Map();
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const esc=s=>(s??"").toString().replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=e=>{let d=e.target.result;if(!d.objectStoreNames.contains(META))d.createObjectStore(META,{keyPath:"id"});if(!d.objectStoreNames.contains(COV))d.createObjectStore(COV,{keyPath:"id"})};r.onsuccess=e=>{db=e.target.result;ok()};r.onerror=()=>no(r.error)})}
function st(n,m="readonly"){return db.transaction(n,m).objectStore(n)}
function getAll(n=META){return new Promise((ok,no)=>{let r=st(n).getAll();r.onsuccess=()=>ok(r.result||[]);r.onerror=()=>no(r.error)})}
function get(n,id){return new Promise((ok,no)=>{let r=st(n).get(id);r.onsuccess=()=>ok(r.result||null);r.onerror=()=>no(r.error)})}
function put(n,x){return new Promise((ok,no)=>{let r=st(n,"readwrite").put(x);r.onsuccess=ok;r.onerror=()=>no(r.error)})}
function del(n,id){return new Promise((ok,no)=>{let r=st(n,"readwrite").delete(id);r.onsuccess=ok;r.onerror=()=>no(r.error)})}
function revokeUrls(){for(let u of urls.values())URL.revokeObjectURL(u);urls.clear()}
function urlFor(id,kind,blob){let k=id+":"+kind;if(urls.has(k))return urls.get(k);let u=URL.createObjectURL(blob);urls.set(k,u);return u}
async function thumbURL(c){let x=await get(COV,c.id);return x?.thumb?urlFor(c.id,"t",x.thumb):""}
async function fullURL(c){let x=await get(COV,c.id);return x?.full?urlFor(c.id,"f",x.full):x?.thumb?urlFor(c.id,"t",x.thumb):""}
function view(v){$$(".view").forEach(x=>x.classList.toggle("active",x.id===v));$$("[data-v]").forEach(x=>x.classList.toggle("active",x.dataset.v===v));if(v==="series")renderSeries();if(v==="boxes")boxes()}
async function makeCard(c){let u=await thumbURL(c);return `<article class="card" data-id="${esc(c.id)}"><div class="cover">${u?`<img loading="lazy" decoding="async" src="${u}">`:"▣"}</div><div class="meta"><strong>${esc(c.title||"Sans titre")}</strong><small>${esc([c.series,c.issue].filter(Boolean).join(" · "))}</small></div></article>`}
async function grid(el,a,limit=60){let b=a.slice(0,limit),parts=[];for(let c of b)parts.push(await makeCard(c));el.innerHTML=parts.length?parts.join(""):"<p>Aucun comics.</p>";el.querySelectorAll(".card").forEach(x=>x.onclick=()=>detail(x.dataset.id))}
const F=["title","series","issue","publisher","year","writer","artist","status","rating","box","position","characters","keywords","summary","review","pages","quote"];
function clear(){form.reset();$("#id").value="";$("#preview").src="";$("#delete").style.visibility="hidden"}
$("#add").onclick=()=>{clear();document.body.classList.remove("quickMode");$("#formTitle").textContent="Ajouter un comics";editor.showModal()};
$("#quickAdd").onclick=()=>{clear();document.body.classList.add("quickMode");$("#formTitle").textContent="⚡ Saisie rapide";editor.showModal()};$("#close").onclick=()=>editor.close();
function previewFile(f){if(!f)return;let u=URL.createObjectURL(f);$("#preview").src=u;$("#preview").dataset.file="1"}
$("#coverFile").onchange=e=>previewFile(e.target.files[0]);
$("#cameraFile").onchange=e=>previewFile(e.target.files[0]);
function resizeFile(file,w,h,q){return new Promise((ok,no)=>{let u=URL.createObjectURL(file),im=new Image;im.onload=()=>{let s=Math.min(1,w/im.width,h/im.height),cv=document.createElement("canvas");cv.width=Math.max(1,Math.round(im.width*s));cv.height=Math.max(1,Math.round(im.height*s));cv.getContext("2d").drawImage(im,0,0,cv.width,cv.height);cv.toBlob(b=>{URL.revokeObjectURL(u);b?ok(b):no(new Error("compression"))},"image/jpeg",q)};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("image"))};im.src=u})}
async function edit(id){let c=comics.find(x=>x.id===id);if(!c)return;clear();$("#id").value=id;F.forEach(k=>$("#"+(k==="series"?"seriesField":k)).value=c[k]||"");$("#favorite").checked=!!c.favorite;$("#preview").src=await fullURL(c);$("#delete").style.visibility="visible";editor.showModal()}
form.onsubmit=async e=>{e.preventDefault();let id=$("#id").value||crypto.randomUUID(),old=comics.find(x=>x.id===id)||{},c={...old,id,updated:Date.now(),favorite:$("#favorite").checked};F.forEach(k=>c[k]=$("#"+(k==="series"?"seriesField":k)).value.trim());let f=$("#cameraFile").files?.[0]||$("#coverFile").files?.[0];if(f){let thumb=await resizeFile(f,240,360,.64),full=await resizeFile(f,1100,1650,.78);await put(COV,{id,thumb,full});let kb=Math.round((thumb.size+full.size)/1024);c.imageKB=kb}let dup=comics.find(x=>x.id!==c.id&&c.series&&x.series?.toLowerCase()===c.series.toLowerCase()&&String(x.issue||"").trim()===String(c.issue||"").trim());if(dup&&!confirm(`Attention : ${dup.title||"un comics"} possède déjà la série « ${c.series} » et le tome ${c.issue}. Enregistrer quand même ?`))return;await put(META,c);let wasQuick=document.body.classList.contains("quickMode"),keep={series:c.series,publisher:c.publisher,box:c.box,issue:c.issue};editor.close();await refresh();if(wasQuick){clear();document.body.classList.add("quickMode");$("#formTitle").textContent="⚡ Saisie rapide";$("#seriesField").value=keep.series||"";$("#publisher").value=keep.publisher||"";$("#box").value=keep.box||"";let n=parseFloat((keep.issue||"").replace(",","."));$("#issue").value=Number.isFinite(n)?String(n+1):"";editor.showModal()}}
$("#delete").onclick=async()=>{let id=$("#id").value;if(id&&confirm("Supprimer ce comics ?")){await del(META,id);await del(COV,id).catch(()=>{});editor.close();await refresh()}};
async function detail(id){let c=comics.find(x=>x.id===id);if(!c)return;prev=document.querySelector(".view.active")?.id||"home";let src=await fullURL(c);$("#detailBody").innerHTML=`<div class="detailHero">${src?`<img src="${src}">`:"<div></div>"}<div><h1>${esc(c.title)}</h1><p>${esc([c.series,c.issue,c.publisher,c.year].filter(Boolean).join(" · "))}</p><p>${c.favorite?"★ Favori · ":""}${esc(c.status||"")}${c.rating?` · ${esc(c.rating)}/10`:""}${c.pages?` · ${esc(c.pages)} pages`:""}</p><button id="editD">Modifier</button></div></div>${c.quote?`<div class="quoteBlock"><span>❝</span><div><b>Citation favorite</b><p>« ${esc(c.quote)} »</p></div></div>`:""}${c.summary?`<div class="block"><b>Résumé</b><p>${esc(c.summary)}</p></div>`:""}${c.review?`<div class="block"><b>Mon avis</b><p>${esc(c.review)}</p></div>`:""}`;$("#editD").onclick=()=>edit(id);view("detail")}
$("#back").onclick=()=>view(prev);
function num(c){let m=(c.issue||"").match(/\d+(?:[.,]\d+)?/);if(m)return +m[0].replace(",",".");m=(c.title||"").match(/(?:tome|t\.?|vol(?:ume)?\.?|#|n[°ºo]?)\s*(\d+)/i);return m?+m[1]:Infinity}
function inf(c){if(c.series?.trim())return {n:c.series.trim(),u:false};let t=c.title||"",b=t.replace(/\s*[-–—:]?\s*(?:tome|t\.?|vol(?:ume)?\.?|#|n[°ºo]?)\s*\d+\s*$/i,"").trim();return {n:b&&b!==t?b:"Série non renseignée",u:true}}
function sgroups(){let m=new Map;comics.forEach(c=>{let z=inf(c),k=z.n.toLowerCase();if(!m.has(k))m.set(k,{name:z.n,a:[],u:true});let g=m.get(k);g.a.push(c);if(!z.u)g.u=false});m.forEach(g=>g.a.sort((a,b)=>num(a)-num(b)||(a.title||"").localeCompare(b.title||"","fr",{numeric:true})));return [...m.values()].sort((a,b)=>a.name.localeCompare(b.name,"fr",{numeric:true}))}
function renderSeries(){let q=$("#seriesQ").value.toLowerCase(),g=sgroups().filter(x=>!q||x.name.toLowerCase().includes(q));$("#seriesDetail").hidden=true;$("#seriesGrid").hidden=false;$("#seriesGrid").innerHTML=g.map(x=>`<div class="group ${x.u?"unknown":""}" data-n="${esc(x.name)}"><strong>${esc(x.name)}</strong><small>${x.a.length} comics · ordre par tome</small></div>`).join("");$("#seriesGrid").querySelectorAll(".group").forEach(x=>x.onclick=()=>openSeries(x.dataset.n));$("#seriesNote").textContent=comics.filter(c=>!c.series?.trim()).length+" fiche(s) sans série renseignée."}
async function openSeries(n){let g=sgroups().find(x=>x.name===n);$("#seriesGrid").hidden=true;$("#seriesDetail").hidden=false;let cards=[];for(let c of g.a){let u=await thumbURL(c);cards.push(`<article class="seriesComic" data-id="${esc(c.id)}"><div class="cover">${u?`<img loading="lazy" src="${u}">`:"▣"}</div><div class="sm"><strong>${esc(c.title)}</strong><br><small>${Number.isFinite(num(c))?"Tome "+num(c):"Tome non renseigné"}</small></div></article>`)}$("#seriesDetail").innerHTML=`<button id="bs" class="secondary">← Séries</button><h2>${esc(n)}</h2><div class="seriesList">${cards.join("")}</div>`;$("#bs").onclick=renderSeries;$("#seriesDetail").querySelectorAll(".seriesComic").forEach(x=>x.onclick=()=>detail(x.dataset.id))}
$("#seriesQ").oninput=renderSeries;$("#missing").onclick=()=>{$("#seriesQ").value="Série non renseignée";renderSeries()};
async function search(){let q=$("#q").value.toLowerCase(),a=q?comics.filter(c=>Object.values(c).filter(v=>typeof v==="string").join(" ").toLowerCase().includes(q)):comics;await grid($("#searchGrid"),a)}$("#q").oninput=search;
function boxes(){let b={};comics.filter(c=>c.box).forEach(c=>(b[c.box]??=[]).push(c));$("#boxesGrid").innerHTML=Object.entries(b).map(([k,a])=>`<div class="group" data-b="${esc(k)}"><strong>📦 ${esc(k)}</strong><small>${a.length} comics</small></div>`).join("")||"<p>Aucune boîte.</p>";$("#boxesGrid").querySelectorAll(".group").forEach(x=>x.onclick=()=>{$("#q").value=x.dataset.b;view("search");search()})}
async function car(){let e=$("#carousel");if(!comics.length){e.innerHTML="<p>Aucun comics.</p>";return}idx=(idx+comics.length)%comics.length;let parts=[];for(let d=-1;d<=1;d++){let i=(idx+d+comics.length)%comics.length,c=comics[i],u=await thumbURL(c);parts.push(`<div class="ci" data-i="${i}" data-p="${d}">${u?`<img src="${u}">`:""}</div>`)}e.innerHTML=parts.join("");let c=comics[idx];$("#carInfo").innerHTML=`<h2>${esc(c.title)}</h2><p>${esc([c.series,c.issue].filter(Boolean).join(" · "))}</p>`;e.querySelectorAll(".ci").forEach(x=>x.onclick=()=>{let i=+x.dataset.i;if(i===idx)detail(comics[i].id);else{idx=i;car()}})}
let sx,dx;$("#carWrap").ontouchstart=e=>{sx=e.touches[0].clientX;dx=0};$("#carWrap").ontouchmove=e=>dx=e.touches[0].clientX-sx;$("#carWrap").ontouchend=()=>{if(Math.abs(dx)>45){idx=(idx+(dx<0?1:-1)+comics.length)%comics.length;car()}};
$("#carMode").onclick=()=>{$("#carWrap").hidden=false;$("#collectionGrid").hidden=true};$("#gridMode").onclick=()=>{$("#carWrap").hidden=true;$("#collectionGrid").hidden=false};
function prog(id,i,n,t){let p=$(id);p.hidden=false;p.querySelector("span").style.width=Math.round(i/n*100)+"%";p.querySelector("small").textContent=t}
async function fetchBlob(path){let r=await fetch(path,{cache:"force-cache"});if(!r.ok)throw new Error(path);return await r.blob()}
$("#migrateBtn").onclick=async()=>{if(comics.length&&comics.length!==54&&!confirm("La V5 contient déjà des comics. Continuer ?"))return;try{let d=await (await fetch("./seed.json",{cache:"no-store"})).json(),a=d.comics||[];for(let i=0;i<a.length;i++){let c={...a[i]},tp=(c.thumbSeed||"").replace("./covers/","./"),fp=(c.fullSeed||"").replace("./covers/","./");prog("#migrateProg",i+1,a.length,`Installation locale ${i+1} / ${a.length}`);let thumb=tp?await fetchBlob(tp):null,full=fp?await fetchBlob(fp):null;c.thumbSeed="";c.fullSeed="";c.cover="";c.updated=c.updated||Date.now();await put(META,c);if(thumb||full)await put(COV,{id:c.id,thumb:thumb||full,full:full||thumb});if(i%4===3)await new Promise(r=>setTimeout(r,0))}await refresh();$("#localState").textContent=`Bibliothèque locale prête : ${a.length} comics et couvertures installés dans l’app.`;$("#migrateBtn").disabled=true;setTimeout(()=>$("#migrateProg").hidden=true,1800)}catch(e){console.error(e);alert("Migration interrompue. Tu peux relancer le bouton : les fiches déjà copiées ne seront pas dupliquées.")}};
/* Minimal ZIP writer/reader: STORE method, no external library. */
const te=new TextEncoder(),td=new TextDecoder();
function crc32(u){let c=0xffffffff;for(let b of u){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
function u16(v){return new Uint8Array([v&255,v>>>8&255])}function u32(v){return new Uint8Array([v&255,v>>>8&255,v>>>16&255,v>>>24&255])}function cat(a){let n=a.reduce((s,x)=>s+x.length,0),o=new Uint8Array(n),p=0;for(let x of a){o.set(x,p);p+=x.length}return o}
async function zipMake(files){let locals=[],centrals=[],off=0;for(let f of files){let name=te.encode(f.name),data=f.data instanceof Uint8Array?f.data:new Uint8Array(await f.data.arrayBuffer()),crc=crc32(data),lh=cat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name]),block=cat([lh,data]);locals.push(block);centrals.push(cat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off),name]));off+=block.length}let cd=cat(centrals),end=cat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(cd.length),u32(off),u16(0)]);return new Blob([...locals,cd,end],{type:"application/zip"})}
$("#exportZip").onclick=async()=>{try{let files=[],meta=[];for(let i=0;i<comics.length;i++){let c=comics[i],cv=await get(COV,c.id);prog("#backupProg",i+1,comics.length,`Sauvegarde ${i+1} / ${comics.length}`);meta.push({...c});if(cv?.thumb)files.push({name:`covers/${c.id}-thumb.jpg`,data:cv.thumb});if(cv?.full)files.push({name:`covers/${c.id}-full.jpg`,data:cv.full});if(i%5===4)await new Promise(r=>setTimeout(r,0))}files.unshift({name:"collection.json",data:te.encode(JSON.stringify({version:5,format:"comic-vault-v5",comics:meta}))});let z=await zipMake(files),a=document.createElement("a");a.href=URL.createObjectURL(z);a.download="Comic-Vault-V5-Backup.zip";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);setTimeout(()=>$("#backupProg").hidden=true,1800)}catch(e){console.error(e);alert("Sauvegarde impossible. Aucune donnée n’a été modifiée.")}};
function zipRead(buf){let u=new Uint8Array(buf),dv=new DataView(buf),p=0,out=new Map;while(p+30<=u.length&&dv.getUint32(p,true)===0x04034b50){let method=dv.getUint16(p+8,true),size=dv.getUint32(p+18,true),nl=dv.getUint16(p+26,true),el=dv.getUint16(p+28,true),name=td.decode(u.slice(p+30,p+30+nl)),start=p+30+nl+el;if(method!==0)throw new Error("ZIP compressé non supporté");out.set(name,u.slice(start,start+size));p=start+size}return out}
$("#restoreZip").onchange=async e=>{let f=e.target.files?.[0];if(!f)return;try{let files=zipRead(await f.arrayBuffer()),raw=files.get("collection.json");if(!raw)throw new Error("collection");let d=JSON.parse(td.decode(raw)),a=d.comics;if(!Array.isArray(a))throw new Error("format");for(let i=0;i<a.length;i++){let c=a[i],tb=files.get(`covers/${c.id}-thumb.jpg`),fb=files.get(`covers/${c.id}-full.jpg`);prog("#backupProg",i+1,a.length,`Restauration ${i+1} / ${a.length}`);await put(META,c);if(tb||fb)await put(COV,{id:c.id,thumb:new Blob([tb||fb],{type:"image/jpeg"}),full:new Blob([fb||tb],{type:"image/jpeg"})});if(i%4===3)await new Promise(r=>setTimeout(r,0))}await refresh();setTimeout(()=>$("#backupProg").hidden=true,1800);alert(`${a.length} comics restaurés.`)}catch(err){console.error(err);alert("Ce fichier n’est pas une sauvegarde Comic Vault V5 valide.")}finally{e.target.value=""}};
$$("[data-v]").forEach(b=>b.onclick=()=>{view(b.dataset.v);$("#moreMenu").hidden=true});$("#more").onclick=e=>{e.stopPropagation();$("#moreMenu").hidden=!$("#moreMenu").hidden};$("#moreMenu").onclick=e=>e.stopPropagation();$$("[data-more]").forEach(b=>b.onclick=()=>{view(b.dataset.more);$("#moreMenu").hidden=true});document.onclick=()=>$("#moreMenu").hidden=true;
function collectionData(){let a=[...comics],s=$("#filterStatus")?.value||"";if(s)a=a.filter(c=>c.status===s);if($("#filterFav")?.checked)a=a.filter(c=>c.favorite);let mode=$("#sort")?.value||"recent";if(mode==="title")a.sort((x,y)=>(x.title||"").localeCompare(y.title||"","fr",{numeric:true}));if(mode==="series")a.sort((x,y)=>(x.series||"").localeCompare(y.series||"","fr",{numeric:true})||num(x)-num(y));if(mode==="year")a.sort((x,y)=>(+y.year||0)-(+x.year||0));if(mode==="rating")a.sort((x,y)=>(+y.rating||0)-(+x.rating||0));return a}
async function renderCollection(){await grid($("#collectionGrid"),collectionData(),60)}
$("#sort").onchange=renderCollection;$("#filterStatus").onchange=renderCollection;$("#filterFav").onchange=renderCollection;
async function refresh(){revokeUrls();comics=(await getAll()).sort((a,b)=>(b.updated||0)-(a.updated||0));$("#total").textContent=comics.length;$("#read").textContent=comics.filter(c=>c.status==="Lu").length;$("#unread").textContent=comics.filter(c=>c.status!=="Lu").length;$("#fav").textContent=comics.filter(c=>c.favorite).length;await grid($("#recent"),comics.slice(0,8),8);await renderCollection();await grid($("#favGrid"),comics.filter(c=>c.favorite),60);await car();renderSeries();boxes();await search();$("#localState").textContent=comics.length?`Base V5 locale : ${comics.length} comics.`:"Base V5 vide. Lance l’installation des 54 comics préparés."}
(async()=>{try{await openDB();await refresh()}catch(e){console.error(e);alert("Impossible d’ouvrir Comic Vault V5.")}})();
/* V5.3 HUD — visual behavior only */
function vaultClock(){
 const el=document.getElementById("vaultClock"); if(!el)return;
 const d=new Date(); el.textContent=d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})+" // "+d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
}
vaultClock(); setInterval(vaultClock,30000);

function animateCounters(){
 document.querySelectorAll(".stats b").forEach(el=>{
   let target=parseInt(el.textContent,10); if(!Number.isFinite(target))return;
   let start=performance.now(),dur=520;
   function tick(now){let p=Math.min(1,(now-start)/dur),e=1-Math.pow(1-p,3);el.textContent=Math.round(target*e);if(p<1)requestAnimationFrame(tick)}
   requestAnimationFrame(tick);
 });
}
setTimeout(animateCounters,3900);

document.addEventListener("click",e=>{
 const card=e.target.closest(".card,.seriesComic,.group");
 if(card){card.classList.remove("hud-tap");void card.offsetWidth;card.classList.add("hud-tap")}
});

/* V5.4 CINEMATIC HUD — visual effects only */
(function(){
 const root=document.documentElement;
 function setGlow(img){
   if(!img||!img.src)return;
   root.style.setProperty("--active-cover",`url("${img.src}")`);
 }
 document.addEventListener("click",e=>{
   const card=e.target.closest(".card,.seriesComic");
   if(card){
     const img=card.querySelector("img"); setGlow(img);
     if(img) cinematicOpen(img);
   }
 });
 function cinematicOpen(img){
   const o=document.getElementById("cinematicOverlay"); if(!o)return;
   const c=o.querySelector(".cinematic-cover");
   c.style.backgroundImage=`url("${img.src}")`;
   const r=img.getBoundingClientRect();
   c.style.setProperty("--sx",r.left+"px"); c.style.setProperty("--sy",r.top+"px");
   c.style.setProperty("--sw",r.width+"px"); c.style.setProperty("--sh",r.height+"px");
   o.classList.remove("play"); void o.offsetWidth; o.classList.add("play");
   setTimeout(()=>o.classList.remove("play"),1450);
 }
 const wrap=document.getElementById("carWrap");
 if(wrap){
   let x0=0;
   wrap.addEventListener("touchstart",e=>{x0=e.touches[0].clientX;wrap.classList.add("swiping")},{passive:true});
   wrap.addEventListener("touchmove",e=>{
     let dx=e.touches[0].clientX-x0;
     wrap.style.setProperty("--swipe",Math.max(-1,Math.min(1,dx/140)));
   },{passive:true});
   wrap.addEventListener("touchend",()=>{wrap.classList.remove("swiping");wrap.classList.add("swipe-release");setTimeout(()=>wrap.classList.remove("swipe-release"),380);wrap.style.setProperty("--swipe",0)},{passive:true});
 }
 const oldCar=window.car;
 if(typeof oldCar==="function"){
   window.car=async function(){await oldCar.apply(this,arguments);const img=document.querySelector('#carousel .ci[data-p="0"] img');setGlow(img)}
 }
 setTimeout(()=>setGlow(document.querySelector('#carousel .ci[data-p="0"] img')),4200);
})();

/* V5.5.1 live entry counter — visual only */
let heroEntryShown = 0;
function updateHeroEntries(animated=true){
 const el=document.getElementById("heroEntries"); if(!el)return;
 const target=Array.isArray(comics)?comics.length:0;
 if(!animated){heroEntryShown=target;el.textContent=target+" ENTRIES";return;}
 const from=heroEntryShown, start=performance.now(), dur=650;
 function tick(now){
   const p=Math.min(1,(now-start)/dur), e=1-Math.pow(1-p,3);
   const n=Math.round(from+(target-from)*e);
   el.textContent=n+" ENTRIES";
   if(p<1)requestAnimationFrame(tick); else heroEntryShown=target;
 }
 requestAnimationFrame(tick);
}
setTimeout(()=>updateHeroEntries(true),4100);
const _refreshV551=refresh;
refresh=async function(){
 const result=await _refreshV551.apply(this,arguments);
 updateHeroEntries(true);
 return result;
};
