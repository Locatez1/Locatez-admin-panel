// Firebase Messaging Service Worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const defaultConfig = {
  apiKey: "AIzaSyAgF5gbH1zw-ZtDNgouGah_t1SFETUiPzI",
  authDomain: "vyeo-1d565.firebaseapp.com",
  projectId: "vyeo-1d565",
  storageBucket: "vyeo-1d565.firebasestorage.app",
  messagingSenderId: "1014578162023",
  appId: "1:1014578162023:web:73e7427e2c9b02da93e7c2"
};

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(defaultConfig);
  }

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || payload.data?.message || payload.data?.content || '',
      icon: payload.notification?.icon || payload.data?.icon || '/favicon.svg',
      data: {
        ...(payload.data || {}),
        path: payload.data?.path || '',
        link: payload.data?.link || '',
      },
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error('[firebase-messaging-sw.js] Service Worker init error:', error);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let target = data.link || data.path || '/';
  if (typeof target === 'string' && target.startsWith('/') && self.location?.origin) {
    target = self.location.origin + target;
  }
  if (!target || target === '/') {
    target = self.location?.origin || '/';
  }

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && typeof client.navigate === 'function') {
            try {
              await client.navigate(target);
              return;
            } catch (_) {}
          }
          client.postMessage({ type: 'NOTIFICATION_NAVIGATE', path: data.path || target, link: target });
          return;
        }
      }
      if (clients.openWindow) {
        await clients.openWindow(target);
      }
    })()
  );
});
