/** HTML builders for /lists on littlesaigonsac.town */

function websiteLabelFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || url;
  } catch {
    return url;
  }
}

function displayArea(area) {
  const a = String(area || "").trim();
  if (!a || a.toUpperCase() === "TBD") return "";
  return a;
}

/** Drop ", ST 12345" for display; keep street + city. Maps href stays full. */
function shortAddress(address) {
  return String(address ?? "")
    .replace(/,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/,\s*$/, "");
}

/** City from `Street, City, CA 958xx`. */
function cityFromAddress(address) {
  const a = displayArea(address);
  if (!a) return "";
  const m = a.match(/,\s*([^,]+),\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\s*$/);
  return m ? m[1].trim() : "";
}

/** Street line only when listings are already grouped by city. */
function streetOnly(address) {
  const a = displayArea(address);
  if (!a) return "";
  return a
    .replace(/,\s*[^,]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\s*$/, "")
    .trim();
}

function citySlug(city) {
  return String(city || "other")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "other";
}

function listingAddresses(listing) {
  if (Array.isArray(listing.addresses) && listing.addresses.length) {
    return listing.addresses.map(displayArea).filter(Boolean);
  }
  const one = displayArea(listing.area);
  return one ? [one] : [];
}

/** Same Maps URLs API pattern as Viet Eats kitchens (native-app handoff). */
function addressMapsHref(name, address) {
  const query = [String(name || "").trim(), displayArea(address)].filter(Boolean).join(", ");
  if (!query) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function typeBadge(type) {
  if (type === "tool") return "Industry tool";
  if (type === "school") return "School";
  if (type === "beauty") return "Beauty salon";
  return "";
}

export function writeListsPages({ dist, join, mkdirSync, writeFileSync, layout, esc, imgEl, crumbs, lists }) {
  const siteName = "Little Saigon Sactown";
  const categories = lists.categories || [];

  const hubCards = categories
    .map((cat) => {
      const count =
        cat.slug === "lion-dance"
          ? (cat.lanes || []).reduce((n, lane) => n + (lane.troupes?.length || 0), 0)
          : cat.listings?.length || 0;
      const countLabel =
        cat.slug === "lion-dance"
          ? `${count} troupes`
          : `${count} listings`;
      return `<a class="lists-hub-card" href="/lists/${esc(cat.slug)}/">
        <h2>${esc(cat.title)}</h2>
        <p class="gloss">${esc(cat.blurb || "")}</p>
        <p class="lists-hub-count">${esc(countLabel)}</p>
      </a>`;
    })
    .join("");

  mkdirSync(join(dist, "lists"), { recursive: true });
  writeFileSync(
    join(dist, "lists/index.html"),
    layout({
      title: `Lists · ${siteName}`,
      path: "/lists/",
      description: lists.lead || "Community business directories for Little Saigon Sacramento.",
      current: "lists",
      body: `<main class="wrap">
    <header class="hero">
      ${crumbs([{ label: "Lists", current: true }])}
      <h1>${esc(lists.headline || "Lists")}</h1>
      ${lists.lead ? `<p class="tagline">${esc(lists.lead)}</p>` : ""}
    </header>
    <div class="lists-hub-grid">${hubCards}</div>
    ${lists.contactNote ? `<p class="muted lists-note">${esc(lists.contactNote)}</p>` : ""}
  </main>`,
    }),
  );

  for (const cat of categories) {
    const dir = join(dist, "lists", cat.slug);
    mkdirSync(dir, { recursive: true });
    const body =
      cat.slug === "lion-dance"
        ? lionDanceBody({ cat, esc, imgEl, crumbs })
        : nailSalonsBody({ cat, esc, crumbs });
    writeFileSync(
      join(dir, "index.html"),
      layout({
        title: `${cat.headline || cat.title} · Lists · ${siteName}`,
        path: `/lists/${cat.slug}/`,
        description: cat.lead || cat.blurb || lists.lead,
        current: "lists",
        body,
      }),
    );
  }

  // Short-lived stubs if anyone hit /biz/ during the rename pass.
  const bizRedirect = (to) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${to}">
<link rel="canonical" href="https://littlesaigonsac.town${to}">
<title>Moved · Little Saigon Sactown</title>
</head><body>
<p>Moved to <a href="${to}">${to}</a>.</p>
<script>location.replace(${JSON.stringify(to)} + location.search + location.hash);</script>
</body></html>`;
  mkdirSync(join(dist, "biz"), { recursive: true });
  writeFileSync(join(dist, "biz/index.html"), bizRedirect("/lists/"));
  for (const cat of categories) {
    const dir = join(dist, "biz", cat.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), bizRedirect(`/lists/${cat.slug}/`));
  }

  return {
    categories: categories.length,
    troupes: (categories.find((c) => c.slug === "lion-dance")?.lanes || []).reduce(
      (n, lane) => n + (lane.troupes?.length || 0),
      0,
    ),
    nailSalons: categories.find((c) => c.slug === "nail-salons")?.listings?.length || 0,
  };
}

function lionDanceBody({ cat, esc, imgEl, crumbs }) {
  const lanes = cat.lanes || [];
  const toc =
    lanes.length > 1
      ? `<nav class="lists-toc" aria-label="Sections">
      ${lanes.map((lane) => `<a href="#${esc(lane.id)}">${esc(lane.title)}</a>`).join("")}
    </nav>`
      : "";

  const sections = lanes
    .map((lane) => {
      const items = (lane.troupes || [])
        .map((troupe) => {
          const aka = troupe.aka ? ` <span class="lists-aka">${esc(troupe.aka)}</span>` : "";
          const handle = troupe.handle || "";
          const ig = troupe.instagram
            ? `<a href="${esc(troupe.instagram)}" rel="noopener noreferrer" target="_blank">${esc(handle || "Instagram")}</a>`
            : `<span class="muted">No Instagram on file</span>`;
          const web = troupe.website
            ? `<a href="${esc(troupe.website)}" rel="noopener noreferrer" target="_blank">${esc(websiteLabelFromUrl(troupe.website))}</a>`
            : "";
          const photo = troupe.avatar ? imgEl(troupe.avatar, "", { kind: "avatar", size: 44 }) : "";
          const avatar = photo
            ? troupe.instagram
              ? `<a class="lists-avatar-link" href="${esc(troupe.instagram)}" rel="noopener noreferrer" target="_blank" tabindex="-1" aria-hidden="true">${photo}</a>`
              : photo
            : "";
          return `<li class="lists-roster-item">
      ${avatar}
      <span class="lists-roster-text">
        <span class="lists-roster-name">${esc(troupe.name)}${aka}</span>
        <span class="lists-roster-links">
          <span class="lists-roster-ig">${ig}</span>
          ${web ? `<span class="lists-roster-web">${web}</span>` : ""}
        </span>
      </span>
    </li>`;
        })
        .join("");
      return `<section class="lists-lane" id="${esc(lane.id)}">
      <h2>${esc(lane.title)}</h2>
      <ul class="lists-roster-list">${items}</ul>
    </section>`;
    })
    .join("");

  return `<main class="wrap">
    <header class="hero">
      ${crumbs([
        { href: "/lists/", label: "Lists" },
        { label: cat.title, current: true },
      ])}
      <h1>${esc(cat.headline || cat.title)}</h1>
      ${cat.lead ? `<p class="tagline">${esc(cat.lead)}</p>` : ""}
    </header>
    ${cat.intro ? `<p class="lede">${esc(cat.intro)}</p>` : ""}
    ${toc}
    ${sections}
    ${cat.contactNote ? `<p class="muted lists-note">${esc(cat.contactNote)}</p>` : ""}
  </main>`;
}

function nailListingItem(listing, esc, addresses) {
  const badge = typeBadge(listing.type);
  const addrs = addresses || listingAddresses(listing);
  const addressHtml = addrs
    .map((addr) => {
      const label = streetOnly(addr) || shortAddress(addr);
      const mapsHref = addressMapsHref(listing.name, addr);
      if (!label) return "";
      return mapsHref
        ? `<a class="lists-address" href="${esc(mapsHref)}" rel="noopener noreferrer">${esc(label)}</a>`
        : `<span class="lists-area">${esc(label)}</span>`;
    })
    .filter(Boolean)
    .join("");
  return `<li class="lists-roster-item lists-roster-item--nail">
      <span class="lists-roster-text">
        <span class="lists-roster-name">${esc(listing.name)}${badge ? ` <span class="lists-type">${esc(badge)}</span>` : ""}</span>
        ${addressHtml ? `<span class="lists-roster-meta lists-roster-meta--stack">${addressHtml}</span>` : ""}
        ${listing.note ? `<span class="lists-listing-note muted">${esc(listing.note)}</span>` : ""}
      </span>
    </li>`;
}

function nailSalonsBody({ cat, esc, crumbs }) {
  const byCity = new Map();
  for (const listing of cat.listings || []) {
    const addrs = listingAddresses(listing);
    if (!addrs.length) {
      if (!byCity.has("Other")) byCity.set("Other", []);
      byCity.get("Other").push({ listing, addresses: [] });
      continue;
    }
    const citiesForListing = [...new Set(addrs.map(cityFromAddress).filter(Boolean))];
    for (const city of citiesForListing.length ? citiesForListing : ["Other"]) {
      const cityAddrs = addrs.filter((a) => cityFromAddress(a) === city);
      if (!byCity.has(city)) byCity.set(city, []);
      byCity.get(city).push({
        listing,
        addresses: cityAddrs.length ? cityAddrs : addrs,
      });
    }
  }

  const cities = [...byCity.keys()].sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });

  for (const city of cities) {
    byCity.get(city).sort((a, b) =>
      String(a.listing.name || "").localeCompare(String(b.listing.name || ""), undefined, {
        sensitivity: "base",
      }),
    );
  }

  const toc =
    cities.length > 1
      ? `<nav class="lists-toc" aria-label="Cities">
      ${cities.map((city) => `<a href="#${esc(citySlug(city))}">${esc(city)}</a>`).join("")}
    </nav>`
      : "";

  const sections = cities
    .map((city) => {
      const items = byCity
        .get(city)
        .map((entry) => nailListingItem(entry.listing, esc, entry.addresses))
        .join("");
      return `<section class="lists-lane" id="${esc(citySlug(city))}">
      <h2>${esc(city)}</h2>
      <ul class="lists-roster-list">${items}</ul>
    </section>`;
    })
    .join("");

  return `<main class="wrap">
    <header class="hero">
      ${crumbs([
        { href: "/lists/", label: "Lists" },
        { label: cat.title, current: true },
      ])}
      <h1>${esc(cat.headline || cat.title)}</h1>
      ${cat.lead ? `<p class="tagline">${esc(cat.lead)}</p>` : ""}
    </header>
    ${cat.intro ? `<p class="lede">${esc(cat.intro)}</p>` : ""}
    <p class="lists-verify-banner">Working roster for community verification — ownership status is research, not a claim.</p>
    ${toc}
    ${sections}
    ${cat.contactNote ? `<p class="muted lists-note">${esc(cat.contactNote)}</p>` : ""}
  </main>`;
}
