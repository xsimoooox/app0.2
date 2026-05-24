const CACHE_NAME = 'wakwak-v2';
const ASSETS = ['/', '/index.html', '/manifest.json'];

const DEFAULT_API = 'http://localhost:3001';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(e.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match('/index.html'));
    }),
  );
});

self.addEventListener('push', (e) => {
  if (!e.data) return;

  let data = {};
  try {
    data = e.data.json();
  } catch {
    data = { body: e.data.text() };
  }

  if (data.type === 'incoming_call') {
    const options = {
      body: `${data.callerName || data.callerPhone} vous appelle`,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [400, 200, 400, 200, 400, 200, 400],
      tag: 'incoming-call',
      renotify: true,
      requireInteraction: true,
      data: {
        callerPhone: data.callerPhone,
        targetPhone: data.targetPhone,
        url: data.url || `/?action=accept_call&from=${encodeURIComponent(data.callerPhone || '')}`,
        apiBase: data.apiBase || DEFAULT_API,
      },
      actions: [
        { action: 'accept', title: '✅ Accepter' },
        { action: 'reject', title: '❌ Refuser' },
      ],
    };

    e.waitUntil(
      self.registration.showNotification('📞 Appel entrant — WakWak', options),
    );
    return;
  }

  const code = data.codeSession || data.code || '';
  e.waitUntil(
    self.registration.showNotification(data.title || '📞 Appel entrant', {
      body: data.body || (code ? `Code : ${code}` : 'Nouvel appel WakWak'),
      data: { codeSession: code, type: data.type || 'incoming_call' },
      actions: code ? [{ action: 'join', title: 'Rejoindre' }] : [],
    }),
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const data = e.notification.data || {};

  if (e.action === 'accept') {
    const url = data.url || `/?action=accept_call&from=${encodeURIComponent(data.callerPhone || '')}`;
    e.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].focus();
          if ('navigate' in clientList[0]) {
            return clientList[0].navigate(url);
          }
          return undefined;
        }
        return self.clients.openWindow(url);
      }),
    );
    return;
  }

  if (e.action === 'reject') {
    const apiBase = data.apiBase || DEFAULT_API;
    e.waitUntil(
      fetch(`${apiBase}/reject-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerPhone: data.callerPhone,
          targetPhone: data.targetPhone,
        }),
      }),
    );
    return;
  }

  const code = data.codeSession || '';
  const url = code
    ? `/call/c1?code=${encodeURIComponent(code)}`
    : data.url || '/';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        if ('navigate' in existing) existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
