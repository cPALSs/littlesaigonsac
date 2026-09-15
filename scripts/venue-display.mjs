/** Display-only venue lines for entertainment cards and event pages. */

const STREET_SUFFIXES = [
  [/\bStreets?\b/gi, "St"],
  [/\bAvenues?\b/gi, "Ave"],
  [/\bRoads?\b/gi, "Rd"],
  [/\bBoulevards?\b/gi, "Blvd"],
  [/\bHighways?\b/gi, "Hwy"],
  [/\bDrives?\b/gi, "Dr"],
  [/\bLanes?\b/gi, "Ln"],
  [/\bCourts?\b/gi, "Ct"],
  [/\bPlaces?\b/gi, "Pl"],
];

const COMPASS = {
  north: "N.",
  south: "S.",
  east: "E.",
  west: "W.",
  n: "N.",
  s: "S.",
  e: "E.",
  w: "W.",
};

const HALL_PREFIX =
  /\b(hall|room|ballroom|pavilion|auditorium|arena|event center|the venue at)\b/i;

function looksLikeStreetLine(segment) {
  return /^\d/.test(segment);
}

function abbreviateStreetLine(line) {
  let s = line.replace(/\s+/g, " ").trim();
  s = s.replace(
    /^(\d+\S*)\s+(North|South|East|West|N\.|S\.|E\.|W\.)\s+(?=[A-Za-z])/i,
    (_, num, dir) => {
      const key = dir.replace(/\./g, "").toLowerCase();
      return `${num} ${COMPASS[key] || dir} `;
    },
  );
  for (const [re, abbr] of STREET_SUFFIXES) s = s.replace(re, abbr);
  s = s.replace(/\b(St|Ave|Rd|Blvd|Hwy|Dr|Ln|Pl|Ct)\./g, "$1");
  return s.replace(/\s+/g, " ").trim();
}

export function abbreviateAddress(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";
  return raw
    .split(",")
    .map((part) => {
      const segment = part.replace(/\s+/g, " ").trim();
      if (!segment) return "";
      return looksLikeStreetLine(segment)
        ? abbreviateStreetLine(segment)
        : segment;
    })
    .filter(Boolean)
    .join(", ");
}

function withCity(name, city) {
  const place = String(name || "").trim();
  const loc = String(city || "").trim();
  if (place && loc && !place.toLowerCase().includes(loc.toLowerCase())) {
    return `${place}, ${loc}`;
  }
  return place || loc || "";
}

function fallbackPlaceName(ev) {
  const venue = String(ev.venue || "").trim();
  const city = String(ev.city || "").trim();
  if (!venue) return city;
  const parts = venue
    .split(",")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (!parts.length) return city;
  if (looksLikeStreetLine(parts[0])) return city || abbreviateStreetLine(parts[0]);
  if (
    parts.length > 1 &&
    HALL_PREFIX.test(parts[0]) &&
    !looksLikeStreetLine(parts[1])
  ) {
    return parts[1];
  }
  return parts[0];
}

/** Full venue line for event detail (hall + abbreviated street + city). */
export function venueLine(ev) {
  const venue = abbreviateAddress(ev.venue || "");
  return withCity(venue, ev.city);
}

/** Main property / place name under posters. */
export function cardVenueLine(ev) {
  const place = String(ev.place_name || "").trim();
  if (place) return withCity(place, ev.city);
  const fallback = fallbackPlaceName(ev);
  return fallback ? withCity(fallback, ev.city) : "";
}

/** Street + city line for event detail only. Empty when there is no street. */
export function venueStreetLine(ev) {
  const fromPlace = abbreviateAddress(ev.place_address || "");
  if (fromPlace) return fromPlace;
  const venue = String(ev.venue || "").trim();
  if (!venue) return "";
  const parts = venue
    .split(",")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const street = parts.filter(looksLikeStreetLine).map(abbreviateStreetLine);
  if (!street.length) return "";
  return withCity(street.join(", "), ev.city);
}

function isUsableMapsUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "maps.app.goo.gl") return url;
    if (host === "goo.gl" && /^\/maps\b/i.test(u.pathname)) return url;
    const googleMaps =
      host === "maps.google.com" ||
      host === "google.com" ||
      host.endsWith(".google.com");
    if (!googleMaps || !/\/maps\b/i.test(u.pathname)) return "";
    const hasQuery = [...u.searchParams.keys()].some((k) =>
      ["q", "query", "api", "cid", "place_id", "query_place_id"].includes(k),
    );
    const hasPlacePath = /\/maps\/(place|search|dir)\b/i.test(u.pathname);
    if (!hasQuery && !hasPlacePath) return "";
    return url;
  } catch {
    return "";
  }
}

/** Google Maps URL for the venue street (stored place URL, else search). */
export function venueMapsUrl(ev) {
  const stored = isUsableMapsUrl(ev.google_maps_url || ev.google_maps);
  if (stored) return stored;
  const query = venueStreetLine(ev);
  if (!query) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
