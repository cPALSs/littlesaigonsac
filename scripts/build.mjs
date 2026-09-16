#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homeEntertainmentSection, writeEntertainmentPages } from "./entertainment-pages.mjs";
import { adjacentInList, pagerNavHtml } from "../src/js/meal-sort.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const data = JSON.parse(readFileSync(join(root, "data/categories.json"), "utf8"));
const categories = data.categories;
const nav = data.site.nav || [];
const entertainmentPath = join(root, "data/entertainment.json");
const entertainment = existsSync(entertainmentPath)
  ? JSON.parse(readFileSync(entertainmentPath, "utf8"))
  : null;
const foodiesPath = join(root, "data/foodies.json");
const foodies = existsSync(foodiesPath) ? JSON.parse(readFileSync(foodiesPath, "utf8")) : null;

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
    String(rel).startsWith("entertainment/orgs/") ||
    String(rel).startsWith("foodies/")
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

const crumbs = (trail = []) => {
  const ancestors = trail.filter((item) => !item.current);
  return `<nav class="crumbs" aria-label="Breadcrumb">
    <a href="/">Home</a>
    ${ancestors
      .map(
        (item) =>
          `<span class="crumbs-sep" aria-hidden="true"> / </span><a href="${esc(item.href)}">${esc(item.label)}</a>`,
      )
      .join("")}
  </nav>`;
};

const siteNavLinks = (current) =>
  nav
    .map((item) => {
      const on = item.id === current;
      return `<a href="${esc(item.href)}"${on ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`;
    })
    .join("");

const siteHeader = (current) => `<header class="site-header">
    <div class="wrap">
      <a class="wordmark" href="/">
        <img src="/img/brand/logo-circle.png" width="44" height="44" alt="">
        <span>${esc(data.site.name)}</span>
      </a>
      <nav class="site-nav" id="site-nav" aria-label="Site">
        ${siteNavLinks(current)}
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
const THEME_COLOR = "#3b257b";
const BACKGROUND_COLOR = "#f4ead8";
// iOS home-screen labels are ~12–13 characters. Longer titles get spaces
// stripped, then ellipsized (Little Saigon Sactown → LittleSaigonSact...).
const HOME_SCREEN_TITLE = "Little Saigon";
const DEFAULT_OG = { path: "/img/brand/og-image.png", width: 1200, height: 630 };

const siteCssSource = readFileSync(join(root, "src/css/site.css"));
const siteCssHash = createHash("sha256").update(siteCssSource).digest("hex").slice(0, 12);
const siteCssHref = `/css/site.css?v=${siteCssHash}`;

const cacheStamp = () => {
  let rev;
  try {
    rev = execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    rev = new Date().toISOString().slice(0, 10);
  }
  return `${rev}-${siteCssHash}`;
};

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

const SHARE_DESCRIPTION = "Vietnamese food picks for Greater Sacramento.";

const socialHead = ({ title, description, path = "/", image, ogType = "website" }) => {
  const pageUrl = `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
  const desc = description || SHARE_DESCRIPTION;
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,600;14..32,700&family=Noto+Serif:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${siteCssHref}">
  <link rel="icon" href="/img/brand/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/img/brand/apple-touch.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="${THEME_COLOR}">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="${esc(HOME_SCREEN_TITLE)}">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
</head>
<body${home ? ' class="home"' : ""}>
  ${siteHeader(current)}
  ${body}
  <footer>
    <div class="wrap">
      <span>${esc(data.site.name)}</span>
      <div class="footer-tools">
        <nav class="footer-nav" aria-label="Site">
          ${siteNavLinks(current)}
        </nav>
        ${igButton()}
      </div>
    </div>
  </footer>
  <script src="/js/site-nav.js" defer></script>
  <script src="/js/poster-lightbox.js" defer></script>
  <script src="/js/pwa-register.js" defer></script>
</body>
</html>
`;

const recommenderLinks = (k) => {
  const raw = k.recommenders ?? k.recommender;
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .map((rec) => {
      if (!rec || typeof rec !== "object") return null;
      const name = typeof rec.name === "string" ? rec.name.trim() : "";
      const url = typeof rec.url === "string" ? rec.url.trim() : "";
      if (!name || !url) return null;
      return `<a href="${esc(url)}" rel="noopener noreferrer" target="_blank">${esc(name)}</a>`;
    })
    .filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return `Recommended by ${list[0]}`;
  if (list.length === 2) return `Recommended by ${list[0]} and ${list[1]}`;
  return `Recommended by ${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
};

const kitchenNote = (k) => {
  const note = typeof k.note === "string" ? k.note.trim() : "";
  const recs = recommenderLinks(k);
  if (!note && !recs) return "";
  const body = note && recs ? `${esc(note)} ${recs}` : note ? esc(note) : recs;
  return `<p class="kitchen-note">${body}</p>`;
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
  description: SHARE_DESCRIPTION,
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
        <div class="section-head-links">
          <a href="/viet-eats/">All categories</a>
          <a href="/viet-eats/foodies/">About the foodies</a>
        </div>
      </div>
      <p class="lede">Vietnamese cuisine and the best kitchens that cook them.</p>
      ${mealCategoryGrid()}
      <p class="section-foot"><a href="/viet-eats/">All categories</a></p>
    </section>
    ${entertainment ? homeEntertainmentSection({ entertainment, esc, imgEl, crumbs }) : ""}
  </main>
  <script type="module" src="/js/home-sort.js"></script>`,
});

const vietEatsIndex = layout({
  title: `Viet Eats · ${data.site.name}`,
  path: "/viet-eats/",
  description: SHARE_DESCRIPTION,
  current: "viet-eats",
  body: `<main class="wrap">
    <header class="hero">
      ${crumbs([{ label: "Viet Eats", current: true }])}
      <div class="page-title-row">
        <h1>Viet Eats</h1>
        <a href="/viet-eats/foodies/">About the foodies</a>
      </div>
      <p class="tagline">Dish-first kitchen picks for Little Saigon Sacramento.</p>
    </header>
    ${mealCategoryGrid()}
  </main>
  <script type="module" src="/js/home-sort.js"></script>`,
});

const IG_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="5.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="4.35" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="17.45" cy="6.55" r="1.15" fill="currentColor"/>
    </svg>`;

const FB_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M14.2 8.2h3.1V4.8h-3.1c-2.7 0-4.6 1.7-4.6 4.5v1.7H7.5v3.4h2.1V21h3.7v-6.6h2.6l.6-3.4h-3.2V9.6c0-.8.4-1.4 1.4-1.4z"/>
    </svg>`;

const foodieAvatar = (person) => {
  const photo = imgEl(person.photo, person.name);
  if (photo) return photo;
  const letter = (person.name || "?").trim().charAt(0).toUpperCase() || "?";
  return `<span class="foodie-fallback" aria-hidden="true">${esc(letter)}</span>`;
};

const foodieSocial = (person) => {
  const network = person.network === "facebook" ? "Facebook" : "Instagram";
  const icon = person.network === "facebook" ? FB_SVG : IG_SVG;
  const handle = person.handle || person.name;
  const networkClass = person.network === "facebook" ? " foodie-social--facebook" : "";
  return `<a class="foodie-social${networkClass}" href="${esc(person.url)}" rel="noopener noreferrer" target="_blank">
        ${icon}
        <span class="foodie-handle">${esc(handle)}</span>
        <span class="visually-hidden"> on ${network}</span>
      </a>`;
};

const foodiesPage = foodies
  ? layout({
      title: `${foodies.title || "About the foodies"} · Viet Eats`,
      path: "/viet-eats/foodies/",
      description: foodies.lede || "Sacramento-area food voices behind Viet Eats kitchen picks.",
      current: "viet-eats",
      body: `<main class="wrap foodies">
      <header class="hero">
        ${crumbs([{ href: "/viet-eats/", label: "Viet Eats" }, { label: foodies.title || "About the foodies", current: true }])}
        <h1>${esc(foodies.title || "About the foodies")}</h1>
        ${foodies.lede ? `<p class="tagline">${esc(foodies.lede)}</p>` : ""}
      </header>
      <ul class="foodie-list">
        ${[...(foodies.people || [])]
          .sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" }),
          )
          .map(
            (person) => `<li class="foodie-card">
          <div class="foodie-avatar">${foodieAvatar(person)}</div>
          <div class="foodie-body">
            <h2>${esc(person.name)}</h2>
            ${foodieSocial(person)}
          </div>
        </li>`,
          )
          .join("")}
      </ul>
    </main>`,
    })
  : "";

const catLink = (c) => (c ? { href: `/viet-eats/${c.slug}/`, label: c.vi } : null);

const catPage = (cat) => {
  const { prev, next } = adjacentInList(categories, cat.slug, { wrap: true, key: "slug" });
  const navPayload = JSON.stringify({
    current: cat.slug,
    items: categories.map((c) => ({ slug: c.slug, vi: c.vi, fit: c.fit || [] })),
  });
  return layout({
    title: `${cat.vi} (${cat.gloss}) · Viet Eats`,
    path: `/viet-eats/${cat.slug}/`,
    description: `${cat.vi} (${cat.gloss}) — ${SHARE_DESCRIPTION}`,
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
      <script type="application/json" id="meal-sort-windows">${mealSortWindows}</script>
      <script type="application/json" id="viet-eats-nav">${navPayload}</script>
      <noscript><style>.nav-dishes[data-viet-eats-nav]:not([data-sorted]){visibility:visible}</style></noscript>
      ${pagerNavHtml({
        prev: catLink(prev),
        next: catLink(next),
        escape: esc,
        attrs: "data-viet-eats-nav",
      })}
    </main>
    <script type="module" src="/js/home-sort.js"></script>`,
  });
};

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "css"), { recursive: true });
mkdirSync(join(dist, "js"), { recursive: true });
mkdirSync(join(dist, "viet-eats"), { recursive: true });
cpSync(join(root, "src/css/site.css"), join(dist, "css/site.css"));
cpSync(join(root, "src/js/meal-sort.js"), join(dist, "js/meal-sort.js"));
cpSync(join(root, "src/js/home-sort.js"), join(dist, "js/home-sort.js"));
cpSync(join(root, "src/js/site-nav.js"), join(dist, "js/site-nav.js"));
cpSync(join(root, "src/js/poster-lightbox.js"), join(dist, "js/poster-lightbox.js"));
cpSync(join(root, "src/js/performer-sort.js"), join(dist, "js/performer-sort.js"));
cpSync(join(root, "src/js/filter-drawer.js"), join(dist, "js/filter-drawer.js"));
cpSync(join(root, "src/js/maps-config.js"), join(dist, "js/maps-config.js"));
cpSync(join(root, "src/js/entertainment-map.js"), join(dist, "js/entertainment-map.js"));
cpSync(join(root, "src/js/pwa-register.js"), join(dist, "js/pwa-register.js"));
cpSync(join(root, "src/img"), join(dist, "img"), { recursive: true });
writeFileSync(join(dist, "CNAME"), "littlesaigonsac.town\n");
writeFileSync(join(dist, ".nojekyll"), "");
writeFileSync(join(dist, "index.html"), home);
writeFileSync(join(dist, "viet-eats/index.html"), vietEatsIndex);
if (foodiesPage) {
  const foodiesDir = join(dist, "viet-eats/foodies");
  mkdirSync(foodiesDir, { recursive: true });
  writeFileSync(join(foodiesDir, "index.html"), foodiesPage);
}
for (const cat of categories) {
  const dir = join(dist, "viet-eats", cat.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), catPage(cat));
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
const foodiesNote = foodiesPage ? " + About the foodies" : "";

writeFileSync(
  join(dist, "site.webmanifest"),
  `${JSON.stringify(
    {
      id: `${SITE_ORIGIN}/`,
      name: data.site.name,
      short_name: HOME_SCREEN_TITLE,
      description: data.site.tagline || SHARE_DESCRIPTION,
      start_url: "/",
      scope: "/",
      display: "standalone",
      lang: "en",
      theme_color: THEME_COLOR,
      background_color: BACKGROUND_COLOR,
      icons: [
        { src: "/img/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/img/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        {
          src: "/img/brand/icon-512-maskable.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    null,
    2,
  )}\n`,
);

const offlinePage = layout({
  title: `Offline · ${data.site.name}`,
  path: "/offline/",
  description: "This page is saved on your device. Connect to load the rest of the site.",
  current: "",
  body: `<main class="wrap offline-page">
    <header class="hero">
      <h1>You’re offline</h1>
      <p class="tagline">Little Saigon Sactown needs a connection for this page. Open Home once you’re back online.</p>
      <p class="lede"><a href="/">Back to Home</a></p>
    </header>
  </main>`,
});
mkdirSync(join(dist, "offline"), { recursive: true });
writeFileSync(join(dist, "offline/index.html"), offlinePage);

const precache = [
  "/",
  "/offline/",
  siteCssHref,
  "/js/meal-sort.js",
  "/js/home-sort.js",
  "/js/site-nav.js",
  "/js/poster-lightbox.js",
  "/js/performer-sort.js",
  "/js/filter-drawer.js",
  "/js/maps-config.js",
  "/js/entertainment-map.js",
  "/js/pwa-register.js",
  "/site.webmanifest",
  "/img/brand/icon-192.png",
  "/img/brand/icon-512.png",
  "/img/brand/icon-512-maskable.png",
  "/img/brand/logo-circle.png",
  "/img/brand/logo-wordmark.svg",
  "/img/brand/favicon.png",
  "/img/brand/apple-touch.png",
];
const swSource = readFileSync(join(root, "src/sw.js"), "utf8")
  .replaceAll("__CACHE_NAME__", `lss-${cacheStamp()}`)
  .replaceAll("__PRECACHE_JSON__", JSON.stringify(precache));
writeFileSync(join(dist, "sw.js"), swSource);

console.log(`Built home + Viet Eats (${categories.length} categories)${foodiesNote}${extra} → ${dist}`);
