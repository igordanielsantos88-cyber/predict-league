// Apenas receção de push. Sem cache, modo offline ou interceção de pedidos.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data?.json() || {} } catch { /* aviso genérico */ }
  const title = typeof data.title === 'string' ? data.title.slice(0, 100) : 'Predict League'
  const body = typeof data.body === 'string' ? data.body.slice(0, 500) : 'Tens uma nova notificação. Abre o Predict League.'
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: '/pwa-icons/icon-192.png',
    tag: typeof data.tag === 'string' ? data.tag.slice(0, 100) : undefined,
    data: { matchId: data.matchId },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const destino = new URL('/', self.location.origin)
    const matchId = event.notification.data?.matchId
    if (typeof matchId === 'string' && matchId.length === 36 && uuid.test(matchId)) {
      destino.searchParams.set('jogo', matchId.toLowerCase())
    }
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const janela of janelas) {
      if (new URL(janela.url).origin !== destino.origin) continue
      try {
        const alvo = destino.search ? await janela.navigate(destino.href) : janela
        if (!alvo) continue
        await alvo.focus()
        return
      } catch { /* tenta outra janela ou abre uma nova */ }
    }
    await self.clients.openWindow(destino.href)
  })())
})
