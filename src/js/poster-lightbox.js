(() => {
  const triggers = document.querySelectorAll("[data-lightbox]");
  if (!triggers.length) return;

  const dialog = document.createElement("div");
  dialog.className = "poster-lightbox";
  dialog.id = "poster-lightbox";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Poster");
  dialog.hidden = true;
  dialog.innerHTML = `
    <img class="poster-lightbox-img" alt="">
    <button type="button" class="poster-lightbox-close" aria-label="Close">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/>
      </svg>
    </button>
  `;
  document.body.appendChild(dialog);

  const img = dialog.querySelector(".poster-lightbox-img");
  const closeBtn = dialog.querySelector(".poster-lightbox-close");
  let lastFocus = null;
  let openTrigger = null;

  const triggerSrc = (el) => {
    const data = el.getAttribute("data-lightbox");
    if (data && data !== "true") return data;
    return el.getAttribute("href") || el.querySelector("img")?.getAttribute("src") || "";
  };

  const setExpanded = (open) => {
    if (openTrigger) openTrigger.setAttribute("aria-expanded", String(open));
  };

  const close = () => {
    if (dialog.hidden) return;
    dialog.hidden = true;
    document.documentElement.classList.remove("is-lightbox-open");
    document.body.classList.remove("is-lightbox-open");
    setExpanded(false);
    img.removeAttribute("src");
    img.alt = "";
    const restore = lastFocus;
    lastFocus = null;
    openTrigger = null;
    if (restore && typeof restore.focus === "function") restore.focus();
  };

  const open = (trigger) => {
    const src = triggerSrc(trigger);
    if (!src) return;
    lastFocus = document.activeElement;
    openTrigger = trigger;
    img.src = src;
    img.alt = trigger.querySelector("img")?.alt || "Poster";
    dialog.hidden = false;
    document.documentElement.classList.add("is-lightbox-open");
    document.body.classList.add("is-lightbox-open");
    setExpanded(true);
    closeBtn.focus();
  };

  for (const trigger of triggers) {
    if (!trigger.hasAttribute("aria-expanded")) {
      trigger.setAttribute("aria-expanded", "false");
    }
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", "poster-lightbox");
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      open(trigger);
    });
  }

  closeBtn.addEventListener("click", close);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      closeBtn.focus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
})();
