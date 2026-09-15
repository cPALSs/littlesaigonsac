/** Bottom-sheet drawers opened from a lower-right FAB. */

(() => {
  const fabs = document.querySelectorAll("[data-drawer-open]");
  if (!fabs.length) return;

  const overlay = document.querySelector("[data-drawer-overlay]");
  let openId = "";
  let lastTrigger = null;

  const drawerFor = (id) => document.getElementById(id);
  const triggersFor = (id) =>
    document.querySelectorAll(`[data-drawer-open="${CSS.escape(id)}"]`);

  const setOpen = (id, open, trigger) => {
    const drawer = drawerFor(id);
    if (!drawer) return;
    if (open && openId && openId !== id) setOpen(openId, false);
    openId = open ? id : "";
    document.body.classList.toggle("is-drawer-open", open);
    document.documentElement.classList.toggle("is-drawer-open", open);
    if (overlay) overlay.hidden = !open;
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    for (const btn of triggersFor(id)) {
      btn.setAttribute("aria-expanded", String(open));
    }
    const eventName = open ? "lss-drawer-open" : "lss-drawer-close";
    document.dispatchEvent(new CustomEvent(eventName, { detail: { id } }));
    if (open) {
      lastTrigger = trigger || triggersFor(id)[0] || null;
      drawer.querySelector("[data-drawer-close]")?.focus();
    } else {
      lastTrigger?.focus();
      lastTrigger = null;
    }
  };

  for (const fab of fabs) {
    fab.addEventListener("click", () => {
      const id = fab.getAttribute("data-drawer-open");
      if (id) setOpen(id, true, fab);
    });
  }

  for (const btn of document.querySelectorAll("[data-drawer-close]")) {
    btn.addEventListener("click", () => {
      if (openId) setOpen(openId, false);
    });
  }

  overlay?.addEventListener("click", () => {
    if (openId) setOpen(openId, false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openId) {
      event.preventDefault();
      setOpen(openId, false);
    }
  });

  window.lssOpenDrawer = (id) => setOpen(id, true);
  window.lssCloseDrawer = (id) => setOpen(id || openId, false);
  window.lssSetDrawerActive = (id, active) => {
    const fab = document.querySelector(`.filter-fab[data-drawer-open="${CSS.escape(id)}"]`);
    fab?.classList.toggle("is-active", Boolean(active));
  };
})();
