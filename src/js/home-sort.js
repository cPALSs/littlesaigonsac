/** Viet Eats category grids (home + /viet-eats/): Pacific meal windows, then snack, then the rest.
 * Category detail prev/next uses the same order, wrapping at the ends. */

import {
  adjacentInList,
  mergeWindows,
  pagerNavHtml,
  sortMealItems,
} from "./meal-sort.js";
import { HOME_SHOW_LIMIT, todayPtIso } from "./home-shows.js";

function rotateHomeShows(date = new Date()) {
  const grid = document.querySelector("[data-home-shows]");
  if (!grid) return;
  const today = todayPtIso(date);
  const cards = [...grid.children];
  const current = [];
  const past = [];
  for (const el of cards) {
    const end = el.getAttribute("data-end") || el.getAttribute("data-start") || "";
    if (end && end >= today) current.push(el);
    else past.push(el);
  }
  const byStart = (a, b) =>
    (a.getAttribute("data-start") || "").localeCompare(b.getAttribute("data-start") || "");
  current.sort(byStart);
  past.sort((a, b) => byStart(b, a));
  const ordered = [...current, ...past];
  const shown = new Set(ordered.slice(0, HOME_SHOW_LIMIT));
  for (const el of ordered) {
    el.hidden = !shown.has(el);
    grid.append(el);
  }
  grid.dataset.sorted = "true";
}

try {
  rotateHomeShows();
} catch {
  const grid = document.querySelector("[data-home-shows]");
  if (grid) grid.dataset.sorted = "true";
}

function readWindows() {
  const raw =
    document.getElementById("meal-sort-windows")?.textContent ||
    document.getElementById("home-sort-windows")?.textContent;
  return mergeWindows(raw ? JSON.parse(raw) : null);
}

function capHomeMealGrid() {
  const grid = document.querySelector("#viet-eats [data-meal-grid]");
  if (!grid) return;
  const cols = getComputedStyle(grid)
    .gridTemplateColumns.split(/\s+/)
    .filter(Boolean).length;
  const cap = cols >= 4 ? 8 : 6;
  [...grid.children].forEach((el, i) => {
    el.hidden = i >= cap;
  });
  grid.dataset.cols = String(cols);
  grid.dataset.cap = String(cap);
}

function wireVietEatsNav(date = new Date()) {
  const nav = document.querySelector("[data-viet-eats-nav]");
  const raw = document.getElementById("viet-eats-nav")?.textContent;
  if (!nav || !raw) return;
  const data = JSON.parse(raw);
  const windows = data.windows ? mergeWindows(data.windows) : readWindows();
  const sorted = sortMealItems(data.items || [], date, windows);
  const { prev, next } = adjacentInList(sorted, data.current, { wrap: true, key: "slug" });
  const link = (item) =>
    item ? { href: `/viet-eats/${item.slug}/`, label: item.vi } : null;
  nav.outerHTML = pagerNavHtml({
    prev: link(prev),
    next: link(next),
    attrs: 'data-viet-eats-nav data-sorted="true"',
  });
}

for (const grid of document.querySelectorAll("[data-meal-grid]")) {
  try {
    const items = [...grid.children].map((el) => ({
      el,
      fit: el.getAttribute("data-fit") || "",
    }));
    for (const { el } of sortMealItems(items, new Date(), readWindows())) {
      grid.append(el);
    }
    grid.dataset.sorted = "true";
  } catch {
    grid.dataset.sorted = "true";
  }
}

try {
  wireVietEatsNav();
} catch {
  const nav = document.querySelector("[data-viet-eats-nav]");
  if (nav) nav.dataset.sorted = "true";
}

capHomeMealGrid();
window.addEventListener("resize", capHomeMealGrid);
