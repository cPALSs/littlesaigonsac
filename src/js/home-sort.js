/** Viet Eats category grids (home + /viet-eats/): Pacific meal windows, then snack, then the rest. */

const DEFAULT_WINDOWS = {
  timezone: "America/Los_Angeles",
  breakfast: { start: "05:00", end: "11:00" },
  lunch: { start: "11:00", end: "15:00" },
  dinner: { start: "17:00", end: "22:00" },
};

function parseHM(s) {
  const [h, m] = String(s).split(":").map(Number);
  return h * 60 + (m || 0);
}

function pacificMinutes(date, timeZone) {
  const parts = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  return Number(parts.hour) * 60 + Number(parts.minute);
}

function mealWindow(mins, windows) {
  for (const name of ["breakfast", "lunch", "dinner"]) {
    const start = parseHM(windows[name].start);
    const end = parseHM(windows[name].end);
    if (mins >= start && mins < end) return name;
  }
  return "between";
}

function fitList(el) {
  return (el.getAttribute("data-fit") || "")
    .split(/\s+/)
    .filter(Boolean);
}

function tier(fit, window) {
  const tags = new Set(fit);
  if (window === "between") return tags.has("snack") ? 1 : 3;
  if (tags.has(window)) return 1;
  if (tags.has("snack")) return 2;
  return 3;
}

function sortMealGrid(grid, date = new Date()) {
  const raw =
    document.getElementById("meal-sort-windows")?.textContent ||
    document.getElementById("home-sort-windows")?.textContent;
  const windows = raw ? { ...DEFAULT_WINDOWS, ...JSON.parse(raw) } : DEFAULT_WINDOWS;
  const window = mealWindow(pacificMinutes(date, windows.timezone), windows);
  const cards = [...grid.children].map((el, index) => ({ el, index }));
  cards.sort((a, b) => {
    const diff = tier(fitList(a.el), window) - tier(fitList(b.el), window);
    if (diff) return diff;
    return a.index - b.index;
  });
  for (const { el } of cards) grid.append(el);
  grid.dataset.window = window;
  grid.dataset.sorted = "true";
}

for (const grid of document.querySelectorAll("[data-meal-grid]")) {
  try {
    sortMealGrid(grid);
  } catch {
    grid.dataset.sorted = "true";
  }
}
