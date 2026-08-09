self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('💊 Controle de Remédios', {
      body: '🔔 Notificação de teste funcionando!',
      icon: '/controle-remedios/favicon.ico',
      badge: '/controle-remedios/favicon.ico'
    });
  }
});
