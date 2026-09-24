import assert from "node:assert/strict";
import test from "node:test";
import {
  adjacentInList,
  pagerNavHtml,
  sortMealItems,
} from "../src/js/meal-sort.js";
import { chronologicalShowOrder, galleryShowOrder } from "./entertainment-pages.mjs";
import { homeShowCandidates, partitionShowsByEnd, pickHomeShows } from "../src/js/home-shows.js";

const ITEMS = [
  { slug: "pho", vi: "Phở", fit: ["breakfast", "lunch", "dinner"] },
  { slug: "chao", vi: "Cháo", fit: ["breakfast"] },
  { slug: "banh-mi", vi: "Bánh mì", fit: ["breakfast", "lunch"] },
  { slug: "thit-hai-san", vi: "Thịt / Hải sản", fit: ["lunch", "dinner"] },
  { slug: "ca-phe", vi: "Cà phê", fit: ["snack"] },
  { slug: "banh", vi: "Bánh", fit: ["snack"] },
  { slug: "bun", vi: "Bún", fit: ["lunch", "dinner"] },
  { slug: "banh-canh", vi: "Bánh canh", fit: ["lunch", "dinner"] },
  { slug: "cuon", vi: "Cuốn", fit: ["lunch", "dinner", "snack"] },
  { slug: "che", vi: "Chè", fit: ["snack"] },
];

const slugs = (items) => items.map((item) => item.slug);

/** 7:00 PM PDT, 15 Sep 2026 — dinner window. */
const DINNER = new Date("2026-09-16T02:00:00.000Z");
/** 9:00 AM PDT — breakfast. */
const BREAKFAST = new Date("2026-09-15T16:00:00.000Z");
/** 3:30 PM PDT — between lunch and dinner. */
const BETWEEN = new Date("2026-09-15T22:30:00.000Z");

test("dinner sort matches /viet-eats/ meal grid (dinner, then snack, then rest)", () => {
  assert.deepEqual(slugs(sortMealItems(ITEMS, DINNER)), [
    "pho",
    "thit-hai-san",
    "bun",
    "banh-canh",
    "cuon",
    "ca-phe",
    "banh",
    "che",
    "chao",
    "banh-mi",
  ]);
});

test("breakfast sort puts breakfast-fit first, then snack, then rest", () => {
  assert.deepEqual(slugs(sortMealItems(ITEMS, BREAKFAST)), [
    "pho",
    "chao",
    "banh-mi",
    "ca-phe",
    "banh",
    "cuon",
    "che",
    "thit-hai-san",
    "bun",
    "banh-canh",
  ]);
});

test("between-meals sort puts snack first", () => {
  assert.deepEqual(slugs(sortMealItems(ITEMS, BETWEEN)), [
    "ca-phe",
    "banh",
    "cuon",
    "che",
    "pho",
    "chao",
    "banh-mi",
    "thit-hai-san",
    "bun",
    "banh-canh",
  ]);
});

test("wrapped neighbors follow meal sort, not JSON order", () => {
  const sorted = sortMealItems(ITEMS, DINNER);
  const pho = adjacentInList(sorted, "pho", { wrap: true });
  assert.equal(pho.prev.slug, "banh-mi");
  assert.equal(pho.next.slug, "thit-hai-san");
  const last = adjacentInList(sorted, "banh-mi", { wrap: true });
  assert.equal(last.prev.slug, "chao");
  assert.equal(last.next.slug, "pho");
});

test("unwrapped neighbors omit the ends", () => {
  const shows = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const first = adjacentInList(shows, "a", { wrap: false, key: "id" });
  assert.equal(first.prev, null);
  assert.equal(first.next.id, "b");
  const last = adjacentInList(shows, "c", { wrap: false, key: "id" });
  assert.equal(last.prev.id, "b");
  assert.equal(last.next, null);
});

test("single item has no neighbors even with wrap", () => {
  assert.deepEqual(adjacentInList([{ slug: "only" }], "only", { wrap: true }), {
    prev: null,
    next: null,
  });
});

test("pager HTML keeps Next on the right when Previous is missing", () => {
  const html = pagerNavHtml({
    prev: null,
    next: { href: "/entertainment/b/", label: "Show B" },
  });
  assert.match(html, /<span><\/span><a href="\/entertainment\/b\/"/);
  assert.doesNotMatch(html, />Previous</);
});

test("gallery event order is upcoming then past", () => {
  const events = [
    { id: "past-old", label: "Old", start_date: "2025-01-01" },
    { id: "up-late", label: "Later", start_date: "2026-12-01" },
    { id: "up-soon", label: "Soon", start_date: "2026-10-01" },
    { id: "past-new", label: "Recent", start_date: "2026-08-01" },
  ];
  assert.deepEqual(
    galleryShowOrder(events, "2026-09-15").map((e) => e.id),
    ["up-soon", "up-late", "past-new", "past-old"],
  );
});

test("event pager is chronological: Previous older, Next newer, no wrap", () => {
  const events = [
    { id: "past-old", label: "Old", start_date: "2025-01-01" },
    { id: "up-late", label: "Later", start_date: "2026-12-01" },
    { id: "up-soon", label: "Soon", start_date: "2026-10-01" },
    { id: "past-new", label: "Recent", start_date: "2026-08-01" },
    { id: "same-b", label: "Beta", start_date: "2026-09-20" },
    { id: "same-a", label: "Alpha", start_date: "2026-09-20" },
  ];
  const ordered = chronologicalShowOrder(events);
  assert.deepEqual(
    ordered.map((e) => e.id),
    ["past-old", "past-new", "same-a", "same-b", "up-soon", "up-late"],
  );
  const oldest = adjacentInList(ordered, "past-old", { wrap: false, key: "id" });
  assert.equal(oldest.prev, null);
  assert.equal(oldest.next.id, "past-new");
  const newest = adjacentInList(ordered, "up-late", { wrap: false, key: "id" });
  assert.equal(newest.prev.id, "up-soon");
  assert.equal(newest.next, null);
  const alpha = adjacentInList(ordered, "same-a", { wrap: false, key: "id" });
  assert.equal(alpha.prev.id, "past-new");
  assert.equal(alpha.next.id, "same-b");
});

const HOME_SHOWS = [
  { id: "sep-20-a", label: "Alpha", start_date: "2026-09-20", end_date: "2026-09-20" },
  { id: "sep-20-b", label: "Beta", start_date: "2026-09-20", end_date: "2026-09-20" },
  { id: "oct-3", label: "October 3", start_date: "2026-10-03", end_date: "2026-10-03" },
  { id: "oct-4", label: "October 4", start_date: "2026-10-04", end_date: "2026-10-04" },
  { id: "oct-24", label: "October 24", start_date: "2026-10-24", end_date: "2026-10-24" },
  { id: "weekend", label: "Weekend", start_date: "2026-08-21", end_date: "2026-08-22" },
  { id: "old", label: "Old", start_date: "2026-06-05", end_date: "2026-06-05" },
];

test("home strip drops shows after their end date and keeps later ones", () => {
  assert.deepEqual(
    pickHomeShows(HOME_SHOWS, "2026-09-15").map((e) => e.id),
    ["sep-20-a", "sep-20-b", "oct-3", "oct-4"],
  );
  assert.deepEqual(
    pickHomeShows(HOME_SHOWS, "2026-09-23").map((e) => e.id),
    ["oct-3", "oct-4", "oct-24", "sep-20-a"],
  );
  assert.deepEqual(
    pickHomeShows(HOME_SHOWS, "2026-08-22").map((e) => e.id),
    ["weekend", "sep-20-a", "sep-20-b", "oct-3"],
  );
});

test("gallery partition moves a finished show into past, newest first", () => {
  const { upcoming, past } = partitionShowsByEnd(HOME_SHOWS, "2026-09-23");
  assert.deepEqual(
    upcoming.map((e) => e.id),
    ["oct-3", "oct-4", "oct-24"],
  );
  assert.deepEqual(
    past.map((e) => e.id),
    ["sep-20-a", "sep-20-b", "weekend", "old"],
  );
});

test("home candidates include every show still on at build, plus past fillers", () => {
  const ids = homeShowCandidates(HOME_SHOWS, "2026-09-15").map((e) => e.id);
  assert.deepEqual(ids, [
    "sep-20-a",
    "sep-20-b",
    "oct-3",
    "oct-4",
    "oct-24",
    "weekend",
    "old",
  ]);
});
