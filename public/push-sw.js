self.addEventListener('push', (event) => {
  let payload = {}

  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }

  const title = payload.title || 'Regulski Behawiorysta'
  const options = {
    body: payload.body || 'Masz aktywne przypomnienie.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'regulski-reminder',
    data: {
      url: payload.url || '/',
    },
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Otwórz',
      },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }

      return undefined
    }),
  )
})
