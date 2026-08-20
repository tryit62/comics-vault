
const DB="comic-vault", STORE="comics"; let db, comics=[];
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function openDB(){return new Promise((res,rej)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=e=>e.target.result.createObjectStore(STORE,{keyPath:"id"});r.onsuccess=e=>{db=e.target.result;res()};r.onerror=rej})}
function tx(mode="readonly"){return db.transaction(STORE,mode).objectStore(STORE)}
function all(){return new Promise(res=>{let r=tx().getAll();r.onsuccess=()=>res(r.result)})}
function put(x){return new Promise(res=>{let r=tx("readwrite").put(x);r.onsuccess=res})}
function del(id){return new Promise(res=>{let r=tx("readwrite").delete(id);r.onsuccess=res})}
const esc=s=>(s??"").toString().replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function card(c){return `<article class="card" data-id="${c.id}"><div class="cover">${c.cover?`<img src="${c.cover}" alt="">`:"▣"}</div><div class="meta"><strong>${esc(c.title)}</strong><small>${esc(c.series||c.publisher||"")}</small><div class="tag">${esc(c.status||"À lire")}${c.rating?` · ${c.rating}/10`:""}${c.favorite?" · ★":""}</div></div></article>`}
function renderGrid(el,list){el.innerHTML=list.length?list.map(card).join(""):`<p style="color:#9299a7">Aucun comics ici pour le moment.</p>`;el.querySelectorAll(".card").forEach(x=>x.onclick=()=>edit(x.dataset.id))}
function searchable(c){return Object.values(c).filter(v=>typeof v==="string").join(" ").toLowerCase()}

let carouselIndex=0, collectionMode="carousel", dragStartX=null, dragDelta=0;
function relativePos(i){
  let n=comics.length;if(!n)return 99;
  let d=i-carouselIndex;
  if(d>n/2)d-=n;if(d<-n/2)d+=n;
  return d;
}
function renderCarousel(){
  let stage=$("#carouselStage"),info=$("#carouselInfo"),back=$("#collectionBackdrop");
  if(!stage)return;
  if(!comics.length){
    stage.innerHTML='<p class="muted" style="text-align:center;padding-top:120px">Ajoute ton premier comics pour commencer le carrousel.</p>';
    info.innerHTML="";back.style.opacity=0;return;
  }
  carouselIndex=((carouselIndex%comics.length)+comics.length)%comics.length;
  stage.innerHTML=comics.map((c,i)=>{
    let p=relativePos(i), cls=Math.abs(p)>2?"carouselItem far":"carouselItem";
    return `<article class="${cls}" data-index="${i}" data-pos="${Math.max(-2,Math.min(2,p))}">
      ${c.cover?`<img src="${c.cover}" alt="${esc(c.title)}">`:`<div class="carouselFallback">▣</div>`}
    </article>`;
  }).join("");
  let c=comics[carouselIndex], place=[c.box,c.position&&"Position "+c.position].filter(Boolean).join(" · ");
  info.innerHTML=`<h2>${esc(c.title)}</h2><div class="carouselSub">${esc([c.series,c.issue,c.year].filter(Boolean).join(" · "))}</div>
    <div class="carouselMeta">${[c.status,c.rating?c.rating+"/10":"",c.favorite?"★ Favori":"",place?"📦 "+place:""].filter(Boolean).map(x=>`<span class="chip">${esc(x)}</span>`).join("")}</div>`;
  if(c.cover){back.style.backgroundImage=`url("${c.cover.replace(/"/g,"%22")}")`;back.style.opacity=.22}else{back.style.opacity=0}
  stage.querySelectorAll(".carouselItem").forEach(el=>el.addEventListener("click",()=>{
    let i=Number(el.dataset.index),p=relativePos(i);
    if(p===0)showDetail(comics[i].id);else{carouselIndex=i;renderCarousel()}
  }));
}
function carouselMove(step){if(!comics.length)return;carouselIndex=(carouselIndex+step+comics.length)%comics.length;renderCarousel()}
function setCollectionMode(mode){
 collectionMode=mode;let car=mode==="carousel";
 $("#carouselWrap").hidden=!car;$("#collectionGrid").hidden=car;
 $("#modeCarousel").classList.toggle("active",car);$("#modeGrid").classList.toggle("active",!car);
}

async function refresh(){comics=(await all()).sort((a,b)=>(b.updated||0)-(a.updated||0));$("#sTotal").textContent=comics.length;$("#sRead").textContent=comics.filter(x=>x.status==="Lu").length;$("#sUnread").textContent=comics.filter(x=>x.status!=="Lu").length;$("#sFav").textContent=comics.filter(x=>x.favorite).length;renderGrid($("#recent"),comics.slice(0,6));renderGrid($("#collectionGrid"),comics);renderCarousel();renderGrid($("#favGrid"),comics.filter(x=>x.favorite));doSearch()}
function view(id){$$(".view").forEach(x=>x.classList.toggle("active",x.id===id));$$("nav button").forEach(x=>x.classList.toggle("active",x.dataset.view===id))}
$$("nav button").forEach(b=>b.onclick=()=>view(b.dataset.view));
function clearForm(){comicForm.reset();$("#comicId").value="";$("#coverPreview").src="";$("#deleteBtn").style.visibility="hidden";$("#formTitle").textContent="Ajouter un comics"}
function add(){clearForm();editor.showModal()}
["#addTop","#addHero","#addCollection"].forEach(s=>$(s).onclick=add);$("#closeModal").onclick=()=>editor.close();
$("#cover").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader;r.onload=()=>$("#coverPreview").src=r.result;r.readAsDataURL(f)}
function edit(id){let c=comics.find(x=>x.id===id);if(!c)return;clearForm();$("#comicId").value=c.id;["title","series","issue","publisher","year","isbn","writer","artist","status","rating","characters","keywords","location","summary","review"].forEach(k=>$("#"+k).value=c[k]??"");$("#favorite").checked=!!c.favorite;$("#coverPreview").src=c.cover||"";$("#deleteBtn").style.visibility="visible";$("#formTitle").textContent="Modifier le comics";editor.showModal()}
comicForm.onsubmit=async e=>{e.preventDefault();let id=$("#comicId").value||crypto.randomUUID();let old=comics.find(x=>x.id===id)||{};let c={id,updated:Date.now(),cover:$("#coverPreview").src||old.cover||"",favorite:$("#favorite").checked};["title","series","issue","publisher","year","isbn","writer","artist","status","rating","characters","keywords","location","summary","review"].forEach(k=>c[k]=$("#"+k).value.trim());await put(c);editor.close();await refresh()}
$("#deleteBtn").onclick=async()=>{let id=$("#comicId").value;if(id&&confirm("Supprimer ce comics ?")){await del(id);editor.close();await refresh()}}
function doSearch(){let q=$("#searchInput").value.trim().toLowerCase();renderGrid($("#searchGrid"),q?comics.filter(c=>searchable(c).includes(q)):comics)}
$("#searchInput").oninput=doSearch;
$("#exportBtn").onclick=()=>{let blob=new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),comics},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="comic-vault-sauvegarde.json";a.click();URL.revokeObjectURL(a.href)}
$("#importFile").onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let d=JSON.parse(await f.text()),list=Array.isArray(d)?d:d.comics;if(!Array.isArray(list))throw 0;for(let c of list)await put(c);await refresh();alert("Import terminé.")}catch{alert("Fichier de sauvegarde invalide.")}}

$("#modeCarousel").addEventListener("click",()=>setCollectionMode("carousel"));
$("#modeGrid").addEventListener("click",()=>setCollectionMode("grid"));
const carWrap=$("#carouselWrap");
carWrap.addEventListener("touchstart",e=>{dragStartX=e.touches[0].clientX;dragDelta=0},{passive:true});
carWrap.addEventListener("touchmove",e=>{if(dragStartX!==null)dragDelta=e.touches[0].clientX-dragStartX},{passive:true});
carWrap.addEventListener("touchend",()=>{if(Math.abs(dragDelta)>45)carouselMove(dragDelta<0?1:-1);dragStartX=null;dragDelta=0});
carWrap.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"){dragStartX=e.clientX;dragDelta=0}});
carWrap.addEventListener("pointermove",e=>{if(dragStartX!==null&&e.pointerType==="mouse")dragDelta=e.clientX-dragStartX});
carWrap.addEventListener("pointerup",e=>{if(dragStartX!==null&&e.pointerType==="mouse"&&Math.abs(dragDelta)>45)carouselMove(dragDelta<0?1:-1);dragStartX=null;dragDelta=0});

(async()=>{await openDB();await refresh();if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js")})();

// V2.3.2 robust More menu override
(() => {
 const moreBtn=document.querySelector("#moreNav"), menu=document.querySelector("#moreMenu");
 if(!moreBtn||!menu)return;
 moreBtn.onclick=(e)=>{e.preventDefault();e.stopPropagation();menu.hidden=!menu.hidden};
 menu.onclick=(e)=>e.stopPropagation();
 document.querySelectorAll("[data-more-view]").forEach(b=>{
   b.onclick=(e)=>{e.stopPropagation();view(b.dataset.moreView);menu.hidden=true};
 });
 document.addEventListener("click",()=>{menu.hidden=true});
})();
