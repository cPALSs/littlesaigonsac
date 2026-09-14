#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homeEntertainmentSection, writeEntertainmentPages } from "./entertainment-pages.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const data = JSON.parse(readFileSync(join(root, "data/categories.json"), "utf8"));
const categories = data.categories;
const nav = data.site.nav || [];
const entertainmentPath = join(root, "data/entertainment.json");
const entertainment = existsSync(entertainmentPath)
  ? JSON.parse(readFileSync(entertainmentPath, "utf8"))
  : null;

if (entertainment?.people) {
  for (const person of Object.values(entertainment.people)) {
    const rel = `entertainment/people/${person.id}.jpg`;
    if (!person.photo && existsSync(join(root, "src/img", rel))) {
      person.photo = rel;
    }
  }
}

if (entertainment?.orgs) {
  for (const org of Object.values(entertainment.orgs)) {
    const rel = `entertainment/orgs/${org.id}.jpg`;
    if (!org.photo && existsSync(join(root, "src/img", rel))) {
      org.photo = rel;
    }
    for (const member of org.members || []) {
      const memberRel = `entertainment/people/${member.id}.jpg`;
      if (!member.photo && existsSync(join(root, "src/img", memberRel))) {
        member.photo = memberRel;
      }
    }
  }
}

const esc = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const filledDish = (d) => d.kitchens?.length > 0;

const imgEl = (rel, alt = "") => {
  if (!rel || !existsSync(join(root, "src/img", rel))) return "";
  const abs = join(root, "src/img", rel);
  const src = `/img/${esc(rel)}`;
  if (
    String(rel).startsWith("entertainment/people/") ||
    String(rel).startsWith("entertainment/orgs/")
  ) {
    const mtime = Math.floor(statSync(abs).mtimeMs);
    return `<img src="${src}?t=${mtime}" alt="${esc(alt)}">`;
  }
  return `<img src="${src}" alt="${esc(alt)}">`;
};

const igHref = data.site.instagram || "https://www.instagram.com/littlesaigonsactown/";

const igButton = () => `<a class="ig" href="${esc(igHref)}" rel="noopener noreferrer" target="_blank" aria-label="Instagram">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="5.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="4.35" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="17.45" cy="6.55" r="1.15" fill="currentColor"/>
    </svg>
  </a>`;

const crumbs = (trail = []) => `<nav class="crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a>
    ${trail
      .map((item) => {
        const crumb = item.current
          ? `<span aria-current="page">${esc(item.label)}</span>`
          : `<a href="${esc(item.href)}">${esc(item.label)}</a>`;
        return `<span class="crumbs-sep" aria-hidden="true"> / </span>${crumb}`;
      })
      .join("")}
  </nav>`;

const siteHeader = (current) => `<header class="site-header">
    <div class="wrap">
      <a class="wordmark" href="/">
        <img src="/img/brand/logo-circle.png" width="44" height="44" alt="">
        <span>${esc(data.site.name)}</span>
      </a>
      <nav class="site-nav" id="site-nav" aria-label="Site">
        ${nav
          .map((item) => {
            const on = item.id === current;
            return `<a href="${esc(item.href)}"${on ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`;
          })
          .join("")}
      </nav>
      <div class="header-tools">
        <button class="nav-toggle" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="Open menu">
          <span class="nav-toggle-bar" aria-hidden="true"></span>
        </button>
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

const SITE_ORIGIN = String(data.site.url || "https://littlesaigonsac.town").replace(/\/$/, "");
const DEFAULT_OG = { path: "/img/brand/og-image.png", width: 1200, height: 630 };

const imageSize = (absPath) => {
  try {
    const buf = readFileSync(absPath);
    if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) break;
        const marker = buf[i + 1];
        if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          i += 2;
          continue;
        }
        const len = buf.readUInt16BE(i + 2);
        if (len < 2) break;
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
        }
        i += 2 + len;
      }
    }
  } catch {
    /* ignore unreadable images */
  }
  return null;
};

const absImgUrl = (rel) =>
  `${SITE_ORIGIN}/img/${String(rel)
    .replace(/^\/img\//, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

const resolveOgImage = (imageRel) => {
  if (imageRel) {
    const rel = String(imageRel).replace(/^\/img\//, "");
    const abs = join(root, "src/img", rel);
    if (existsSync(abs)) {
      const size = imageSize(abs);
      return { url: absImgUrl(rel), width: size?.width, height: size?.height };
    }
  }
  return { url: `${SITE_ORIGIN}${DEFAULT_OG.path}`, width: DEFAULT_OG.width, height: DEFAULT_OG.height };
};

const socialHead = ({ title, description, path = "/", image, ogType = "website" }) => {
  const pageUrl = `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
  const desc = description || data.site.tagline || "";
  const og = resolveOgImage(image);
  const dim =
    og.width && og.height
      ? `
  <meta property="og:image:width" content="${og.width}">
  <meta property="og:image:height" content="${og.height}">`
      : "";
  return `  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${esc(pageUrl)}">
  <meta property="og:type" content="${esc(ogType)}">
  <meta property="og:locale" content="en_US">
  <meta property="og:site_name" content="${esc(data.site.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(pageUrl)}">
  <meta property="og:image" content="${esc(og.url)}">
  <meta property="og:image:alt" content="${esc(title)}">${dim}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(og.url)}">
`;
};

const layout = ({ title, body, current = "", home = false, path = "/", description, image, ogType = "website" }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
${gaTag}${socialHead({ title, description, path, image, ogType })}  <link rel="preconnect" href="https://fonts.googleapis.com">
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
  <script src="/js/site-nav.js" defer></script>
  <script src="/js/poster-lightbox.js" defer></script>
</body>
</html>
`;

const kitchenNote = (k) => {
  const flavors = k.flavors?.length ? k.flavors : k.note ? [k.note] : [];
  if (!flavors.length) return "";
  return `<ul class="kitchen-note">${flavors.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`;
};

const kitchenItems = (dish) => {
  if (!filledDish(dish)) {
    return `<p class="seeking">No candidate yet</p>`;
  }
  return `<ul class="kitchens">
    ${dish.kitchens
      .map(
        (k) => `<li>
      <span class="kitchen-name">${esc(k.name)}</span><span class="sep">, </span><a href="${esc(k.maps)}" rel="noopener noreferrer" target="_blank">${esc(k.address)}</a>${kitchenNote(k)}
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
  path: "/",
  description: data.site.tagline,
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
    ${entertainment ? homeEntertainmentSection({ entertainment, esc, imgEl, crumbs }) : ""}
  </main>
  <script src="/js/home-sort.js" defer></script>`,
});

const vietEatsIndex = layout({
  title: `Viet Eats · ${data.site.name}`,
  path: "/viet-eats/",
  description: "Vietnamese cuisine and the best kitchens that cook them.",
  current: "viet-eats",
  body: `<main class="wrap">
    <header class="hero">
      ${crumbs([{ label: "Viet Eats", current: true }])}
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
    path: `/viet-eats/${cat.slug}/`,
    description: `${cat.vi} (${cat.gloss}) — Vietnamese cuisine picks for Little Saigon Sacramento.`,
    image: cat.photo,
    current: "viet-eats",
    body: `<main class="wrap category">
      <header class="dish-head">
        ${crumbs([{ href: "/viet-eats/", label: "Viet Eats" }, { label: cat.vi, current: true }])}
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
cpSync(join(root, "src/js/site-nav.js"), join(dist, "js/site-nav.js"));
cpSync(join(root, "src/js/poster-lightbox.js"), join(dist, "js/poster-lightbox.js"));
cpSync(join(root, "src/js/performer-sort.js"), join(dist, "js/performer-sort.js"));
cpSync(join(root, "src/js/filter-drawer.js"), join(dist, "js/filter-drawer.js"));
cpSync(join(root, "src/js/maps-config.js"), join(dist, "js/maps-config.js"));
cpSync(join(root, "src/js/entertainment-map.js"), join(dist, "js/entertainment-map.js"));
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

let entertainmentCounts = null;
if (entertainment) {
  entertainmentCounts = writeEntertainmentPages({
    dist,
    join,
    mkdirSync,
    writeFileSync,
    layout,
    esc,
    imgEl,
    crumbs,
    entertainment,
  });
}

const extra = entertainmentCounts
  ? ` + Entertainment (${entertainmentCounts.events} shows, ${entertainmentCounts.people} people, ${entertainmentCounts.orgs} orgs)`
  : "";
console.log(`Built home + Viet Eats (${categories.length} categories)${extra} → ${dist}`);
