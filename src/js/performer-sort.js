/** Reorder Performers + Organizations grids on /entertainment/performers/. */

function compareName(a, b) {
  return String(a.dataset.name || "").localeCompare(String(b.dataset.name || ""), "vi", {
    sensitivity: "base",
  });
}

function sortPerformerGrid(grid, mode) {
  const rows = [...grid.children];
  if (mode === "popular") {
    rows.sort(
      (a, b) => Number(b.dataset.events || 0) - Number(a.dataset.events || 0) || compareName(a, b),
    );
  } else {
    rows.sort(compareName);
  }
  for (const el of rows) grid.append(el);
}

const select = document.querySelector("[data-performer-sort]");
const grids = document.querySelectorAll("[data-performer-grid]");
if (select && grids.length) {
  const apply = () => {
    for (const grid of grids) sortPerformerGrid(grid, select.value);
  };
  select.addEventListener("change", apply);
}
