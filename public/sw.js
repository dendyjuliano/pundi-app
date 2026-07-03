// Service worker khusus buat push notification — sengaja TIDAK cache
// apa pun (tidak ada `fetch` handler), sesuai keputusan awal PWA ini
// "installable only" tanpa offline caching (biar data finance selalu
// fresh, tidak ada resiko data lama ke-cache di device orang lain).

// Tanpa dua baris ini, versi baru service worker ini bakal "nyangkut" di
// status waiting sampai SEMUA tab yang pakai versi lama ditutup dulu —
// aktivasi jadi tidak langsung kepakai (butuh reload manual/tunggu lama).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Pundi", body: event.data.text() };
  }

  const options = {
    body: payload.body,
    icon: "/manifest-icon-192.png",
    badge: "/manifest-icon-192.png",
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "Pundi", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(self.clients.openWindow(url));
});
