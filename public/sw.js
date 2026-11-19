self.addEventListener("push", (event) => {
  let data = { title: "출퇴근 알림", body: "" };
  try {
    data = event.data ? event.data.json() : data;
  } catch {
    data.body = event.data ? event.data.text() : "";
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/apple-icon",
      tag: data.title,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return self.clients.openWindow("/");
    }),
  );
});
