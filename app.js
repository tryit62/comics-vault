const DB="comic-vault", STORE="comics";
let db, comics=[], carouselIndex=0, collectionMode="carousel", dragStartX=null, dragDelta=0, previousView="collection";
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const esc=s=>(s??"").toString().replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function openDB(){
 return new Promise((res,rej)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id"})};
  r.onsuccess=e=>{db=e.target.result;res()};
  r.onerror=()=>rej(r.error);
  r.onblocked=()=>rej(new Error("Base de données bloquée"));
 });
}
function tx(mode="readonly"){return db.transaction(STORE,mode).objectStore(STORE)}
function all(){return new Promise((res,rej)=>{let r=tx().getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
function put(x){return new Promise((res,rej)=>{let r=tx("readwrite").put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}
function del(id){return new Promise((res,rej)=>{let r=tx("readwrite").delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)})}

function card(c){return `<article class="card" data-id="${esc(c.id)}"><div class="cover">${c.cover?`<img src="${c.cover}" alt="">`:"▣"}</div><div class="meta"><strong>${esc(c.title||"Sans titre")}</strong><small>${esc(c.series||c.publisher||"")}</small><div class="tag">${esc(c.status||"À lire")}${c.rating?` · ${esc(c.rating)}/10`:""}${c.favorite?" · ★":""}</div></div></article>`}
function renderGrid(el,list){if(!el)return;el.innerHTML=list.length?list.map(card).join(""):`<p class="muted">Aucun comics ici pour le moment.</p>`;el.querySelectorAll(".card").forEach(x=>x.onclick=()=>showDetail(x.dataset.id))}
function searchable(c){return Object.values(c).filter(v=>typeof v==="string").join(" ").toLowerCase()}

function view(id){
 $$(".view").forEach(x=>x.classList.toggle("active",x.id===id));
 $$("nav button[data-view]").forEach(x=>x.classList.toggle("active",x.dataset.view===id));
 $("#moreNav")?.classList.toggle("active",["boxes","favorites","settings"].includes(id));
 if(id==="seriesView")renderSeries();
}

function clearForm(){
 $("#comicForm")?.reset(); $("#comicId").value=""; $("#coverPreview").src="";
 $("#deleteBtn").style.visibility="hidden"; $("#formTitle").textContent="Ajouter un comics";
 if($("#smartIsbn"))$("#smartIsbn").value="";
 if($("#smartStatus")){$("#smartStatus").textContent="Entre l’ISBN/EAN pour préremplir automatiquement la fiche." ;$("#smartStatus").className="smartStatus"}
}
function add(){clearForm();$("#editor").showModal()}
["#addTop","#addHero","#addCollection"].forEach(s=>$(s)?.addEventListener("click",add));
$("#closeModal")?.addEventListener("click",()=>$("#editor").close());
$("#cover")?.addEventListener("change",e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader;r.onload=()=>$("#coverPreview").src=r.result;r.readAsDataURL(f)});

const FIELDS=["title","series","issue","publisher","year","isbn","storyArc","editorialCollection","writer","artist","status","rating","characters","keywords","box","position","location","summary","review"];
function edit(id){
 let c=comics.find(x=>x.id===id);if(!c)return;
 clearForm();$("#comicId").value=c.id;
 FIELDS.forEach(k=>{let e=$("#"+k);if(e)e.value=c[k]??""});
 $("#favorite").checked=!!c.favorite;$("#coverPreview").src=c.cover||"";
 if($("#smartIsbn"))$("#smartIsbn").value=c.isbn||"";
 $("#deleteBtn").style.visibility="visible";$("#formTitle").textContent="Modifier le comics";$("#editor").showModal();
}
$("#comicForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 try{
  let id=$("#comicId").value||crypto.randomUUID(),old=comics.find(x=>x.id===id)||{};
  let c={...old,id,updated:Date.now(),cover:$("#coverPreview").src||old.cover||"",favorite:$("#favorite").checked};
  FIELDS.forEach(k=>{let el=$("#"+k);if(el)c[k]=el.value.trim()});
  await put(c);$("#editor").close();await refresh();
 }catch(err){alert("Impossible d’enregistrer pour le moment. Tes données existantes n’ont pas été supprimées.")}
});
$("#deleteBtn")?.addEventListener("click",async()=>{let id=$("#comicId").value;if(id&&confirm("Supprimer ce comics ?")){await del(id);$("#editor").close();await refresh()}});

function showDetail(id){
 let c=comics.find(x=>x.id===id);if(!c)return;
 previousView=document.querySelector(".view.active")?.id||"collection";
 let place=[c.box,c.position&&"Position "+c.position,c.location].filter(Boolean).join(" · ");
 let chips=[c.status,c.rating?c.rating+"/10":"",c.favorite?"★ Favori":"",place?"📦 "+place:""].filter(Boolean);
 $("#detailContent").innerHTML=`<div class="detailHero">${c.cover?`<img class="detailCover" src="${c.cover}" alt="">`:`<div class="detailCover"></div>`}<div class="detailInfo"><h1>${esc(c.title)}</h1><div class="detailSub">${esc([c.series,c.issue,c.publisher,c.year].filter(Boolean).join(" · "))}</div><div class="chips">${chips.map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div><p>${esc([c.writer&&"Scénario : "+c.writer,c.artist&&"Dessin : "+c.artist].filter(Boolean).join(" · "))}</p><div class="detailActions"><button id="detailEdit">Modifier</button></div></div></div>${c.storyArc?`<div class="detailBlock"><b>Arc narratif</b><p>${esc(c.storyArc)}</p></div>`:""}${c.characters?`<div class="detailBlock"><b>Personnages</b><p>${esc(c.characters)}</p></div>`:""}${c.summary?`<div class="detailBlock"><b>Résumé</b><p>${esc(c.summary)}</p></div>`:""}${c.review?`<div class="detailBlock"><b>Mon avis</b><p>${esc(c.review)}</p></div>`:""}`;
 $("#detailEdit").onclick=()=>edit(c.id);view("detail");
}
$("#backDetail")?.addEventListener("click",()=>view(previousView==="detail"?"collection":previousView));

/* ---------- SERIES INTELLIGENTES ---------- */
function normalizeSeriesName(s){
 return (s||"").trim().replace(/\s+/g," ");
}
function inferredSeries(c){
 let explicit=normalizeSeriesName(c.series);
 if(explicit)return {name:explicit,inferred:false};
 // Conservative inference from title: remove common trailing tome/volume/number markers.
 let t=normalizeSeriesName(c.title);
 if(!t)return {name:"Série non renseignée",inferred:true};
 let base=t
   .replace(/\s*[-–—:]\s*(?:tome|t\.?|vol(?:ume)?\.?|n[°ºo]?|#)\s*\d+(?:[.,]\d+)?\s*$/i,"")
   .replace(/\s+(?:tome|t\.?|vol(?:ume)?\.?|n[°ºo]?|#)\s*\d+(?:[.,]\d+)?\s*$/i,"")
   .trim();
 return {name:base&&base!==t?base:"Série non renseignée",inferred:true};
}
function tomeNumber(c){
 let raw=(c.issue||"").toString().trim();
 let m=raw.match(/\d+(?:[.,]\d+)?/);
 if(m)return parseFloat(m[0].replace(",","."));
 // Fallback only for obvious Tome/Vol/# markers in title.
 let t=(c.title||"");
 m=t.match(/(?:tome|t\.?|vol(?:ume)?\.?|n[°ºo]?|#)\s*(\d+(?:[.,]\d+)?)/i);
 return m?parseFloat(m[1].replace(",",".")):Number.POSITIVE_INFINITY;
}
function compareTomes(a,b){
 let na=tomeNumber(a),nb=tomeNumber(b);
 if(na!==nb)return na-nb;
 return (a.title||"").localeCompare(b.title||"","fr",{numeric:true,sensitivity:"base"});
}
function buildSeriesGroups(){
 const groups=new Map();
 comics.forEach(c=>{
   const inf=inferredSeries(c), key=inf.name.toLocaleLowerCase("fr");
   if(!groups.has(key))groups.set(key,{name:inf.name,items:[],inferredOnly:true});
   const g=groups.get(key);g.items.push(c);if(!inf.inferred)g.inferredOnly=false;
 });
 groups.forEach(g=>g.items.sort(compareTomes));
 return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,"fr",{numeric:true,sensitivity:"base"}));
}
function renderSeries(filter=""){
 const grid=$("#seriesGrid"),detail=$("#seriesDetail");if(!grid)return;
 detail.hidden=true;grid.hidden=false;
 let q=(filter||$("#seriesSearch")?.value||"").trim().toLowerCase();
 let groups=buildSeriesGroups().filter(g=>!q||g.name.toLowerCase().includes(q)||g.items.some(c=>searchable(c).includes(q)));
 grid.innerHTML=groups.length?groups.map((g,i)=>{
   let nums=g.items.map(tomeNumber).filter(Number.isFinite);
   let range=nums.length?`Tomes ${Math.min(...nums)}${Math.max(...nums)!==Math.min(...nums)?" → "+Math.max(...nums):""}`:"Ordre par titre";
   return `<div class="groupCard seriesCard ${g.inferredOnly?"seriesUnknown":""}" data-series-index="${i}" data-series-key="${esc(g.name)}"><strong>${esc(g.name)}</strong><small class="seriesCount">${g.items.length} comic${g.items.length>1?"s":""}</small><small class="seriesRange">${esc(range)}</small></div>`;
 }).join(""):'<p class="muted">Aucune série correspondante.</p>';
 grid.querySelectorAll(".seriesCard").forEach(card=>card.onclick=()=>openSeries(card.dataset.seriesKey));
 const unknown=buildSeriesGroups().filter(g=>g.name==="Série non renseignée").reduce((n,g)=>n+g.items.length,0);
 $("#seriesNotice").textContent=unknown?`${unknown} comics n’ont pas encore de série identifiable. Utilise « Retrouver les séries » pour les repérer et les compléter.`:"Toutes les fiches ont une série renseignée ou identifiable.";
}
function openSeries(name){
 const g=buildSeriesGroups().find(x=>x.name===name);if(!g)return;
 $("#seriesGrid").hidden=true;$("#seriesDetail").hidden=false;
 $("#seriesDetail").innerHTML=`<div class="seriesDetailHead"><div><button id="backSeries" class="ghost">← Séries</button><h2>${esc(g.name)}</h2></div><small>${g.items.length} comics · classés par tome</small></div><div class="seriesComics">${g.items.map(c=>`<article class="seriesComic" data-id="${esc(c.id)}"><div class="cover">${c.cover?`<img src="${c.cover}" alt="">`:"▣"}</div><div class="seriesComicMeta"><strong>${esc(c.title||"Sans titre")}</strong><small>${Number.isFinite(tomeNumber(c))?"Tome "+tomeNumber(c):esc(c.issue||"Tome non renseigné")}</small></div></article>`).join("")}</div>`;
 $("#backSeries").onclick=()=>renderSeries();
 $("#seriesDetail").querySelectorAll(".seriesComic").forEach(x=>x.onclick=()=>showDetail(x.dataset.id));
}
$("#seriesSearch")?.addEventListener("input",e=>renderSeries(e.target.value));
$("#detectSeriesBtn")?.addEventListener("click",()=>{
 const missing=comics.filter(c=>!normalizeSeriesName(c.series));
 if(!missing.length){alert("Toutes tes fiches ont déjà une série renseignée.");return}
 $("#seriesSearch").value="Série non renseignée";renderSeries("Série non renseignée");
 alert(`${missing.length} comics sans série renseignée ont été retrouvés. Ouvre leurs fiches pour compléter le champ Série. Les titres contenant clairement “Tome”, “Vol.” ou “#” sont regroupés automatiquement quand c’est possible.`);
});

/* ---------- BOITES ---------- */
function renderBoxes(){
 let bg={};comics.filter(c=>c.box).forEach(c=>{let k=c.box.trim();(bg[k]??=[]).push(c)});
 $("#boxesGrid").innerHTML=Object.entries(bg).sort((a,b)=>a[0].localeCompare(b[0],"fr",{numeric:true})).map(([k,v])=>`<div class="groupCard" data-box="${esc(k)}"><strong>📦 ${esc(k)}</strong><small>${v.length} comic${v.length>1?"s":""}</small></div>`).join("")||'<p class="muted">Ajoute un nom de boîte dans tes fiches pour les voir ici.</p>';
 $("#boxesGrid").querySelectorAll(".groupCard").forEach(x=>x.onclick=()=>{$("#searchInput").value=x.dataset.box;view("search");doSearch()});
}

/* ---------- RECHERCHE ---------- */
function doSearch(){
 let q=$("#searchInput")?.value.trim().toLowerCase()||"",list=[...comics];
 if(q)list=list.filter(c=>searchable(c).includes(q));
 let st=$("#filterStatus")?.value,fav=$("#filterFavorite")?.value,min=Number($("#filterRating")?.value||0),sort=$("#sortBy")?.value;
 if(st)list=list.filter(c=>c.status===st);if(fav==="yes")list=list.filter(c=>c.favorite);if(min)list=list.filter(c=>Number(c.rating||0)>=min);
 if(sort==="title")list.sort((a,b)=>(a.title||"").localeCompare(b.title||"","fr"));
 if(sort==="series")list.sort((a,b)=>(a.series||"").localeCompare(b.series||"","fr"));
 if(sort==="rating")list.sort((a,b)=>Number(b.rating||0)-Number(a.rating||0));
 renderGrid($("#searchGrid"),list);
}
["#searchInput","#filterStatus","#filterFavorite","#filterRating","#sortBy"].forEach(s=>$(s)?.addEventListener("input",doSearch));

/* ---------- CARROUSEL ---------- */
function relativePos(i){let n=comics.length;if(!n)return 99;let d=i-carouselIndex;if(d>n/2)d-=n;if(d<-n/2)d+=n;return d}
function renderCarousel(){
 let stage=$("#carouselStage"),info=$("#carouselInfo"),back=$("#collectionBackdrop");if(!stage)return;
 if(!comics.length){stage.innerHTML='<p class="muted" style="text-align:center;padding-top:120px">Ajoute ton premier comics pour commencer le carrousel.</p>';info.innerHTML="";back.style.opacity=0;return}
 carouselIndex=((carouselIndex%comics.length)+comics.length)%comics.length;
 stage.innerHTML=comics.map((c,i)=>{let p=relativePos(i),cls=Math.abs(p)>2?"carouselItem far":"carouselItem";return `<article class="${cls}" data-index="${i}" data-pos="${Math.max(-2,Math.min(2,p))}">${c.cover?`<img src="${c.cover}" alt="${esc(c.title)}">`:`<div class="carouselFallback">▣</div>`}</article>`}).join("");
 let c=comics[carouselIndex],place=[c.box,c.position&&"Position "+c.position].filter(Boolean).join(" · ");
 info.innerHTML=`<h2>${esc(c.title)}</h2><div class="carouselSub">${esc([c.series,c.issue,c.year].filter(Boolean).join(" · "))}</div><div class="carouselMeta">${[c.status,c.rating?c.rating+"/10":"",c.favorite?"★ Favori":"",place?"📦 "+place:""].filter(Boolean).map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div>`;
 if(c.cover){back.style.backgroundImage=`url("${c.cover.replace(/"/g,"%22")}")`;back.style.opacity=.22}else back.style.opacity=0;
 stage.querySelectorAll(".carouselItem").forEach(el=>el.onclick=()=>{let i=Number(el.dataset.index),p=relativePos(i);if(p===0)showDetail(comics[i].id);else{carouselIndex=i;renderCarousel()}});
}
function carouselMove(step){if(comics.length){carouselIndex=(carouselIndex+step+comics.length)%comics.length;renderCarousel()}}
function setCollectionMode(mode){collectionMode=mode;let car=mode==="carousel";$("#carouselWrap").hidden=!car;$("#collectionGrid").hidden=car;$("#modeCarousel").classList.toggle("active",car);$("#modeGrid").classList.toggle("active",!car)}
$("#modeCarousel")?.addEventListener("click",()=>setCollectionMode("carousel"));$("#modeGrid")?.addEventListener("click",()=>setCollectionMode("grid"));
const carWrap=$("#carouselWrap");
if(carWrap){
 carWrap.addEventListener("touchstart",e=>{dragStartX=e.touches[0].clientX;dragDelta=0},{passive:true});
 carWrap.addEventListener("touchmove",e=>{if(dragStartX!==null)dragDelta=e.touches[0].clientX-dragStartX},{passive:true});
 carWrap.addEventListener("touchend",()=>{if(Math.abs(dragDelta)>45)carouselMove(dragDelta<0?1:-1);dragStartX=null;dragDelta=0});
}

/* ---------- ISBN ---------- */
(() => {
 const clean=v=>(v||"").replace(/[^0-9Xx]/g,""),msg=(m,k="")=>{let e=$("#smartStatus");if(e){e.textContent=m;e.className="smartStatus "+k}},set=(id,v,force=false)=>{let e=$("#"+id);if(e&&v&&(force||!e.value))e.value=v};
 async function lookup(){
  let code=clean($("#smartIsbn")?.value||$("#isbn")?.value);if(![10,13].includes(code.length)){msg("Entre un ISBN de 10 ou 13 caractères.","warn");return}
  $("#smartIsbn").value=code;set("isbn",code,true);let dup=comics.find(c=>clean(c.isbn)===code&&c.id!==$("#comicId").value);msg(dup?`⚠️ Déjà présent : ${dup.title||"comics"}. Vérification…`:"Recherche des informations…",dup?"warn":"");$("#smartLookupBtn").disabled=true;let found=false;
  try{let r=await fetch("https://www.googleapis.com/books/v1/volumes?q="+encodeURIComponent("isbn:"+code)+"&maxResults=10");let d=await r.json(),a=d.items||[],g=a[0];if(g){let v=g.volumeInfo||{};set("title",v.title,true);set("publisher",v.publisher,true);set("year",(v.publishedDate||"").slice(0,4),true);set("writer",(v.authors||[]).join(", "),true);found=!!v.title}}catch(e){}
  msg(found?(dup?"⚠️ Doublon détecté. Informations trouvées.":"Informations trouvées. Vérifie l’édition."):"Aucune fiche automatique trouvée. Tu peux remplir manuellement.",dup?"warn":found?"ok":"error");$("#smartLookupBtn").disabled=false;
 }
 $("#smartLookupBtn")?.addEventListener("click",lookup);$("#smartIsbn")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();lookup()}});
})();

/* ---------- SAUVEGARDE ---------- */
$("#exportBtn")?.addEventListener("click",()=>{let blob=new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),comics},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="comic-vault-sauvegarde.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
$("#importFile")?.addEventListener("change",async e=>{let f=e.target.files[0];if(!f)return;try{let d=JSON.parse(await f.text()),list=Array.isArray(d)?d:d.comics;if(!Array.isArray(list))throw 0;for(let c of list)await put(c);await refresh();alert("Import terminé.")}catch{alert("Fichier de sauvegarde invalide.")}});

/* ---------- NAVIGATION ---------- */
$$("nav button[data-view]").forEach(b=>b.onclick=()=>{view(b.dataset.view);$("#moreMenu").hidden=true});
$("#moreNav")?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();$("#moreMenu").hidden=!$("#moreMenu").hidden});
$("#moreMenu")?.addEventListener("click",e=>e.stopPropagation());
$$("[data-more-view]").forEach(b=>b.onclick=()=>{view(b.dataset.moreView);$("#moreMenu").hidden=true});
document.addEventListener("click",()=>{if($("#moreMenu"))$("#moreMenu").hidden=true});

async function refresh(){
 comics=(await all()).sort((a,b)=>(b.updated||0)-(a.updated||0));
 $("#sTotal").textContent=comics.length;$("#sRead").textContent=comics.filter(x=>x.status==="Lu").length;$("#sUnread").textContent=comics.filter(x=>x.status!=="Lu").length;$("#sFav").textContent=comics.filter(x=>x.favorite).length;
 renderGrid($("#recent"),comics.slice(0,6));renderGrid($("#collectionGrid"),comics);renderCarousel();renderGrid($("#favGrid"),comics.filter(x=>x.favorite));doSearch();renderBoxes();renderSeries();
}
(async()=>{
 try{
  await openDB();await refresh();
  if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
 }catch(err){
  console.error(err);
  document.body.insertAdjacentHTML("afterbegin",'<div style="position:fixed;z-index:99999;left:10px;right:10px;top:10px;background:#40131a;color:white;padding:12px;border-radius:10px">Comic Vault n’a pas pu ouvrir la base locale. Ne supprime pas les données Safari. Recharge une fois la page.</div>');
 }
})();
