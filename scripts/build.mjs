#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const data = JSON.parse(readFileSync(join(root, "data/categories.json"), "utf8"));
const categories = data.categories;
const nav = data.site.nav || [];

const esc = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const filledDish = (d) => d.kitchens?.length > 0;

const imgEl = (rel, alt = "") => {
  if (!rel || !existsSync(join(root, "src/img", rel))) return "";
  return `<img src="/img/${esc(rel)}" alt="${esc(alt)}">`;
};

const igHref = data.site.instagram || "https://www.instagram.com/littlesaigonsactown/";

const igButton = () => `<a class="ig" href="${esc(igHref)}" rel="noopener noreferrer" target="_blank" aria-label="Instagram">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="5.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="4.35" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="17.45" cy="6.55" r="1.15" fill="currentColor"/>
    </svg>
  </a>`;

const crumbs = ({ vietEatsCurrent = false } = {}) => `<nav class="crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a>
    <span class="crumbs-sep" aria-hidden="true"> / </span>
    ${vietEatsCurrent ? `<span aria-current="page">Viet Eats</span>` : `<a href="/viet-eats/">Viet Eats</a>`}
  </nav>`;

const siteHeader = (current) => `<header class="site-header">
    <div class="wrap">
      <a class="wordmark" href="/">
        <img src="/img/brand/logo-circle.png" width="44" height="44" alt="">
        <span>${esc(data.site.name)}</span>
      </a>
      <div class="header-end">
        <nav class="site-nav" aria-label="Site">
          ${nav
            .map((item) => {
              const on = item.id === current;
              return `<a href="${esc(item.href)}"${on ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`;
            })
            .join("")}
        </nav>
        ${igButton()}
      </div>
    </div>
  </header>`;

const gaId = data.site.gaMeasurementId || "";
const gaTag = gaId
  ? `  <script async src="https://www.googletagmanager.com/gtag/js?id=${esc(gaId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${esc(gaId)}');
  </script>
`
  : "";

const layout = ({ title, body, current = "", home = false }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
${gaTag}  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/site.css">
  <link rel="icon" href="/img/brand/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/img/brand/apple-touch.png">
</head>
<body${home ? ' class="home"' : ""}>
  ${siteHeader(current)}
  ${body}
  <footer>
    <div class="wrap">
      <span>${esc(data.site.name)}</span>
      ${igButton()}
    </div>
  </footer>
</body>
</html>
`;

const kitchenItems = (dish) => {
  if (!filledDish(dish)) {
    return `<p class="seeking">No candidate yet</p>`;
  }
  return `<ul class="kitchens">
    ${dish.kitchens
      .map(
        (k) => `<li>
      <span class="kitchen-name">${esc(k.name)}</span><span class="sep">, </span><a href="${esc(k.maps)}" rel="noopener noreferrer" target="_blank">${esc(k.address)}</a>
    </li>`,
      )
      .join("")}
  </ul>`;
};

const dishItem = (dish, n) => `<li class="dish ${filledDish(dish) ? "filled" : "open"}">
      <span class="dish-n">${n}.</span>
      <div class="dish-body">
        <p class="dish-title">${esc(dish.vi)} <span class="gloss">(${esc(dish.gloss)})</span></p>
        ${kitchenItems(dish)}
      </div>
    </li>`;

const dishList = (cat) => {
  let html = "";
  let open = false;
  let n = 0;
  let last = Symbol("start");
  const close = () => {
    if (open) {
      html += "</ol>";
      open = false;
    }
  };
  for (const dish of cat.dishes) {
    const section = dish.section || "";
    if (section !== last) {
      close();
      n = 0;
      if (section) html += `<h2 class="section-label">${esc(section)}</h2>`;
      html += `<ol class="dishes">`;
      open = true;
      last = section;
    }
    n += 1;
    html += dishItem(dish, n);
  }
  close();
  return html;
};

const catCard = (cat, { timed } = {}) => {
  const fit = timed && cat.fit?.length ? ` data-fit="${esc(cat.fit.join(" "))}"` : "";
  return `<a class="card" href="/viet-eats/${esc(cat.slug)}/"${fit}>
    <div class="card-photo">${imgEl(cat.photo, cat.vi)}</div>
    <div class="card-body">
      <h2>${esc(cat.vi)}</h2>
      <p class="gloss">${esc(cat.gloss)}</p>
    </div>
  </a>`;
};

const mealSortWindows = JSON.stringify(data.site.homeSort || {});

const mealCategoryGrid = () => `<script type="application/json" id="meal-sort-windows">${mealSortWindows}</script>
      <noscript><style>.grid[data-meal-grid]:not([data-sorted]){visibility:visible}</style></noscript>
      <div class="grid" data-meal-grid>${categories.map((c) => catCard(c, { timed: true })).join("")}</div>`;

const home = layout({
  title: data.site.name,
  current: "",
  home: true,
  body: `<main>
    <header class="hero hero--brand">
      <h1 class="hero-banner">
        <img class="hero-wordmark" src="/img/brand/logo-wordmark.svg" width="2250" height="2250" alt="${esc(data.site.name)}">
      </h1>
    </header>
    <section class="wrap feature" id="viet-eats">
      <div class="section-head">
        <h2>Viet Eats</h2>
        <a href="/viet-eats/">All categories</a>
      </div>
      <p class="lede">Vietnamese cuisine and the best kitchens that cook them.</p>
      ${mealCategoryGrid()}
    </section>
  </main>
  <script src="/js/home-sort.js" defer></script>`,
});

const vietEatsIndex = layout({
  title: `Viet Eats · ${data.site.name}`,
  current: "viet-eats",
  body: `<main class="wrap">
    <header class="hero">
      ${crumbs({ vietEatsCurrent: true })}
      <h1>Viet Eats</h1>
      <p class="tagline">Dish-first kitchen picks for Little Saigon Sacramento.</p>
    </header>
    ${mealCategoryGrid()}
  </main>
  <script src="/js/home-sort.js" defer></script>`,
});

const catPage = (cat, i) => {
  const prev = categories[i - 1];
  const next = categories[i + 1];
  return layout({
    title: `${cat.vi} (${cat.gloss}) · Viet Eats`,
    current: "viet-eats",
    body: `<main class="wrap category">
      <header class="dish-head">
        ${crumbs()}
        <h1>${esc(cat.vi)}</h1>
        <p class="tagline">${esc(cat.gloss)}</p>
        <div class="hero-photo">${imgEl(cat.photo, cat.vi)}</div>
      </header>
      ${dishList(cat)}
      <nav class="nav-dishes">
        ${prev ? `<a href="/viet-eats/${esc(prev.slug)}/"><span>Previous</span>${esc(prev.vi)}</a>` : "<span></span>"}
        ${next ? `<a href="/viet-eats/${esc(next.slug)}/" style="text-align:right"><span>Next</span>${esc(next.vi)}</a>` : ""}
      </nav>
    </main>`,
  });
};

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "css"), { recursive: true });
mkdirSync(join(dist, "js"), { recursive: true });
mkdirSync(join(dist, "viet-eats"), { recursive: true });
cpSync(join(root, "src/css/site.css"), join(dist, "css/site.css"));
cpSync(join(root, "src/js/home-sort.js"), join(dist, "js/home-sort.js"));
cpSync(join(root, "src/img"), join(dist, "img"), { recursive: true });
writeFileSync(join(dist, "CNAME"), "littlesaigonsac.town\n");
writeFileSync(join(dist, ".nojekyll"), "");
writeFileSync(join(dist, "index.html"), home);
writeFileSync(join(dist, "viet-eats/index.html"), vietEatsIndex);
for (const [i, cat] of categories.entries()) {
  const dir = join(dist, "viet-eats", cat.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), catPage(cat, i));
}

console.log(`Built home + Viet Eats (${categories.length} categories) → ${dist}`);
