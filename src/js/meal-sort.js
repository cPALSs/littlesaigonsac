/** Shared Viet Eats meal-window sort + adjacent (prev/next) helpers. */

export const DEFAULT_WINDOWS = {
  timezone: "America/Los_Angeles",
  breakfast: { start: "05:00", end: "11:00" },
  lunch: { start: "11:00", end: "15:00" },
  dinner: { start: "17:00", end: "22:00" },
};

export function parseHM(s) {
  const [h, m] = String(s).split(":").map(Number);
  return h * 60 + (m || 0);
}

export function pacificMinutes(date, timeZone) {
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

export function mergeWindows(raw) {
  return raw ? { ...DEFAULT_WINDOWS, ...raw } : DEFAULT_WINDOWS;
}

export function mealWindow(mins, windows) {
  for (const name of ["breakfast", "lunch", "dinner"]) {
    const start = parseHM(windows[name].start);
    const end = parseHM(windows[name].end);
    if (mins >= start && mins < end) return name;
  }
  return "between";
}

export function fitTags(fit) {
  if (Array.isArray(fit)) return fit.filter(Boolean);
  return String(fit || "")
    .split(/\s+/)
    .filter(Boolean);
}

export function mealTier(fit, window) {
  const tags = new Set(fitTags(fit));
  if (window === "between") return tags.has("snack") ? 1 : 3;
  if (tags.has(window)) return 1;
  if (tags.has("snack")) return 2;
  return 3;
}

/** Stable meal-window sort. Tie-break is original index (JSON / DOM order). */
export function sortMealItems(items, date = new Date(), windows = DEFAULT_WINDOWS) {
  const merged = mergeWindows(windows);
  const window = mealWindow(pacificMinutes(date, merged.timezone), merged);
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const diff = mealTier(a.item.fit, window) - mealTier(b.item.fit, window);
      if (diff) return diff;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

/**
 * Neighbors in a list. `wrap: true` loops the ends (not onto self).
 * One item (or a miss) → no neighbors.
 */
export function adjacentInList(items, match, { wrap = false, key = "slug" } = {}) {
  const i = items.findIndex((item) =>
    typeof match === "function" ? match(item) : item?.[key] === match,
  );
  const n = items.length;
  if (i < 0 || n < 2) return { prev: null, next: null };
  if (wrap) {
    return {
      prev: items[(i - 1 + n) % n],
      next: items[(i + 1) % n],
    };
  }
  return {
    prev: i > 0 ? items[i - 1] : null,
    next: i < n - 1 ? items[i + 1] : null,
  };
}

export function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function pagerNavHtml({ prev, next, escape = escapeHtml, attrs = "" } = {}) {
  const extra = attrs ? ` ${attrs}` : "";
  const left = prev
    ? `<a href="${escape(prev.href)}"><span>Previous</span>${escape(prev.label)}</a>`
    : "<span></span>";
  const right = next
    ? `<a href="${escape(next.href)}" style="text-align:right"><span>Next</span>${escape(next.label)}</a>`
    : "";
  return `<nav class="nav-dishes"${extra}>${left}${right}</nav>`;
}
