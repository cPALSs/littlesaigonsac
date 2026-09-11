/** HTML builders for /entertainment on littlesaigonsac.town */

import { existsSync } from "node:fs";
import { cardVenueLine, venueLine } from "./venue-display.mjs";

export { cardVenueLine, venueLine } from "./venue-display.mjs";

const ROLE_LABEL = {
  host: "Host",
  producer: "Producer",
  co_producer: "Co-producer",
  presenter: "Presenter",
  vocalist: "Vocalist",
  mc: "MC",
  dj: "DJ",
  band: "Band",
  other: "Featured",
};

export function splitShows(events, asOf) {
  const upcoming = [];
  const past = [];
  for (const ev of events) {
    const start = ev.start_date || "";
    if (start && start >= asOf) upcoming.push(ev);
    else past.push(ev);
  }
  upcoming.sort(
    (a, b) =>
      (a.start_date || "").localeCompare(b.start_date || "") ||
      a.label.localeCompare(b.label, "vi"),
  );
  past.sort(
    (a, b) =>
      (b.start_date || "").localeCompare(a.start_date || "") ||
      a.label.localeCompare(b.label, "vi"),
  );
  return { upcoming, past };
}

function entityHref(item, people, orgs) {
  if (item.type === "person" && people[item.id]) {
    return `/entertainment/people/${item.id}/`;
  }
  if (item.type === "org" && orgs[item.id]) {
    return `/entertainment/orgs/${item.id}/`;
  }
  return null;
}

function showsFor(events, type, id) {
  return events.filter(
    (ev) =>
      ev.producers.some((p) => p.type === type && p.id === id) ||
      ev.lineup.some((p) => p.type === type && p.id === id),
  );
}

const UNLISTED_EVENTS_FB_URL = "https://www.facebook.com/groups/604503937066539";
const UNLISTED_EVENTS_FB_NAME = "LITTLE SAIGON in Sacramento - Cộng Đồng Người Việt";

/** Public gallery geography: Sacramento region, city of Stockton, Reno / casino circuit. Bay Area out. */
export const ENTERTAINMENT_TAGLINE =
  "Vietnamese concerts and dance nights around Sacramento, Stockton, and Reno.";

/**
 * Paths published then withdrawn (Bay Area night, 2026-09-11).
 * Write a client redirect so the old URL is not a 404. Skip if a live page exists.
 */
const RETIRED_ENTERTAINMENT_PATHS = [
  "van-lang-da-vu-mua-thu-la-bay-2026",
  "orgs/trung-tam-viet-ngu-van-lang-san-jose",
  "orgs/the-friend-band",
  "people/hoang-thuc-linh",
  "people/huong-thuy",
  "people/le-ha",
  "people/ngan-hanh",
  "people/quoc-bao",
  "people/quoc-khanh",
  "people/thien-kim",
  "people/tuong-vy",
  "people/vickie-hoa-tran",
  "people/vu-hien",
  "people/yen-lam",
];

export function performerRows(people = {}, orgs = {}) {
  return [
    ...Object.values(people).map((p) => ({
      id: p.id,
      name: p.name,
      href: `/entertainment/people/${p.id}/`,
    })),
    ...Object.values(orgs).map((o) => ({
      id: o.id,
      name: o.name,
      href: `/entertainment/orgs/${o.id}/`,
    })),
  ]
    .filter((row) => String(row.name || "").trim())
    .sort((a, b) => a.name.localeCompare(b.name, "vi", { sensitivity: "base" }));
}

export function entertainmentHelpers({ esc, imgEl, crumbs }) {
  const entityName = (item, people, orgs) => {
    const href = entityHref(item, people, orgs);
    const name = esc(item.name);
    return href ? `<a href="${esc(href)}">${name}</a>` : `<span>${name}</span>`;
  };

  const posterCard = (ev) => {
    const place = cardVenueLine(ev);
    return `<a class="card poster" href="/entertainment/${esc(ev.id)}/">
    <div class="card-photo">${imgEl(ev.poster, ev.label)}</div>
    <div class="card-body">
      <h2>${esc(ev.label)}</h2>
      <p class="gloss">${esc(ev.display_date || ev.start_date || "")}</p>
      ${place ? `<p class="gloss">${esc(place)}</p>` : ""}
    </div>
  </a>`;
  };

  const posterGrid = (list) =>
    `<div class="poster-grid">${list.map(posterCard).join("")}</div>`;

  const eventPoster = (ev) => {
    const posterImg = imgEl(ev.poster, ev.label);
    if (!posterImg) return `<div class="event-poster"></div>`;
    return `<div class="event-poster"><a class="event-poster-open" href="/img/${esc(ev.poster)}" data-lightbox aria-expanded="false">${posterImg}</a></div>`;
  };

  const creditList = (items, people, orgs) => {
    if (!items?.length) return "";
    return `<ul class="credit-list">
    ${items
      .map((item) => {
        const role = ROLE_LABEL[item.role] || "";
        return `<li>${entityName(item, people, orgs)}${
          role ? ` <span class="credit-role">${esc(role)}</span>` : ""
        }</li>`;
      })
      .join("")}
  </ul>`;
  };

  const IG_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="5.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="12" cy="12" r="4.35" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="17.45" cy="6.55" r="1.15" fill="currentColor"/>
    </svg>`;

  const FB_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M14.2 8.2h3.1V4.8h-3.1c-2.7 0-4.6 1.7-4.6 4.5v1.7H7.5v3.4h2.1V21h3.7v-6.6h2.6l.6-3.4h-3.2V9.6c0-.8.4-1.4 1.4-1.4z"/>
    </svg>`;

  const YT_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.2" y="5.5" width="19.6" height="13" rx="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path fill="currentColor" d="M10.2 9.2v5.6L15.7 12z"/>
    </svg>`;

  const websiteChipLabel = (url) => {
    try {
      const host = new URL(url).hostname.replace(/^www\./i, "");
      return host || "Website";
    } catch {
      return "Website";
    }
  };

  const socialList = (links) => {
    if (!links?.length) return "";
    return `<ul class="social-links">
    ${links
      .map((l) => {
        const kind = l.kind || "";
        if (kind === "instagram") {
          return `<li><a class="social-icon" href="${esc(l.url)}" rel="noopener noreferrer" target="_blank" aria-label="Instagram">${IG_SVG}</a></li>`;
        }
        if (kind === "facebook") {
          return `<li><a class="social-icon" href="${esc(l.url)}" rel="noopener noreferrer" target="_blank" aria-label="Facebook">${FB_SVG}</a></li>`;
        }
        if (kind === "youtube") {
          return `<li><a class="social-icon" href="${esc(l.url)}" rel="noopener noreferrer" target="_blank" aria-label="YouTube">${YT_SVG}</a></li>`;
        }
        const label = kind === "website" ? websiteChipLabel(l.url) : l.label;
        return `<li><a href="${esc(l.url)}" rel="noopener noreferrer" target="_blank">${esc(label)}</a></li>`;
      })
      .join("")}
  </ul>`;
  };

  const entityHeading = (name, links, photo, kind) => {
    const photoImg = imgEl(photo, name);
    const copy = `<h1>${esc(name)}</h1>
        ${socialList(links)}`;
    if (!photoImg) return copy;
    const photoClass =
      kind === "org"
        ? "entity-photo entity-photo--org"
        : "entity-photo entity-photo--person";
    return `<div class="entity-heading">
        <div class="${photoClass}">${photoImg}</div>
        <div class="entity-heading-copy">
          ${copy}
        </div>
      </div>`;
  };

  const bandBlock = (title, list) => {
    if (!list.length) return "";
    return `<h2 class="section-label band-label">${esc(title)}</h2>
      ${posterGrid(list)}`;
  };

  const entertainmentTabs = (active) => {
    const tabs = [
      { id: "events", href: "/entertainment/events/", label: "Events" },
      { id: "performers", href: "/entertainment/performers/", label: "Performers" },
    ];
    return `<nav class="ent-tabs" aria-label="Entertainment">
      ${tabs
        .map(
          (tab) =>
            `<a href="${esc(tab.href)}"${tab.id === active ? ' aria-current="page"' : ""}>${esc(tab.label)}</a>`,
        )
        .join("")}
    </nav>`;
  };

  const performerList = (rows) => {
    if (!rows.length) return "";
    return `<ul class="performer-list">
      ${rows
        .map((row) => `<li><a href="${esc(row.href)}">${esc(row.name)}</a></li>`)
        .join("")}
    </ul>`;
  };

  const unlistedEventsInvite = () =>
    `<p class="ent-invite">Know a show we missed? Post it in <a href="${esc(UNLISTED_EVENTS_FB_URL)}" rel="noopener noreferrer" target="_blank">${esc(UNLISTED_EVENTS_FB_NAME)}</a>.</p>`;

  const retiredRedirectPage = () => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=/entertainment/">
  <link rel="canonical" href="https://littlesaigonsac.town/entertainment/">
  <title>Moved · Little Saigon Sactown</title>
</head>
<body>
  <p>This page is no longer in the Entertainment gallery. <a href="/entertainment/">See current shows</a>.</p>
</body>
</html>
`;

  const writeRetiredRedirects = ({ dist, join, mkdirSync, writeFileSync }) => {
    for (const rel of RETIRED_ENTERTAINMENT_PATHS) {
      const dir = join(dist, "entertainment", rel);
      const file = join(dir, "index.html");
      if (existsSync(file)) continue;
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, retiredRedirectPage());
    }
  };

  return {
    posterCard,
    posterGrid,
    eventPoster,
    creditList,
    socialList,
    entityHeading,
    bandBlock,
    entertainmentTabs,
    performerList,
    unlistedEventsInvite,
    writeRetiredRedirects,
    entityName,
    crumbsEnt: (trail) => crumbs(trail),
  };
}

export function homeEntertainmentSection({ entertainment, esc, imgEl, crumbs }) {
  const { events, as_of_pt: asOf } = entertainment;
  const { upcoming, past } = splitShows(events, asOf);
  const strip = [...upcoming, ...past].slice(0, 4);
  if (!strip.length) return "";
  const { posterCard, unlistedEventsInvite } = entertainmentHelpers({ esc, imgEl, crumbs });
  return `<section class="wrap feature" id="entertainment">
      <div class="section-head">
        <h2>Entertainment</h2>
        <a href="/entertainment/">All shows</a>
      </div>
      <p class="lede">${ENTERTAINMENT_TAGLINE}</p>
      ${unlistedEventsInvite()}
      <div class="poster-grid poster-grid--home">${strip.map(posterCard).join("")}</div>
    </section>`;
}

export function writeEntertainmentPages({
  dist,
  join,
  mkdirSync,
  writeFileSync,
  layout,
  esc,
  imgEl,
  crumbs,
  entertainment,
}) {
  const { events, people, orgs, as_of_pt: asOf } = entertainment;
  const { upcoming, past } = splitShows(events, asOf);
  const h = entertainmentHelpers({ esc, imgEl, crumbs });
  const siteName = "Little Saigon Sactown";
  const galleryDescription = ENTERTAINMENT_TAGLINE;

  const galleryBody = `<main class="wrap">
    <header class="hero">
      ${h.crumbsEnt([{ label: "Entertainment", current: true }])}
      <h1>Entertainment</h1>
      <p class="tagline">${galleryDescription}</p>
      ${h.unlistedEventsInvite()}
      ${h.entertainmentTabs("events")}
    </header>
    ${h.bandBlock("Upcoming", upcoming)}
    ${h.bandBlock("Past", past)}
  </main>`;
  const galleryPage = (path) =>
    layout({
      title: `Entertainment · ${siteName}`,
      path,
      description: galleryDescription,
      current: "entertainment",
      body: galleryBody,
    });

  mkdirSync(join(dist, "entertainment"), { recursive: true });
  mkdirSync(join(dist, "entertainment/events"), { recursive: true });
  writeFileSync(join(dist, "entertainment/index.html"), galleryPage("/entertainment/"));
  writeFileSync(join(dist, "entertainment/events/index.html"), galleryPage("/entertainment/events/"));

  const performers = performerRows(people, orgs);
  mkdirSync(join(dist, "entertainment/performers"), { recursive: true });
  writeFileSync(
    join(dist, "entertainment/performers/index.html"),
    layout({
      title: `Performers · Entertainment · ${siteName}`,
      path: "/entertainment/performers/",
      description: galleryDescription,
      current: "entertainment",
      body: `<main class="wrap">
    <header class="hero">
      ${h.crumbsEnt([
        { href: "/entertainment/", label: "Entertainment" },
        { label: "Performers", current: true },
      ])}
      <h1>Entertainment</h1>
      <p class="tagline">${galleryDescription}</p>
      ${h.unlistedEventsInvite()}
      ${h.entertainmentTabs("performers")}
    </header>
    ${h.performerList(performers)}
  </main>`,
    }),
  );

  for (const ev of events) {
    const place = venueLine(ev);
    const dir = join(dist, "entertainment", ev.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "index.html"),
      layout({
        title: `${ev.label} · Entertainment`,
        path: `/entertainment/${ev.id}/`,
        description: [ev.display_date || ev.start_date, cardVenueLine(ev) || place].filter(Boolean).join(" · "),
        image: ev.poster,
        ogType: "article",
        current: "entertainment",
        body: `<main class="wrap event">
      <header class="hero">
        ${h.crumbsEnt([
          { href: "/entertainment/", label: "Entertainment" },
          { label: ev.label, current: true },
        ])}
        <h1>${esc(ev.label)}</h1>
      </header>
      <div class="event-layout">
        ${h.eventPoster(ev)}
        <div class="event-copy">
          <p class="event-meta">${esc(ev.display_date || ev.start_date || "")}</p>
          ${place ? `<p class="event-meta">${esc(place)}</p>` : ""}
          ${
            ev.producers.length
              ? `<h2 class="section-label">Producers</h2>${h.creditList(ev.producers, people, orgs)}`
              : ""
          }
          ${
            ev.lineup.length
              ? `<h2 class="section-label">Lineup</h2>${h.creditList(ev.lineup, people, orgs)}`
              : ""
          }
        </div>
      </div>
    </main>`,
      }),
    );
  }

  mkdirSync(join(dist, "entertainment/people"), { recursive: true });
  for (const person of Object.values(people)) {
    const shows = showsFor(events, "person", person.id);
    const { upcoming: u, past: p } = splitShows(shows, asOf);
    const dir = join(dist, "entertainment/people", person.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "index.html"),
      layout({
        title: `${person.name} · Entertainment`,
        path: `/entertainment/people/${person.id}/`,
        description: `${person.name} on Little Saigon Sactown Entertainment.`,
        image: person.photo,
        current: "entertainment",
        body: `<main class="wrap">
      <header class="hero">
        ${h.crumbsEnt([
          { href: "/entertainment/", label: "Entertainment" },
          { label: person.name, current: true },
        ])}
        ${h.entityHeading(person.name, person.links, person.photo, "person")}
      </header>
      ${u.length || p.length ? h.posterGrid([...u, ...p]) : ""}
    </main>`,
      }),
    );
  }

  mkdirSync(join(dist, "entertainment/orgs"), { recursive: true });
  for (const org of Object.values(orgs)) {
    const shows = showsFor(events, "org", org.id);
    const { upcoming: u, past: p } = splitShows(shows, asOf);
    const dir = join(dist, "entertainment/orgs", org.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "index.html"),
      layout({
        title: `${org.name} · Entertainment`,
        path: `/entertainment/orgs/${org.id}/`,
        description: `${org.name} on Little Saigon Sactown Entertainment.`,
        image: org.photo,
        current: "entertainment",
        body: `<main class="wrap">
      <header class="hero">
        ${h.crumbsEnt([
          { href: "/entertainment/", label: "Entertainment" },
          { label: org.name, current: true },
        ])}
        ${h.entityHeading(org.name, org.links, org.photo, "org")}
      </header>
      ${u.length || p.length ? h.posterGrid([...u, ...p]) : ""}
    </main>`,
      }),
    );
  }

  h.writeRetiredRedirects({ dist, join, mkdirSync, writeFileSync });

  return {
    events: events.length,
    people: Object.keys(people).length,
    orgs: Object.keys(orgs).length,
  };
}
