if ("serviceWorker" in navigator) {
  const local = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  if (local) {
    // Preview iterates CSS without a git commit. An old SW cache-first for
    // /css/site.css hid new rules until reload. Do not register locally;
    // drop any leftover controller + Cache Storage from earlier previews.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    });
    if (window.caches) {
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
    }
    return;
  }
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
