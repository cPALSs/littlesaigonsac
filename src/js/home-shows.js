/** Homepage Entertainment strip: shows still on (through end date), then recent past. */

export const HOME_SHOW_LIMIT = 4;

export function todayPtIso(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function startOf(ev) {
  return ev.start_date || ev.start || "";
}

function endOf(ev) {
  return ev.end_date || ev.end || startOf(ev);
}

function labelOf(ev) {
  return String(ev.label || "");
}

/** A show stays on the strip through its last calendar day (Pacific). */
export function showStillOn(ev, today) {
  const end = endOf(ev);
  return Boolean(end) && end >= today;
}

function byStartThenLabel(a, b) {
  return startOf(a).localeCompare(startOf(b)) || labelOf(a).localeCompare(labelOf(b), "vi");
}

function byStartDescThenLabel(a, b) {
  return startOf(b).localeCompare(startOf(a)) || labelOf(a).localeCompare(labelOf(b), "vi");
}

/** Upcoming = still on through end date. Past = newest start first. */
export function partitionShowsByEnd(events, today) {
  const upcoming = [];
  const past = [];
  for (const ev of events) {
    (showStillOn(ev, today) ? upcoming : past).push(ev);
  }
  upcoming.sort(byStartThenLabel);
  past.sort(byStartDescThenLabel);
  return { upcoming, past };
}

export function pickHomeShows(events, today, limit = HOME_SHOW_LIMIT) {
  const { upcoming, past } = partitionShowsByEnd(events, today);
  return [...upcoming, ...past].slice(0, limit);
}

/**
 * Embed every show still on as of the build date, plus recent past fillers,
 * so the browser can roll the strip forward without another homepage edit.
 */
export function homeShowCandidates(events, asOf, limit = HOME_SHOW_LIMIT) {
  const current = [];
  const past = [];
  for (const ev of events) {
    (showStillOn(ev, asOf) ? current : past).push(ev);
  }
  current.sort(byStartThenLabel);
  past.sort(byStartDescThenLabel);
  return [...current, ...past.slice(0, limit)];
}
