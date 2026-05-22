self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Daniela Palacio', {
      body: data.body ?? '',
      icon: '/gallery/daniela-hero.jpg',
      badge: '/gallery/daniela-hero.jpg',
      tag: data.tag ?? 'dp-admin',
      renotify: true,
      data: { url: data.url ?? '/admin' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/admin') && 'focus' in client) return client.focus();
      }
      return clients.openWindow(event.notification.data?.url ?? '/admin');
    })
  );
});
