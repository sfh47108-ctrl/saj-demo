/* SAJ Portal service worker (v60): lets the app install and open fast. Never touches /api or Firebase data. */
const V="saj-v60",SHELL=["/","/css/style.css","/js/app.js","/js/reports.js","/assets/logo.jpg","/assets/omys.jpg","/icons/icon-192.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=="GET"||u.origin!==location.origin||u.pathname.startsWith("/api/"))return;
 e.respondWith(fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(V).then(h=>h.put(r.mode==="navigate"?"/":r,c))}return x}).catch(()=>caches.match(r.mode==="navigate"?"/":r).then(m=>m||new Response("You are offline. Please connect to the internet and open the app again.",{status:503,headers:{"Content-Type":"text/plain"}}))))});
