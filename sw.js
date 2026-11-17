const CACHE_PREFIX = 'peliculon-pwa-';
const CACHE_NAME = CACHE_PREFIX + 'v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // La nueva versión queda lista y espera a que el usuario pulse "Actualizar".
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if(event.data && event.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req=event.request;
  const url=new URL(req.url);
  if(req.method!=='GET' || url.origin!==self.location.origin) return;

  // HTML: intenta primero la versión publicada más reciente; si no hay conexión, usa caché.
  if(req.mode==='navigate' || req.destination==='document'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh && fresh.ok){
          const cache=await caches.open(CACHE_NAME);
          cache.put('./index.html',fresh.clone()).catch(()=>{});
        }
        return fresh;
      }catch(err){
        return (await caches.match(req)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Archivos propios: red primero para recibir cambios; caché como respaldo sin conexión.
  event.respondWith((async()=>{
    try{
      const fresh=await fetch(req);
      if(fresh && fresh.ok){
        const cache=await caches.open(CACHE_NAME);
        cache.put(req,fresh.clone()).catch(()=>{});
      }
      return fresh;
    }catch(err){
      return (await caches.match(req)) || Response.error();
    }
  })());
});
