const CACHE="comic-vault-stable-series-1";
const ASSETS=["./","index.html","style.css","app.js","manifest.webmanifest","apple-touch-icon-180.png","icon-192.png","icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.filter(Boolean))).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);
 if(u.origin===location.origin && (u.pathname.endsWith(".html")||u.pathname.endsWith(".js")||u.pathname.endsWith(".css")||u.pathname.endsWith("/comics-vault/")||u.pathname.endsWith("/comics-vault"))){
   e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
 }else{
   e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
 }
});