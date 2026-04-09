// B3 Monitor — Service Worker
// Incrementar CACHE_VERSION força o navegador a instalar nova versão
// sem precisar desinstalar o app.
const CACHE_VERSION = "v1";
const CACHE_NAME = `b3-monitor-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/js/api.js",
  "/js/config.js",
  "/js/storage.js",
  "/js/ui.js",
  "/js/alerts.js",
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"
];

// ----- Install: pre-cache app shell -----
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Não espera que abas antigas fechem para ativar.
  self.skipWaiting();
});

// ----- Activate: limpa caches antigos -----
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("b3-monitor-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  // Assume controle imediato das abas abertas.
  self.clients.claim();
});

// ----- Fetch: network-first para API, cache-first para app shell -----
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Requisições para a brapi nunca ficam em cache (dados em tempo real).
  if (url.hostname === "brapi.dev") {
    event.respondWith(fetch(request));
    return;
  }

  // Estratégia: network-first com fallback para cache.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Armazena cópia fresca no cache.
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ----- Mensagem da aba: forçar atualização imediata -----
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
