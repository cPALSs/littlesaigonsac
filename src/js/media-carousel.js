(() => {
  const roots = document.querySelectorAll("[data-carousel]");
  if (!roots.length) return;

  const pauseFrames = (slide) => {
    for (const frame of slide.querySelectorAll("iframe")) {
      frame.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: "" }),
        "*",
      );
    }
  };

  for (const root of roots) {
    const track = root.querySelector(".carousel-track");
    if (!track) continue;
    const slides = [...track.children];
    const dots = [...root.querySelectorAll(".carousel-dot")];
    const prev = root.querySelector(".carousel-prev");
    const next = root.querySelector(".carousel-next");
    const badge = root.querySelector(".carousel-badge");
    let index = -1;

    const go = (i) => {
      const target = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
    };

    const sync = () => {
      const width = track.clientWidth || 1;
      const i = Math.round(track.scrollLeft / width);
      if (i === index) return;
      if (index >= 0 && slides[index]) pauseFrames(slides[index]);
      index = i;
      dots.forEach((dot, d) => dot.classList.toggle("is-active", d === i));
      slides.forEach((slide, s) => slide.toggleAttribute("inert", s !== i));
      if (prev) prev.hidden = i <= 0;
      if (next) next.hidden = i >= slides.length - 1;
      if (badge) badge.hidden = i !== 0;
    };

    prev?.addEventListener("click", () => go(index - 1));
    next?.addEventListener("click", () => go(index + 1));
    badge?.addEventListener("click", () => go(Number(badge.dataset.carouselTo) || 1));
    track.addEventListener("scroll", sync, { passive: true });
    track.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
      }
    });
    window.addEventListener("resize", () => {
      track.scrollLeft = index * track.clientWidth;
    });
    sync();
  }
})();
