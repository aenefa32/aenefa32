/* AeneFlow - sw.js: service worker. Hanya menyimpan cangkang aplikasi (file statis same-origin) agar bisa dibuka cepat/instal sebagai PWA.
   Data bisnis (panggilan API) TIDAK pernah disimpan. Strategi (v20): cache dulu untuk buka instan, lalu diperbarui diam-diam di latar belakang (versi baru aktif pada pembukaan berikutnya). */
const CACHE='aeneflow-shell-v21',SHELL=['./','index.html','app.css','app.js','import.js','import.css','theme.css','theme.js','calc.js','ui.js','pdf.js','pdf-lib.min.js','invoice.js','master.js','settings.js','reports.js','cashflow.js','config.js','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==self.location.origin||u.pathname.indexOf('/api')===0)return;
 e.respondWith(caches.match(r).then(m=>{const net=fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;});
  if(m){net.catch(()=>{});return m;}return net.catch(()=>caches.match('index.html'));}));});
