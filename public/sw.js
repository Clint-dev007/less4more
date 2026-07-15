/// <reference lib="webworker" />
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener("push", (event) => {
  const data = event.data?.json() ?? { title: "Less4More", body: "You have a new notification" };
  event.waitUntil(
    sw.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [200, 100, 200],
      tag: data.tag || "less4more",
    })
  );
});

sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    sw.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => "url" in c && c.url.includes("/app"));
      if (existing) return (existing as WindowClient).focus();
      return sw.clients.openWindow("/app");
    })
  );
});
