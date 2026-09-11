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
const UNLISTED_EVENTS_FB_ALT_URL = "https://www.facebook.com/groups/290197905206406";
const UNLISTED_EVENTS_FB_ALT_NAME = "Người Việt Sacramento and Elk Grove";

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

const PRODUCTION_ROLES = new Set(["host", "producer", "co_producer", "presenter"]);
const BAND_NAME_RE = /\bband\b|ban\s+nhạc/i;

/**
 * Graph stores bands as `org` rows; entertainment.json has no `kind`.
 *
 * Performers (people + acts): every person; orgs with lineup role `band`;
 * name matches Band / Ban Nhạc; lineup-only orgs (dance troupes); plus
 * documented acts the graph credits as producer of their own named set.
 *
 * Organizations: remaining orgs (producers, presenters, hosts, venues,
 * companies). Not in this export — do not re-add: CK Band, The Friend
 * (retired SJ night), San Jose Dạ Vũ.
 */
const ACT_ORG_IDS = new Set(["lucky-wav"]);

export function compareViName(a, b) {
  return String(a.name || "").localeCompare(String(b.name || ""), "vi", {
    sensitivity: "base",
  });
}

export function eventCountFor(events = [], type, id) {
  return showsFor(events, type, id).length;
}

export function isBandOrAct(org, events = []) {
  if (!org?.id) return false;
  if (ACT_ORG_IDS.has(org.id)) return true;
  if (BAND_NAME_RE.test(org.name || "")) return true;
  let inLineup = false;
  let inLineupAsBand = false;
  let inProduction = false;
  for (const ev of events) {
    for (const p of ev.lineup || []) {
      if (p.type === "org" && p.id === org.id) {
        inLineup = true;
        if (p.role === "band") inLineupAsBand = true;
      }
    }
    for (const p of ev.producers || []) {
      if (p.type === "org" && p.id === org.id && PRODUCTION_ROLES.has(p.role)) {
        inProduction = true;
      }
    }
  }
  if (inLineupAsBand) return true;
  if (inLineup && !inProduction) return true;
  return false;
}

function directoryRow(entity, type, events) {
  return {
    id: entity.id,
    name: entity.name,
    type,
    href:
      type === "person"
        ? `/entertainment/people/${entity.id}/`
        : `/entertainment/orgs/${entity.id}/`,
    photo: entity.photo || null,
    eventCount: eventCountFor(events, type, entity.id),
  };
}

/** People + bands/acts (A–Z). Organizations separately, event-count desc. */
export function directorySections(people = {}, orgs = {}, events = []) {
  const named = (row) => String(row.name || "").trim();
  const performers = [
    ...Object.values(people).map((p) => directoryRow(p, "person", events)),
    ...Object.values(orgs)
      .filter((o) => isBandOrAct(o, events))
      .map((o) => directoryRow(o, "org", events)),
  ].filter(named);
  const organizations = Object.values(orgs)
    .filter((o) => !isBandOrAct(o, events))
    .map((o) => directoryRow(o, "org", events))
    .filter(named);
  performers.sort(compareViName);
  organizations.sort((a, b) => b.eventCount - a.eventCount || compareViName(a, b));
  return { performers, organizations };
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

  const labeledPosterGrid = (title, cardsHtml) => {
    if (!cardsHtml.length) return "";
    return `<h2 class="section-label band-label">${esc(title)}</h2>
      <div class="poster-grid">${cardsHtml.join("")}</div>`;
  };

  /**
   * Invite lives in the gallery poster grid only.
   * Upcoming with real shows: append the card there (section stays).
   * Zero upcoming: collapse Upcoming and put the card first in Past.
   */
  const galleryShowSections = (upcoming, past) => {
    const invite = unlistedEventsInviteCard();
    const upcomingCards = upcoming.map(posterCard);
    const pastCards = past.map(posterCard);
    if (upcomingCards.length) {
      return `${labeledPosterGrid("Upcoming", [...upcomingCards, invite])}
    ${labeledPosterGrid("Past", pastCards)}`;
    }
    return labeledPosterGrid("Past", [invite, ...pastCards]);
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

  const performerAvatar = (row) => {
    const photoClass =
      row.type === "org"
        ? "entity-photo entity-photo--org performer-avatar"
        : "entity-photo entity-photo--person performer-avatar";
    const photoImg = imgEl(row.photo, row.name);
    return `<span class="${photoClass}">${photoImg}</span>`;
  };

  const performerList = (rows, { sortable = false } = {}) => {
    if (!rows.length) return "";
    const attrs = sortable ? ' data-performer-grid' : "";
    return `<ul class="performer-list"${attrs}>
      ${rows
        .map(
          (row) =>
            `<li data-name="${esc(row.name)}" data-events="${esc(String(row.eventCount ?? 0))}"><a href="${esc(row.href)}">${performerAvatar(row)}<span class="performer-name">${esc(row.name)}</span></a></li>`,
        )
        .join("")}
    </ul>`;
  };

  const performerSortBar = () => `<div class="performer-toolbar">
      <label class="performer-sort" for="performer-sort">Sort
        <select id="performer-sort" data-performer-sort>
          <option value="alpha" selected>Alphabetical</option>
          <option value="popular">Most popular</option>
        </select>
      </label>
    </div>`;

  const performerDirectory = (performers, organizations) => {
    const peopleBlock = performers.length
      ? `${performerSortBar()}
    ${performerList(performers, { sortable: true })}`
      : "";
    const orgBlock = organizations.length
      ? `<h2 class="section-label band-label">Organizations</h2>
    ${performerList(organizations)}`
      : "";
    return `${peopleBlock}
    ${orgBlock}`;
  };

  const unlistedEventsInviteCard = () =>
    `<article class="card poster invite-card">
    <p class="invite-card-prompt">Know a show we missed?</p>
    <p class="invite-card-copy">Post it in<br>
    <a href="${esc(UNLISTED_EVENTS_FB_URL)}" rel="noopener noreferrer" target="_blank">${esc(UNLISTED_EVENTS_FB_NAME)}</a><br>
    or<br>
    <a href="${esc(UNLISTED_EVENTS_FB_ALT_URL)}" rel="noopener noreferrer" target="_blank">${esc(UNLISTED_EVENTS_FB_ALT_NAME)}</a>.</p>
  </article>`;

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
    performerDirectory,
    unlistedEventsInviteCard,
    galleryShowSections,
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
  const { posterCard } = entertainmentHelpers({ esc, imgEl, crumbs });
  return `<section class="wrap feature" id="entertainment">
      <div class="section-head">
        <h2>Entertainment</h2>
        <a href="/entertainment/">All shows</a>
      </div>
      <p class="lede">${ENTERTAINMENT_TAGLINE}</p>
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
      ${h.entertainmentTabs("events")}
    </header>
    ${h.galleryShowSections(upcoming, past)}
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

  const { performers, organizations } = directorySections(people, orgs, events);
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
      ${h.entertainmentTabs("performers")}
    </header>
    ${h.performerDirectory(performers, organizations)}
  </main>
  <script src="/js/performer-sort.js" defer></script>`,
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
