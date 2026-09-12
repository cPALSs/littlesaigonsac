/** HTML builders for /entertainment on littlesaigonsac.town */

import { existsSync } from "node:fs";
import { cardVenueLine, venueLine } from "./venue-display.mjs";

export { cardVenueLine, venueLine } from "./venue-display.mjs";

const APOSTROPHE = "\u2019";
const LDQUO = "\u201C";
const RDQUO = "\u201D";

const WEEKDAY_PREFIX =
  /^(?:Sun(?:day)?|Mon(?:day)?|Tue(?:s(?:day)?)?|Wed(?:nesday)?|Thu(?:r(?:s(?:day)?)?)?|Fri(?:day)?|Sat(?:urday)?)\.?,?\s+/i;

/** Visible dates never include weekday (`Sat` / `Sunday`). Hours stay on detail. */
export function stripWeekdayPrefix(s) {
  return String(s ?? "").replace(WEEKDAY_PREFIX, "").trim();
}

/**
 * Poster-card caption date: calendar day only — no weekday, no hours.
 * Event detail keeps hours / doors / show via `detailDisplayDate`.
 *
 * Strips weekday prefixes (`Sat`, `Sunday,`), `·` / `|` time tails
 * (`6:30 PM–12:00 AM`, `doors 4:00 PM`) and same-segment clock leftovers
 * (`6 PM`, `5–10 PM`). Leaves date ranges (`Aug 21–22, 2026`) intact.
 */
export function cardDisplayDate(raw) {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/);
  if (iso) return iso[1];
  s = stripWeekdayPrefix(s);
  s = s.split(/\s*[·|]\s*/)[0].trim();
  s = s.replace(/\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?\b.*$/i, "");
  s = s.replace(/\s+\d{1,2}\s*[–—-]\s*\d{1,2}\s*[ap]\.?m\.?\b.*$/i, "");
  s = s.replace(/\s+(?:doors|show)\b.*$/i, "");
  return s.trim();
}

/** Event detail / meta: no weekday; keep hours, doors, show. */
export function detailDisplayDate(raw) {
  return stripWeekdayPrefix(raw);
}

/**
 * Honorifics that belong on participation `role`, not the listing name.
 * Does **not** include `DJ` (stage names such as DJ XiXi).
 * `NS.` / `NS` = nhạc sĩ (not “nghệ sĩ”).
 */
const ENTERTAINMENT_TITLE_PREFIX = new RegExp(
  [
    "^",
    "(?:",
    [
      "nsưt",
      "nsut",
      "nghệ sĩ",
      "nghe si",
      "nhạc sĩ",
      "nhac si",
      "ca sĩ",
      "ca sỹ",
      "ca sy",
      "mc",
      "ns\\.",
      "ns",
    ].join("|"),
    ")",
    "(?=[\\s./]|$)",
  ].join(""),
  "iu",
);

/**
 * Strip Ca sĩ / MC / NS. / Nghệ sĩ / NSƯT (and compounds) from a listing name.
 * Repeat so `Ca sĩ / MC Kevin Lê` and `NS. Đặng Lạn` become the given name.
 *
 * @param {string | null | undefined} name
 */
export function stripEntertainmentTitlePrefixes(name) {
  let s = String(name ?? "").trim();
  if (!s) return s;
  for (let i = 0; i < 8; i++) {
    const next = s
      .replace(ENTERTAINMENT_TITLE_PREFIX, "")
      .replace(/^[./\s]+/u, "")
      .trim();
    if (next === s) break;
    s = next;
  }
  return s;
}

/**
 * Display-only typographic punctuation for Entertainment names.
 * Does not rewrite graph or entertainment.json — apply before HTML escape.
 *
 * `'` → `’` (U+2019). Paired wrapping `"` → `“` `”` when they look like
 * quotation marks around a nickname, not inches (`5"`).
 */
export function smartPunctuateName(s) {
  const raw = String(s ?? "");
  if (!raw) return raw;
  let out = raw.replaceAll("'", APOSTROPHE);
  out = out.replace(
    /(^|[^0-9])"([^"\n]+)"(?!\d)/g,
    (_, pre, inner) => `${pre}${LDQUO}${inner}${RDQUO}`,
  );
  return out;
}

export const SPECIALTY_LABEL = {
  "nhac-vang": "Bolero · nhạc vàng",
  "que-huong": "Nhạc quê hương",
  "nhac-tre": "Nhạc trẻ",
  remix: "Remix · dạ vũ",
  "co-nhac": "Cải lương · cổ nhạc",
  trinh: "Nhạc Trịnh",
  "dj-edm": "DJ · EDM",
  "american-indie": "American · indie",
  emcee: "Emcee",
};

/** Known genre slugs in filter / chip order. No `local` / hometown. */
export const PERFORMER_GENRE_SLUGS = [
  "nhac-vang",
  "que-huong",
  "nhac-tre",
  "remix",
  "co-nhac",
  "trinh",
  "dj-edm",
  "american-indie",
  "emcee",
];

/** Performers filter only — empty `specialties`. Never store on person_specialty. */
export const PERFORMER_GENRE_UNKNOWN = "unknown";

export function specialtySlugs(specialties) {
  if (!Array.isArray(specialties)) return [];
  return specialties
    .map((item) => (typeof item === "string" ? item : item?.slug))
    .filter((slug) => slug && SPECIALTY_LABEL[slug]);
}

export function performerGenreHref(slug) {
  return `/entertainment/performers/?genre=${encodeURIComponent(slug)}`;
}

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
  "people/hoang-liem",
  "people/hung-bui-mc",
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
 * name matches Band / Ban Nhạc; lineup-only orgs (dance troupes).
 *
 * Organizations: remaining orgs (producers, presenters, hosts, venues,
 * companies), plus the explicit allowlist below. Lucky Wav produces named
 * nights — it is a production org (with JOY, Ruby Blvd, AMV), not a
 * lineup act. Lãng Du Entertainment is the same kind of shop (Bao 2026-09-11:
 * Ban Nhạc Lãng Du is the company billing, not a separate house-band listing).
 * Mrs. Vietnam NorCal Sacramento is a pageant org (court
 * appearance), not an individual performer. Do not classify these as a
 * performer via name-regex or lineup-only heuristics.
 *
 * Not in this export — do not re-add: CK Band, The Friend (retired SJ
 * night), San Jose Dạ Vũ.
 */
const DIRECTORY_ORG_IDS = new Set([
  "lucky-wav",
  "lang-du-entertainment",
  "mrs-vietnam-norcal-sacramento",
]);

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
  if (DIRECTORY_ORG_IDS.has(org.id)) return false;
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
    name:
      type === "person"
        ? stripEntertainmentTitlePrefixes(entity.name)
        : entity.name,
    type,
    href:
      type === "person"
        ? `/entertainment/people/${entity.id}/`
        : `/entertainment/orgs/${entity.id}/`,
    photo: entity.photo || null,
    eventCount: eventCountFor(events, type, entity.id),
    specialties: specialtySlugs(entity.specialties),
  };
}

/** People + bands/acts and Organizations: default A–Z (client can re-sort both). */
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
  organizations.sort(compareViName);
  return { performers, organizations };
}

/**
 * Gallery-card object-position only (2:3 object-fit cover). Event-detail
 * posters stay the full image. Landscape venue ads need an explicit focus
 * so `top center` does not land on title text / the panel seam.
 */
const POSTER_CARD_OBJECT_POSITION = {
  // Whisper of Autumn TVC ad: 2:1, singers in the left half. 12.5% centers
  // a 2:3 slice on that crowd (not the Thunder Valley lockup).
  "thunder-valley-whisper-of-autumn-2026": "12.5% 50%",
};

export function entertainmentHelpers({ esc, imgEl, crumbs }) {
  const displayName = (s) => smartPunctuateName(s);
  const listingName = (s) => smartPunctuateName(stripEntertainmentTitlePrefixes(s));
  const escName = (s) => esc(displayName(s));
  const escListingName = (s) => esc(listingName(s));

  const entityName = (item, people, orgs) => {
    const href = entityHref(item, people, orgs);
    const name = item.type === "org" ? escName(item.name) : escListingName(item.name);
    return href ? `<a href="${esc(href)}">${name}</a>` : `<span>${name}</span>`;
  };

  const posterCard = (ev) => {
    const place = cardVenueLine(ev);
    const focus = POSTER_CARD_OBJECT_POSITION[ev.id];
    const focusAttr = focus ? ` style="--poster-focus: ${esc(focus)}"` : "";
    return `<a class="card poster" href="/entertainment/${esc(ev.id)}/">
    <div class="card-photo"${focusAttr}>${imgEl(ev.poster, displayName(ev.label))}</div>
    <div class="card-body">
      <h2>${escName(ev.label)}</h2>
      <p class="gloss">${esc(cardDisplayDate(ev.display_date || ev.start_date || ""))}</p>
      ${place ? `<p class="gloss">${escName(place)}</p>` : ""}
    </div>
  </a>`;
  };

  const posterGrid = (list) =>
    `<div class="poster-grid">${list.map(posterCard).join("")}</div>`;

  const eventPoster = (ev) => {
    const posterImg = imgEl(ev.poster, displayName(ev.label));
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

  const SPOTIFY_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.8"/>
      <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M7.4 10.1c2.6-1.1 6.6-1.2 9.3.2"/>
      <path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M7.6 13c2.2-.9 5.5-1 7.8.15"/>
      <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M7.9 15.7c1.7-.7 4.2-.75 6 .1"/>
    </svg>`;

  const TIKTOK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
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
        if (kind === "spotify") {
          return `<li><a class="social-icon" href="${esc(l.url)}" rel="noopener noreferrer" target="_blank" aria-label="Spotify">${SPOTIFY_SVG}</a></li>`;
        }
        if (kind === "tiktok") {
          return `<li><a class="social-icon" href="${esc(l.url)}" rel="noopener noreferrer" target="_blank" aria-label="TikTok">${TIKTOK_SVG}</a></li>`;
        }
        const label = kind === "website" ? websiteChipLabel(l.url) : l.label;
        return `<li><a href="${esc(l.url)}" rel="noopener noreferrer" target="_blank">${esc(label)}</a></li>`;
      })
      .join("")}
  </ul>`;
  };

  const specialtyChips = (specialties) => {
    const slugs = specialtySlugs(specialties).slice(0, 3);
    if (!slugs.length) return "";
    const chips = slugs.map((slug) => {
      const item = Array.isArray(specialties)
        ? specialties.find((row) => (typeof row === "string" ? row : row?.slug) === slug)
        : null;
      const label =
        (item && typeof item === "object" && item.label) || SPECIALTY_LABEL[slug] || slug;
      return `<li><a class="genre-chip" href="${esc(performerGenreHref(slug))}">${esc(label)}</a></li>`;
    });
    return `<ul class="genre-chips">${chips.join("")}</ul>`;
  };

  const entityHeading = (name, links, photo, kind, specialties) => {
    const shown = kind === "org" ? displayName(name) : listingName(name);
    const photoImg = imgEl(photo, shown);
    const copy = `<h1>${esc(shown)}</h1>
        ${specialtyChips(specialties)}
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
    const photoImg = imgEl(row.photo, listingName(row.name));
    return `<span class="${photoClass}">${photoImg}</span>`;
  };

  const performerList = (rows, { sortable = false, variant } = {}) => {
    if (!rows.length) return "";
    const classes = ["performer-list"];
    if (variant === "orgs") classes.push("performer-list--orgs");
    const attrs = sortable ? ' data-performer-grid' : "";
    return `<ul class="${classes.join(" ")}"${attrs}>
      ${rows
        .map((row) => {
          const genres = (row.specialties || []).join(" ");
          return `<li data-name="${escListingName(row.name)}" data-events="${esc(String(row.eventCount ?? 0))}" data-genres="${esc(genres)}"><a href="${esc(row.href)}">${performerAvatar(row)}<span class="performer-name">${escListingName(row.name)}</span></a></li>`;
        })
        .join("")}
    </ul>`;
  };

  const performerGenreOptions = () =>
    [
      `<option value="">All</option>`,
      ...PERFORMER_GENRE_SLUGS.map(
        (slug) => `<option value="${esc(slug)}">${esc(SPECIALTY_LABEL[slug])}</option>`,
      ),
      `<option value="${esc(PERFORMER_GENRE_UNKNOWN)}">Unknown</option>`,
    ].join("");

  const performerSortBar = () => `<div class="performer-toolbar">
      <label class="performer-genre" for="performer-genre">Genre
        <select id="performer-genre" data-performer-genre>
          ${performerGenreOptions()}
        </select>
      </label>
      <label class="performer-sort" for="performer-sort">Sort
        <select id="performer-sort" data-performer-sort>
          <option value="alpha">Alphabetical</option>
          <option value="appearances">Most appearances</option>
        </select>
      </label>
    </div>`;

  const performerDirectory = (performers, organizations) => {
    const peopleBlock = performers.length
      ? `<section data-performer-section="people">
    ${performerList(performers, { sortable: true })}
    </section>`
      : "";
    const orgBlock = organizations.length
      ? `<section data-performer-section="orgs">
    <h2 class="section-label band-label">Organizations</h2>
    ${performerList(organizations, { sortable: true, variant: "orgs" })}
    </section>`
      : "";
    return `${performers.length || organizations.length ? performerSortBar() : ""}
    ${peopleBlock}
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
    displayName,
    listingName,
    escName,
    escListingName,
    crumbsEnt: (trail) =>
      crumbs(
        trail
          .filter((item) => !item.current)
          .map((item) =>
            item.label != null ? { ...item, label: displayName(item.label) } : item,
          ),
      ),
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
      ${h.crumbsEnt([])}
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
      ${h.crumbsEnt([{ href: "/entertainment/", label: "Entertainment" }])}
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
        title: `${h.displayName(ev.label)} · Entertainment`,
        path: `/entertainment/${ev.id}/`,
        description: [
          detailDisplayDate(ev.display_date || ev.start_date),
          h.displayName(cardVenueLine(ev) || place),
        ].filter(Boolean).join(" · "),
        image: ev.poster,
        ogType: "article",
        current: "entertainment",
        body: `<main class="wrap event">
      <header class="hero">
        ${h.crumbsEnt([{ href: "/entertainment/", label: "Entertainment" }])}
        <h1>${h.escName(ev.label)}</h1>
      </header>
      <div class="event-layout">
        ${h.eventPoster(ev)}
        <div class="event-copy">
          <p class="event-meta">${esc(detailDisplayDate(ev.display_date || ev.start_date || ""))}</p>
          ${place ? `<p class="event-meta">${h.escName(place)}</p>` : ""}
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
        title: `${h.listingName(person.name)} · Entertainment`,
        path: `/entertainment/people/${person.id}/`,
        description: `${h.listingName(person.name)} on Little Saigon Sactown Entertainment.`,
        image: person.photo,
        current: "entertainment",
        body: `<main class="wrap">
      <header class="hero">
        ${h.crumbsEnt([{ href: "/entertainment/performers/", label: "Entertainment" }])}
        ${h.entityHeading(person.name, person.links, person.photo, "person", person.specialties)}
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
        title: `${h.displayName(org.name)} · Entertainment`,
        path: `/entertainment/orgs/${org.id}/`,
        description: `${h.displayName(org.name)} on Little Saigon Sactown Entertainment.`,
        image: org.photo,
        current: "entertainment",
        body: `<main class="wrap">
      <header class="hero">
        ${h.crumbsEnt([{ href: "/entertainment/performers/", label: "Entertainment" }])}
        ${h.entityHeading(org.name, org.links, org.photo, "org", org.specialties)}
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
