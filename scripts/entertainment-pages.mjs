/** HTML builders for /entertainment on littlesaigonsac.town */

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
  chinese: "Chinese",
  emcee: "Emcee",
  influencer: "Influencer · talk show",
  "martial-arts": "Martial arts",
  producer: "Producer",
  "dance-group": "Dance group",
};

/** Known genre slugs in radio order: public label, `vi` locale. No `local`. */
export function compareSpecialtyLabels(a, b) {
  return String(a).localeCompare(String(b), "vi", { sensitivity: "base" });
}

export const PERFORMER_GENRE_SLUGS = Object.keys(SPECIALTY_LABEL).sort((a, b) =>
  compareSpecialtyLabels(SPECIALTY_LABEL[a], SPECIALTY_LABEL[b]),
);

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
  host_producer: "Host / Producer",
  co_producer: "Co-producer",
  presenter: "Presenter",
  vocalist: "Vocalist",
  mc: "MC",
  dj: "DJ",
  band: "Band",
  dance: "Dance troupe",
  martial_arts: "Martial arts",
  other: "Featured",
};

/**
 * Same billed entity as both host and producer → one credit
 * (`Host / Producer`). Different host vs producer orgs stay two rows.
 * Does not collapse other role pairs (vocalist + DJ stays stacked).
 *
 * @param {Array<{ type?: string, id?: string, role?: string }> | null | undefined} items
 */
export function collapseHostProducerCredits(items) {
  if (!Array.isArray(items) || items.length < 2) return items || [];
  const used = new Set();
  const out = [];
  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    const item = items[i];
    const counterpart =
      item.role === "host" ? "producer" : item.role === "producer" ? "host" : null;
    if (!counterpart || !item.id) {
      out.push(item);
      continue;
    }
    const matchIdx = items.findIndex(
      (other, j) =>
        j !== i &&
        !used.has(j) &&
        other.role === counterpart &&
        other.type === item.type &&
        other.id === item.id,
    );
    if (matchIdx === -1) {
      out.push(item);
      continue;
    }
    used.add(i);
    used.add(matchIdx);
    out.push({ ...item, role: "host_producer" });
  }
  return out;
}

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

const DANCE_TROUPE_NAME_RE = /vũ\s*đoàn|vu\s*doan|nhóm\s*múa|nhom\s*mua/i;
const MARTIAL_ARTS_NAME_RE = /xiếc\s*kungfu|xiec\s*kungfu/i;

export function isDanceTroupe(org) {
  if (!org) return false;
  if (org.act === "dance-troupe") return true;
  return DANCE_TROUPE_NAME_RE.test(org.name || "");
}

export function isMartialArtsAct(org) {
  if (!org) return false;
  if (org.act === "martial-arts") return true;
  return MARTIAL_ARTS_NAME_RE.test(org.name || "");
}

function hasSpecialty(entity, slug) {
  return specialtySlugs(entity?.specialties).includes(slug);
}

function creditRoleLabel(item, orgs, people) {
  const org = item?.type === "org" && item.id ? orgs?.[item.id] : null;
  const person = item?.type === "person" && item.id ? people?.[item.id] : null;
  if (
    hasSpecialty(person, "martial-arts") ||
    hasSpecialty(org, "martial-arts") ||
    isMartialArtsAct(org || item)
  ) {
    return ROLE_LABEL.martial_arts;
  }
  if (item.role === "band" && isDanceTroupe(org || item)) return ROLE_LABEL.dance;
  return ROLE_LABEL[item.role] || "";
}

const PRODUCTION_ROLES = new Set(["host", "producer", "co_producer", "presenter"]);
const BAND_NAME_RE = /\bband\b|ban\s+nhạc/i;

/**
 * Graph stores bands as `org` rows; entertainment.json has no `kind`.
 *
 * Performers (people + acts): every person; orgs with lineup role `band`
 * (dance troupes use the same billed-org machinery — public label
 * Dance troupe / Vũ đoàn, not Band); name matches Band / Ban Nhạc;
 * lineup-only orgs.
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

/** ISO `start_date` of the most recent billed public show (lineup or producer). */
export function lastAppearanceFor(events = [], type, id) {
  let latest = "";
  for (const ev of showsFor(events, type, id)) {
    const start = String(ev.start_date || "").slice(0, 10);
    if (start && start > latest) latest = start;
  }
  return latest;
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
    lastAppearance: lastAppearanceFor(events, type, entity.id),
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

  const posterGeoAttrs = (ev) => {
    const attrs = [];
    if (ev.place_id) attrs.push(`data-place-id="${esc(ev.place_id)}"`);
    if (ev.place_name) attrs.push(`data-place-name="${esc(ev.place_name)}"`);
    if (ev.google_place_id) attrs.push(`data-google-place-id="${esc(ev.google_place_id)}"`);
    if (ev.google_place_id) attrs.push(`data-google-place-id="${esc(ev.google_place_id)}"`);
    if (ev.place_address) attrs.push(`data-place-address="${esc(ev.place_address)}"`);
    const latRaw = ev.lat;
    const lngRaw = ev.lng;
    if (latRaw == null || lngRaw == null) return attrs.length ? ` ${attrs.join(" ")}` : "";
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
      return attrs.length ? ` ${attrs.join(" ")}` : "";
    }
    attrs.push(`data-lat="${esc(String(lat))}" data-lng="${esc(String(lng))}"`);
    return attrs.length ? ` ${attrs.join(" ")}` : "";
  };

  const posterCard = (ev, opts = {}) => {
    const place = cardVenueLine(ev);
    const focus = POSTER_CARD_OBJECT_POSITION[ev.id];
    const focusAttr = focus ? ` style="--poster-focus: ${esc(focus)}"` : "";
    const whenAttr = opts.when ? ` data-when="${esc(opts.when)}"` : "";
    return `<a class="card poster" href="/entertainment/${esc(ev.id)}/"${posterGeoAttrs(ev)}${whenAttr}>
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
    const rows = collapseHostProducerCredits(items);
    if (!rows.length) return "";
    return `<ul class="credit-list">
    ${rows
      .map((item) => {
        const role = creditRoleLabel(item, orgs, people);
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

  const SOUNDCLOUD_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M1.175 12.225c-.051 0-.094.046-.1.1l-.233 2.154.233 2.105c.007.058.05.098.1.098.046 0 .09-.04.094-.098l.25-2.105-.25-2.154c-.008-.058-.05-.1-.098-.1m.82.48c-.056 0-.1.04-.105.095l-.22 1.675.22 1.627c.005.06.05.095.105.095.052 0 .1-.035.105-.095l.24-1.627-.24-1.675c-.007-.058-.053-.095-.105-.095m1.64-1.06c-.064 0-.116.05-.12.115l-.205 2.62.205 2.427c.005.065.056.117.12.117.06 0 .115-.052.12-.117l.22-2.428-.22-2.62c-.005-.063-.06-.115-.12-.115m.82-.13c-.07 0-.13.058-.136.13l-.197 2.75.197 2.556c.007.075.066.13.136.13.07 0 .13-.055.136-.13l.214-2.557-.214-2.75c-.005-.07-.066-.13-.136-.13m.85.256c-.078 0-.14.063-.145.14l-.185 2.497.185 2.57c.005.077.067.14.145.14.074 0 .136-.063.14-.14l.2-2.57-.2-2.496c-.004-.078-.066-.14-.14-.14m.847-.713c-.082 0-.15.068-.154.15l-.185 3.06.185 2.61c.005.08.072.15.154.15.08 0 .148-.07.153-.15l.2-2.61-.2-3.06c-.005-.082-.073-.15-.153-.15m.848-.114c-.09 0-.163.074-.168.163l-.17 3.174.17 2.623c.005.09.078.164.168.164s.163-.075.168-.164l.186-2.623-.186-3.174c-.005-.09-.078-.163-.168-.163m.974.13c-.1 0-.18.08-.18.18l-.168 3.045.168 2.636c0 .1.081.18.18.18.098 0 .18-.08.18-.18l.18-2.636-.18-3.044c0-.1-.082-.18-.18-.18m.832-.824c-.105 0-.19.085-.194.19l-.16 3.678.16 2.65c.004.105.089.19.194.19s.19-.085.194-.19l.174-2.65-.174-3.679c-.004-.104-.089-.19-.194-.19m.833.176c-.11 0-.2.09-.2.2l-.155 3.5.155 2.66c0 .11.09.2.2.2s.2-.09.2-.2l.168-2.66-.168-3.5c0-.11-.09-.2-.2-.2m1.013.13c-.12 0-.216.098-.22.22l-.14 3.37.14 2.67c.004.12.1.218.22.218.118 0 .215-.098.22-.22l.153-2.67-.154-3.37c-.005-.12-.102-.22-.22-.22m.835-.556c-.128 0-.23.102-.234.23l-.136 3.926.136 2.677c.005.128.106.23.234.23.126 0 .23-.102.234-.23l.145-2.677-.145-3.926c-.004-.128-.108-.23-.234-.23m.835-.13c-.136 0-.246.11-.25.247l-.125 4.058.125 2.68c.004.136.114.248.25.248s.246-.112.25-.248l.137-2.68-.137-4.06c-.004-.136-.114-.246-.25-.246m1.027.156c-.148 0-.268.12-.27.27l-.11 3.9.11 2.698c.002.148.122.268.27.268.148 0 .268-.12.27-.27l.12-2.697-.12-3.9c-.002-.15-.122-.27-.27-.27m.847-.784c-.158 0-.286.128-.29.286l-.11 4.4.11 2.71c.004.158.132.286.29.286.156 0 .285-.128.29-.286l.113-2.71-.115-4.4c-.004-.158-.132-.286-.29-.286m.848-.098c-.17 0-.31.14-.312.31l-.097 4.186.097 2.73c.002.17.142.31.312.31.17 0 .31-.14.312-.31l.105-2.73-.105-4.187c-.002-.17-.142-.31-.312-.31m1.04-.222c-.185 0-.335.15-.338.336l-.088 4.418.088 2.74c.003.186.153.337.338.337.185 0 .335-.15.338-.336l.094-2.74-.094-4.42c-.003-.185-.153-.335-.338-.335m.86 1.04c-.2 0-.362.162-.365.364l-.078 3.378.078 2.76c.003.2.165.362.365.362.2 0 .362-.162.365-.363l.084-2.76-.084-3.378c-.003-.202-.165-.364-.365-.364m.848.248c-.215 0-.39.175-.394.393l-.07 3.13.07 2.776c.004.218.179.394.394.394.215 0 .39-.176.394-.394l.074-2.776-.074-3.13c-.004-.218-.179-.393-.394-.393M22.4 11.32c-.248 0-.48.092-.658.24-.12-.68-.48-1.26-1.02-1.7-.54-.44-1.22-.68-1.94-.68-.28 0-.56.04-.82.12v8.78h8.44c1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5c-.04 0-.08 0-.12.002A3.96 3.96 0 0 0 22.4 11.32"/>
    </svg>`;

  /** Instagram → TikTok → Facebook → YouTube → Spotify → SoundCloud → website → linktr.ee */
  const SOCIAL_LINK_ORDER = [
    "instagram",
    "tiktok",
    "facebook",
    "youtube",
    "spotify",
    "soundcloud",
    "website",
    "linktree",
  ];

  const websiteChipLabel = (url) => {
    try {
      const host = new URL(url).hostname.replace(/^www\./i, "");
      return host || "Website";
    } catch {
      return "Website";
    }
  };

  const publicLinkKind = (l) => {
    const url = String(l.url || "").toLowerCase();
    if (/soundcloud\.com/.test(url)) return "soundcloud";
    if (/linktr\.ee/.test(url)) return "linktree";
    return l.kind || "";
  };

  const publicLinkRank = (kind) => {
    const i = SOCIAL_LINK_ORDER.indexOf(kind);
    return i === -1 ? SOCIAL_LINK_ORDER.indexOf("linktree") - 0.5 : i;
  };

  const socialList = (links) => {
    if (!links?.length) return "";
    const seen = new Set();
    const ordered = [...links]
      .filter((l) => {
        if (!l?.url || seen.has(l.url)) return false;
        seen.add(l.url);
        return true;
      })
      .sort((a, b) => {
        const rank = publicLinkRank(publicLinkKind(a)) - publicLinkRank(publicLinkKind(b));
        return rank !== 0 ? rank : String(a.url).localeCompare(String(b.url));
      });
    return `<ul class="social-links">
    ${ordered
      .map((l) => {
        const kind = publicLinkKind(l);
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
        if (kind === "soundcloud") {
          return `<li><a class="social-icon" href="${esc(l.url)}" rel="noopener noreferrer" target="_blank" aria-label="SoundCloud">${SOUNDCLOUD_SVG}</a></li>`;
        }
        if (kind === "linktree") {
          return `<li><a href="${esc(l.url)}" rel="noopener noreferrer" target="_blank">linktr.ee</a></li>`;
        }
        const label = kind === "website" ? websiteChipLabel(l.url) : l.label;
        return `<li><a href="${esc(l.url)}" rel="noopener noreferrer" target="_blank">${esc(label)}</a></li>`;
      })
      .join("")}
  </ul>`;
  };

  const specialtyChips = (specialties) => {
    const slugs = specialtySlugs(specialties).slice(0, 4);
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

  const lifespanText = (lifespan) =>
    lifespan ? `<span class="lifespan">${esc(lifespan)}</span>` : "";

  const entitySocialRow = (links, lifespan) => {
    const socials = socialList(links);
    const years = lifespanText(lifespan);
    if (!socials && !years) return "";
    return `<div class="entity-social-row">${socials}${years}</div>`;
  };

  const entityHeading = (name, links, photo, kind, specialties, lifespan) => {
    const shown = kind === "org" ? displayName(name) : listingName(name);
    const photoImg = imgEl(photo, shown);
    const years = kind === "person" ? lifespan : "";
    const copy = `<h1>${esc(shown)}</h1>
        ${specialtyChips(specialties)}
        ${entitySocialRow(links, years)}`;
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

  const labeledPosterGrid = (title, cardsHtml, when) => {
    if (!cardsHtml.length) return "";
    const whenAttr = when ? ` data-when="${esc(when)}"` : "";
    return `<section class="show-band" data-map-section${whenAttr}>
      <h2 class="section-label band-label">${esc(title)}</h2>
      <div class="poster-grid">${cardsHtml.join("")}</div>
    </section>`;
  };

  /**
   * Invite lives in the gallery poster grid only.
   * Upcoming with real shows: append the card there (section stays).
   * Zero upcoming: collapse Upcoming and put the card first in Past.
   */
  const galleryShowSections = (upcoming, past) => {
    const invite = unlistedEventsInviteCard();
    const upcomingCards = upcoming.map((ev) => posterCard(ev, { when: "upcoming" }));
    const pastCards = past.map((ev) => posterCard(ev, { when: "past" }));
    if (upcomingCards.length) {
      return `${labeledPosterGrid("Upcoming", [...upcomingCards, invite], "upcoming")}
    ${labeledPosterGrid("Past", pastCards, "past")}`;
    }
    return labeledPosterGrid("Past", [invite, ...pastCards], "past");
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

  const bandMemberList = (members = []) => {
    if (!members.length) return "";
    return `<ul class="performer-list band-members">
      ${members
        .map((row) => {
          const photoClass =
            "entity-photo entity-photo--person performer-avatar";
          const photoImg = imgEl(row.photo, listingName(row.name));
          const links = socialList(row.links);
          const years = lifespanText(row.lifespan);
          return `<li><div class="band-member">${
            photoImg ? `<span class="${photoClass}">${photoImg}</span>` : ""
          }<span class="band-member-copy"><span class="performer-name">${escListingName(row.name)}</span>${years}</span>${
            links || ""
          }</div></li>`;
        })
        .join("")}
    </ul>`;
  };

  const performerList = (rows, { sortable = false, variant } = {}) => {
    if (!rows.length) return "";
    const classes = ["performer-list"];
    if (variant === "orgs") classes.push("performer-list--orgs");
    const attrs = sortable ? ' data-performer-grid' : "";
    const list = `<ul class="${classes.join(" ")}"${attrs}>
      ${rows
        .map((row) => {
          const genres = (row.specialties || []).join(" ");
          return `<li data-name="${escListingName(row.name)}" data-events="${esc(String(row.eventCount ?? 0))}" data-last="${esc(row.lastAppearance || "")}" data-genres="${esc(genres)}"><a href="${esc(row.href)}">${performerAvatar(row)}<span class="performer-name">${escListingName(row.name)}</span></a></li>`;
        })
        .join("")}
    </ul>`;
    if (!sortable) return list;
    return `${list}
    <div class="performer-one-off" data-performer-one-off hidden>
    <h2 class="section-label band-label">One appearance</h2>
    <ul class="${classes.join(" ")}" data-performer-one-off-grid></ul>
    </div>
    <div class="performer-years" data-performer-years hidden></div>`;
  };

  const performerRadio = (name, value, label, checked = false) =>
    `<label class="performer-radio">
        <input type="radio" name="${esc(name)}" value="${esc(value)}"${checked ? " checked" : ""}>
        <span>${esc(label)}</span>
      </label>`;

  const performerGenreOptions = () =>
    [
      performerRadio("performer-genre", "", "All", true),
      ...PERFORMER_GENRE_SLUGS.map((slug) =>
        performerRadio("performer-genre", slug, SPECIALTY_LABEL[slug]),
      ),
      performerRadio("performer-genre", PERFORMER_GENRE_UNKNOWN, "Unknown"),
    ].join("");

  const performerSortBar = () => `<div class="performer-toolbar">
      <div class="performer-filter-cols">
        <a href="/entertainment/performers/" class="performer-reset" data-performer-reset>Reset</a>
        <div class="performer-filter-flow">
          <fieldset class="performer-sort" data-performer-sort>
            <legend>Sort</legend>
            <div class="performer-sort-options">
              ${performerRadio("performer-sort", "alpha", "Alphabetical", true)}
              ${performerRadio("performer-sort", "appearances", "Most appearances")}
              ${performerRadio("performer-sort", "last", "Last appearance")}
            </div>
          </fieldset>
          <fieldset class="performer-genre" data-performer-genre>
            <legend>Genre</legend>
            <div class="performer-genre-options">
              ${performerGenreOptions()}
            </div>
          </fieldset>
        </div>
      </div>
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
    return `${peopleBlock}
    ${orgBlock}`;
  };

  const MAP_FAB_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" stroke-width="1.8" d="M12 21s6.5-5.2 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 15.8 12 21 12 21z"/>
      <circle cx="12" cy="10.4" r="2.2" fill="currentColor"/>
    </svg>`;
  const FILTER_FAB_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M4 7h16M7 12h10M10 17h4"/>
    </svg>`;
  const DRAWER_TAB_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M6 9l6 6 6-6"/>
    </svg>`;

  const filterFab = (id, { label, icon }) =>
    `<button type="button" class="filter-fab" data-drawer-open="${esc(id)}" aria-expanded="false" aria-controls="${esc(id)}" aria-label="${esc(label)}">
    ${icon}
    <span class="filter-fab-badge" aria-hidden="true"></span>
  </button>`;

  const filterDrawer = (id, { tabLabel, body }) =>
    `<div class="filter-drawer-overlay" data-drawer-overlay hidden></div>
    <aside class="filter-drawer" id="${esc(id)}" role="dialog" aria-modal="true" aria-hidden="true" aria-label="${esc(tabLabel)}">
      <button type="button" class="filter-drawer-tab" data-drawer-close aria-label="${esc(tabLabel)}">
        ${DRAWER_TAB_SVG}
      </button>
      <div class="filter-drawer-body">${body}</div>
    </aside>`;

  const unlistedEventsInviteCard = () =>
    `<article class="card poster invite-card" data-map-keep>
    <p class="invite-card-prompt">Know a show we missed?</p>
    <p class="invite-card-copy">Post it in<br>
    <a href="${esc(UNLISTED_EVENTS_FB_URL)}" rel="noopener noreferrer" target="_blank">${esc(UNLISTED_EVENTS_FB_NAME)}</a><br>
    or<br>
    <a href="${esc(UNLISTED_EVENTS_FB_ALT_URL)}" rel="noopener noreferrer" target="_blank">${esc(UNLISTED_EVENTS_FB_ALT_NAME)}</a>.</p>
  </article>`;

  return {
    posterCard,
    posterGrid,
    eventPoster,
    creditList,
    socialList,
    entityHeading,
    bandMemberList,
    bandBlock,
    entertainmentTabs,
    performerList,
    performerDirectory,
    performerSortBar,
    filterFab,
    filterDrawer,
    MAP_FAB_SVG,
    FILTER_FAB_SVG,
    unlistedEventsInviteCard,
    galleryShowSections,
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
      <p class="section-foot"><a href="/entertainment/">All shows</a></p>
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

  const entertainmentPageHead = (active, trail = []) => `<header class="hero">
      ${h.crumbsEnt(trail)}
      <div class="page-head">
        <h1>Entertainment</h1>
        <p class="tagline">${galleryDescription}</p>
      </div>
      ${h.entertainmentTabs(active)}
    </header>`;

  const galleryBody = `<main class="wrap">
    ${entertainmentPageHead("events")}
    ${h.galleryShowSections(upcoming, past)}
  </main>
  ${h.filterFab("map-filter", { label: "Map filter", icon: h.MAP_FAB_SVG })}
  ${h.filterDrawer("map-filter", {
    tabLabel: "Close map",
    body: `<div class="ent-map" data-ent-map></div>
      <p class="ent-map-msg" data-ent-map-msg hidden></p>`,
  })}
  <script src="/js/maps-config.js" defer></script>
  <script src="/js/filter-drawer.js" defer></script>
  <script src="/js/entertainment-map.js" defer></script>`;
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
    ${entertainmentPageHead("performers", [{ href: "/entertainment/", label: "Entertainment" }])}
    ${h.performerDirectory(performers, organizations)}
  </main>
  ${h.filterFab("performer-filter", { label: "Filter performers", icon: h.FILTER_FAB_SVG })}
  ${h.filterDrawer("performer-filter", {
    tabLabel: "Close filters",
    body: h.performerSortBar(),
  })}
  <script src="/js/filter-drawer.js" defer></script>
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
        ${h.entityHeading(person.name, person.links, person.photo, "person", person.specialties, person.lifespan)}
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
      ${
        Array.isArray(org.members) && org.members.length
          ? `<h2 class="section-label band-label">Members</h2>${h.bandMemberList(org.members)}`
          : ""
      }
      ${u.length || p.length ? h.posterGrid([...u, ...p]) : ""}
    </main>`,
      }),
    );
  }

  return {
    events: events.length,
    people: Object.keys(people).length,
    orgs: Object.keys(orgs).length,
  };
}
