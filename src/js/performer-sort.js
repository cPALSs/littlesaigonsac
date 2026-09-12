/** Filter + sort Performers / Organizations on /entertainment/performers/. */

const GENRE_SLUGS = new Set([
  "nhac-vang",
  "que-huong",
  "nhac-tre",
  "remix",
  "co-nhac",
  "trinh",
  "dj-edm",
  "american-indie",
  "emcee",
]);

/** Filter-only: empty specialties. Not a stored person_specialty slug. */
const GENRE_UNKNOWN = "unknown";

function isFilterGenre(raw) {
  return GENRE_SLUGS.has(raw) || raw === GENRE_UNKNOWN;
}

function compareName(a, b) {
  return String(a.dataset.name || "").localeCompare(String(b.dataset.name || ""), "vi", {
    sensitivity: "base",
  });
}

function sortPerformerGrid(grid, mode) {
  const rows = [...grid.children];
  if (mode === "appearances" || mode === "popular") {
    rows.sort(
      (a, b) => Number(b.dataset.events || 0) - Number(a.dataset.events || 0) || compareName(a, b),
    );
  } else {
    rows.sort(compareName);
  }
  for (const el of rows) grid.append(el);
}

function rowMatchesGenre(el, genre) {
  const slugs = String(el.dataset.genres || "")
    .split(/\s+/)
    .filter(Boolean);
  if (!genre) return true;
  if (genre === GENRE_UNKNOWN) return slugs.length === 0;
  return slugs.includes(genre);
}

function readParams() {
  const params = new URLSearchParams(location.search);
  const rawGenre = params.get("genre") || "";
  const genre = isFilterGenre(rawGenre) ? rawGenre : "";
  const rawSort = params.get("sort") || "alpha";
  const sort = rawSort === "appearances" || rawSort === "popular" ? "appearances" : "alpha";
  return { genre, sort };
}

function syncUrl(genre, sort) {
  const url = new URL(location.href);
  if (genre) url.searchParams.set("genre", genre);
  else url.searchParams.delete("genre");
  if (sort && sort !== "alpha") url.searchParams.set("sort", sort);
  else url.searchParams.delete("sort");
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (next !== current) history.replaceState(null, "", next);
}

function onPerformersPage() {
  return /^\/entertainment\/performers\/?$/.test(location.pathname);
}

const genreSelect = document.querySelector("[data-performer-genre]");
const sortSelect = document.querySelector("[data-performer-sort]");
const grids = document.querySelectorAll("[data-performer-grid]");

function apply({ writeUrl = true } = {}) {
  const genre = genreSelect?.value || "";
  const mode = sortSelect?.value || "alpha";
  for (const grid of grids) {
    for (const el of grid.children) {
      el.hidden = !rowMatchesGenre(el, genre);
    }
    sortPerformerGrid(grid, mode);
  }
  for (const section of document.querySelectorAll("[data-performer-section]")) {
    const items = section.querySelectorAll("[data-performer-grid] > li");
    section.hidden = ![...items].some((el) => !el.hidden);
  }
  if (writeUrl) syncUrl(genre, mode);
}

if ((genreSelect || sortSelect) && grids.length) {
  const initial = readParams();
  if (genreSelect) genreSelect.value = initial.genre;
  if (sortSelect) sortSelect.value = initial.sort;
  apply();
  genreSelect?.addEventListener("change", () => apply());
  sortSelect?.addEventListener("change", () => apply());
}

if (onPerformersPage()) {
  document.addEventListener("click", (event) => {
    const chip = event.target.closest("a.genre-chip");
    if (!chip) return;
    let dest;
    try {
      dest = new URL(chip.getAttribute("href") || "", location.origin);
    } catch {
      return;
    }
    if (!/^\/entertainment\/performers\/?$/.test(dest.pathname)) return;
    event.preventDefault();
    const raw = dest.searchParams.get("genre") || "";
    const genre = isFilterGenre(raw) ? raw : "";
    if (genreSelect) genreSelect.value = genre;
    apply();
  });
}
