(() => {
  const triggers = document.querySelectorAll("[data-lightbox]");
  if (!triggers.length) return;

  const chevron = (d) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;

  const dialog = document.createElement("div");
  dialog.className = "poster-lightbox";
  dialog.id = "poster-lightbox";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Poster");
  dialog.hidden = true;
  dialog.innerHTML = `
    <img class="poster-lightbox-img" alt="">
    <div class="poster-lightbox-video" hidden></div>
    <button type="button" class="poster-lightbox-nav poster-lightbox-prev" aria-label="Previous" hidden>${chevron("M14.5 6l-6 6 6 6")}</button>
    <button type="button" class="poster-lightbox-nav poster-lightbox-next" aria-label="Next" hidden>${chevron("M9.5 6l6 6-6 6")}</button>
    <button type="button" class="poster-lightbox-close" aria-label="Close">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/>
      </svg>
    </button>
  `;
  document.body.appendChild(dialog);

  const img = dialog.querySelector(".poster-lightbox-img");
  const video = dialog.querySelector(".poster-lightbox-video");
  const prevBtn = dialog.querySelector(".poster-lightbox-prev");
  const nextBtn = dialog.querySelector(".poster-lightbox-next");
  const closeBtn = dialog.querySelector(".poster-lightbox-close");
  let lastFocus = null;
  let openTrigger = null;
  let items = [];
  let index = 0;

  const triggerSrc = (el) => {
    const data = el.getAttribute("data-lightbox");
    if (data && data !== "true") return data;
    return el.getAttribute("href") || el.querySelector("img")?.getAttribute("src") || "";
  };

  const groupOf = (trigger) => {
    const name = trigger.dataset.lightboxGroup;
    if (!name) return [trigger];
    return [...triggers].filter((t) => t.dataset.lightboxGroup === name);
  };

  const setExpanded = (open) => {
    if (openTrigger) openTrigger.setAttribute("aria-expanded", String(open));
  };

  const pauseInlineVideos = () => {
    for (const frame of document.querySelectorAll("[data-carousel] iframe")) {
      frame.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: "" }),
        "*",
      );
    }
  };

  const show = (i) => {
    if (i < 0 || i >= items.length) return;
    index = i;
    const item = items[index];
    const src = triggerSrc(item);
    const isVideo = item.dataset.lightboxType === "video";
    video.replaceChildren();
    if (isVideo) {
      img.hidden = true;
      img.removeAttribute("src");
      const frame = document.createElement("iframe");
      frame.src = src;
      frame.title = item.getAttribute("aria-label") || "Video";
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      video.appendChild(frame);
      video.hidden = false;
      dialog.setAttribute("aria-label", "Video");
    } else {
      video.hidden = true;
      img.hidden = false;
      img.src = src;
      img.alt = item.querySelector("img")?.alt || "Poster";
      dialog.setAttribute("aria-label", "Poster");
    }
    prevBtn.hidden = index === 0;
    nextBtn.hidden = index >= items.length - 1;
    if (document.activeElement?.hidden) closeBtn.focus();
  };

  const close = () => {
    if (dialog.hidden) return;
    dialog.hidden = true;
    document.documentElement.classList.remove("is-lightbox-open");
    document.body.classList.remove("is-lightbox-open");
    setExpanded(false);
    img.removeAttribute("src");
    img.alt = "";
    video.replaceChildren();
    const restore = lastFocus;
    lastFocus = null;
    openTrigger = null;
    if (restore && typeof restore.focus === "function") restore.focus();
  };

  const open = (trigger) => {
    if (!triggerSrc(trigger)) return;
    lastFocus = document.activeElement;
    openTrigger = trigger;
    items = groupOf(trigger);
    pauseInlineVideos();
    show(Math.max(0, items.indexOf(trigger)));
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
  prevBtn.addEventListener("click", () => show(index - 1));
  nextBtn.addEventListener("click", () => show(index + 1));

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target === video) close();
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const focusables = [prevBtn, nextBtn, closeBtn].filter((b) => !b.hidden);
    const at = focusables.indexOf(document.activeElement);
    const step = event.shiftKey ? -1 : 1;
    event.preventDefault();
    focusables[(at + step + focusables.length) % focusables.length].focus();
  });

  document.addEventListener("keydown", (event) => {
    if (dialog.hidden) return;
    if (event.key === "Escape") close();
    else if (event.key === "ArrowRight") show(index + 1);
    else if (event.key === "ArrowLeft") show(index - 1);
  });
})();
