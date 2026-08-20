
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
async function refresh(){comics=(await all()).sort((a,b)=>(b.updated||0)-(a.updated||0));$("#sTotal").textContent=comics.length;$("#sRead").textContent=comics.filter(x=>x.status==="Lu").length;$("#sUnread").textContent=comics.filter(x=>x.status!=="Lu").length;$("#sFav").textContent=comics.filter(x=>x.favorite).length;renderGrid($("#recent"),comics.slice(0,6));renderGrid($("#collectionGrid"),comics);renderGrid($("#favGrid"),comics.filter(x=>x.favorite));doSearch()}
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
(async()=>{await openDB();await refresh();if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js")})();
