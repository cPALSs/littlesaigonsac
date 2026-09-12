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
  "influencer",
  "martial-arts",
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

function lastDate(el) {
  return String(el.dataset.last || "");
}

function appearanceYear(el) {
  const year = lastDate(el).slice(0, 4);
  return /^\d{4}$/.test(year) ? year : "";
}

function compareLastThenName(a, b) {
  return lastDate(b).localeCompare(lastDate(a)) || compareName(a, b);
}

function sortPerformerGrid(grid, mode) {
  const rows = [...grid.children];
  if (mode === "appearances" || mode === "popular") {
    rows.sort(
      (a, b) => Number(b.dataset.events || 0) - Number(a.dataset.events || 0) || compareName(a, b),
    );
  } else if (mode === "last") {
    rows.sort(compareLastThenName);
  } else {
    rows.sort(compareName);
  }
  for (const el of rows) grid.append(el);
}

function isOneOffAppearance(el) {
  return Number(el.dataset.events || 0) === 1;
}

function sectionItems(section) {
  return [
    ...section.querySelectorAll(
      "[data-performer-grid] > li, [data-performer-one-off-grid] > li, [data-performer-year-grid] > li",
    ),
  ];
}

function hasVisibleItem(els) {
  return els.some((el) => !el.hidden);
}

function clearYearSplit(section) {
  const main = section.querySelector("[data-performer-grid]");
  const yearHost = section.querySelector("[data-performer-years]");
  if (yearHost && main) {
    for (const el of yearHost.querySelectorAll("[data-performer-year-grid] > li")) {
      main.append(el);
    }
    yearHost.replaceChildren();
    yearHost.hidden = true;
  }
  section.classList.remove("is-last-split");
}

function applyLastAppearanceSplit(section) {
  const main = section.querySelector("[data-performer-grid]");
  const yearHost = section.querySelector("[data-performer-years]");
  const oneOffWrap = section.querySelector("[data-performer-one-off]");
  if (!main || !yearHost) return;

  const items = sectionItems(section);
  if (oneOffWrap) oneOffWrap.hidden = true;
  main.hidden = true;
  section.classList.remove("is-appearances-split");
  section.classList.add("is-last-split");

  const byYear = new Map();
  for (const el of items) {
    const year = appearanceYear(el);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(el);
  }
  const years = [...byYear.keys()].sort((a, b) => {
    if (!a) return 1;
    if (!b) return -1;
    return Number(b) - Number(a);
  });

  yearHost.replaceChildren();
  for (const year of years) {
    const wrap = document.createElement("div");
    wrap.className = "performer-year";
    wrap.dataset.performerYear = year;
    if (year) {
      const heading = document.createElement("h2");
      heading.className = "section-label band-label";
      heading.textContent = year;
      wrap.append(heading);
    }
    const grid = document.createElement("ul");
    grid.className = main.className;
    grid.setAttribute("data-performer-year-grid", "");
    wrap.append(grid);
    const group = byYear.get(year);
    group.sort(compareName);
    for (const el of group) grid.append(el);
    wrap.hidden = !hasVisibleItem([...grid.children]);
    yearHost.append(wrap);
  }
  yearHost.hidden = !years.length;
}

function applyAppearanceSplit(section, mode) {
  clearYearSplit(section);
  const main = section.querySelector("[data-performer-grid]");
  const oneOffWrap = section.querySelector("[data-performer-one-off]");
  const oneOffGrid = section.querySelector("[data-performer-one-off-grid]");
  if (!main) return;

  const items = sectionItems(section);
  const split = mode === "appearances" && oneOffWrap && oneOffGrid;

  if (split) {
    for (const el of items) {
      if (isOneOffAppearance(el)) oneOffGrid.append(el);
      else main.append(el);
    }
    sortPerformerGrid(main, mode);
    sortPerformerGrid(oneOffGrid, mode);
    const oneOffVisible = hasVisibleItem([...oneOffGrid.children]);
    const mainVisible = hasVisibleItem([...main.children]);
    oneOffWrap.hidden = !oneOffVisible;
    main.hidden = !mainVisible;
    section.classList.toggle("is-appearances-split", oneOffVisible);
  } else {
    for (const el of items) main.append(el);
    sortPerformerGrid(main, mode);
    if (oneOffWrap) oneOffWrap.hidden = true;
    main.hidden = !hasVisibleItem([...main.children]);
    section.classList.remove("is-appearances-split");
  }
}

function rowMatchesGenre(el, genre) {
  const slugs = String(el.dataset.genres || "")
    .split(/\s+/)
    .filter(Boolean);
  if (!genre) return true;
  if (genre === GENRE_UNKNOWN) return slugs.length === 0;
  return slugs.includes(genre);
}

function readSort(raw) {
  if (raw === "appearances" || raw === "popular") return "appearances";
  if (raw === "last") return "last";
  return "alpha";
}

function readParams() {
  const params = new URLSearchParams(location.search);
  const rawGenre = params.get("genre") || "";
  const genre = isFilterGenre(rawGenre) ? rawGenre : "";
  const sort = readSort(params.get("sort") || "alpha");
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
  for (const section of document.querySelectorAll("[data-performer-section]")) {
    for (const el of sectionItems(section)) {
      el.hidden = !rowMatchesGenre(el, genre);
    }
    if (mode === "last") applyLastAppearanceSplit(section);
    else applyAppearanceSplit(section, mode);
    section.hidden = !hasVisibleItem(sectionItems(section));
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
