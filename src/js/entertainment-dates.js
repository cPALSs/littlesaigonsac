/** Move gallery cards from Upcoming into Past once their end date has passed (Pacific). */

import { todayPtIso } from "./home-shows.js";

function endOf(el) {
  return el.getAttribute("data-end") || el.getAttribute("data-start") || "";
}

function startOf(el) {
  return el.getAttribute("data-start") || "";
}

function labelOf(el) {
  return el.querySelector("h2")?.textContent || "";
}

/** Past order: newer start first, then name A–Z. */
function pastBefore(a, b) {
  const start = startOf(b).localeCompare(startOf(a));
  if (start) return start;
  return labelOf(a).localeCompare(labelOf(b), "vi");
}

function ensurePastSection(upcoming) {
  let past = upcoming.parentElement?.querySelector('.show-band[data-when="past"]');
  if (past) return past;
  past = document.createElement("section");
  past.className = "show-band";
  past.setAttribute("data-map-section", "");
  past.dataset.when = "past";
  past.innerHTML = `<h2 class="section-label band-label">Past</h2><div class="poster-grid"></div>`;
  upcoming.after(past);
  return past;
}

export function rollGalleryShows(root = document, today = todayPtIso()) {
  const upcoming = root.querySelector('.show-band[data-when="upcoming"]');
  if (!upcoming) return;
  const upcomingGrid = upcoming.querySelector(".poster-grid");
  if (!upcomingGrid) return;

  const stale = [...upcomingGrid.querySelectorAll("a.card.poster")].filter((card) => {
    const end = endOf(card);
    return end && end < today;
  });
  if (!stale.length) return;

  const past = ensurePastSection(upcoming);
  const pastGrid = past.querySelector(".poster-grid");
  stale.sort(pastBefore);
  for (const card of stale) {
    card.dataset.when = "past";
    const before = [...pastGrid.querySelectorAll("a.card.poster")].find(
      (el) => pastBefore(card, el) < 0,
    );
    if (before) pastGrid.insertBefore(card, before);
    else pastGrid.append(card);
  }

  if (!upcomingGrid.querySelector("a.card.poster")) {
    const invite = upcomingGrid.querySelector("[data-map-keep]");
    if (invite && pastGrid) pastGrid.prepend(invite);
    upcoming.remove();
  }
}

rollGalleryShows();
