// Apenas receção de push. Sem cache, modo offline ou interceção de pedidos.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data?.json() || {} } catch { /* aviso genérico */ }
  const title = typeof data.title === 'string' ? data.title.slice(0, 100) : 'Predict League'
  const body = typeof data.body === 'string' ? data.body.slice(0, 500) : 'Tens uma nova notificação. Abre o Predict League.'
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: '/pwa-icons/icon-192.png',
    tag: typeof data.tag === 'string' ? data.tag.slice(0, 100) : undefined,
    data: { url: '/' },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const janela of janelas) {
      if (new URL(janela.url).origin === self.location.origin && 'focus' in janela) {
        await janela.focus()
        return
      }
    }
    await self.clients.openWindow(new URL('/', self.location.origin).href)
  })())
})
