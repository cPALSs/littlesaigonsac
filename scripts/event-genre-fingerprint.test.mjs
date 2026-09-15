import assert from "node:assert/strict";
import test from "node:test";
import {
  eventGenreFingerprint,
  FINGERPRINT_OTHER,
  PERFORMER_GENRE_UNKNOWN,
} from "./entertainment-pages.mjs";

test("Phước Sơn: dual-tag split, unknown last, percents 50/10/40", () => {
  const lineup = [
    { type: "person", id: "huong-lan" },
    { type: "person", id: "khanh-lam" },
    { type: "person", id: "quang-le" },
    { type: "person", id: "rachael-tuong-vy" },
    { type: "person", id: "cham-hai" },
  ];
  const people = {
    "huong-lan": {
      specialties: [
        { slug: "que-huong" },
        { slug: "co-nhac" },
      ],
    },
    "khanh-lam": { specialties: [{ slug: "que-huong" }] },
    "quang-le": { specialties: [{ slug: "que-huong" }] },
    "rachael-tuong-vy": {},
    "cham-hai": { specialties: [] },
  };
  const { total, segments } = eventGenreFingerprint(lineup, people, {});
  assert.equal(total, 5);
  assert.deepEqual(
    segments.map((s) => ({ slug: s.slug, points: s.points, percent: s.percent })),
    [
      { slug: "que-huong", points: 2.5, percent: 50 },
      { slug: "co-nhac", points: 0.5, percent: 10 },
      { slug: PERFORMER_GENRE_UNKNOWN, points: 2, percent: 40 },
    ],
  );
  assert.equal(segments.at(-1).kind, "unknown");
});

test("empty lineup has no segments", () => {
  const { total, segments } = eventGenreFingerprint([], {}, {});
  assert.equal(total, 0);
  assert.deepEqual(segments, []);
});

test("billed org specialties count like people", () => {
  const lineup = [
    { type: "org", id: "cong-thanh-lynn" },
    { type: "person", id: "solo" },
    { type: "person", id: "solo-2" },
  ];
  const people = {
    solo: { specialties: [{ slug: "nhac-tre" }] },
    "solo-2": { specialties: [{ slug: "nhac-tre" }] },
  };
  const orgs = { "cong-thanh-lynn": { specialties: [{ slug: "que-huong" }] } };
  const { segments } = eventGenreFingerprint(lineup, people, orgs);
  assert.deepEqual(
    segments.map((s) => ({ slug: s.slug, points: s.points, percent: s.percent })),
    [
      { slug: "nhac-tre", points: 2, percent: 67 },
      { slug: "que-huong", points: 1, percent: 33 },
    ],
  );
});

test("more than four named genres collapse leftover into Other", () => {
  const slugs = [
    "nhac-vang",
    "que-huong",
    "nhac-tre",
    "remix",
    "co-nhac",
    "trinh",
  ];
  const lineup = slugs.map((slug) => ({ type: "person", id: slug }));
  const people = Object.fromEntries(
    slugs.map((slug) => [slug, { specialties: [{ slug }] }]),
  );
  const { segments } = eventGenreFingerprint(lineup, people, {});
  assert.equal(segments.length, 5);
  assert.equal(segments.filter((s) => s.kind === "named").length, 4);
  const other = segments.find((s) => s.slug === FINGERPRINT_OTHER);
  assert.equal(other.points, 2);
  assert.equal(other.kind, "other");
  assert.ok(!segments.some((s) => s.slug === PERFORMER_GENRE_UNKNOWN));
});

test("Unknown stays its own bar and does not compete for the top 4", () => {
  const slugs = ["nhac-vang", "que-huong", "nhac-tre", "remix", "co-nhac"];
  const lineup = [
    ...slugs.map((slug) => ({ type: "person", id: slug })),
    { type: "person", id: "untagged" },
  ];
  const people = {
    ...Object.fromEntries(slugs.map((slug) => [slug, { specialties: [{ slug }] }])),
    untagged: {},
  };
  const { segments } = eventGenreFingerprint(lineup, people, {});
  assert.equal(segments.length, 6);
  assert.equal(segments.at(-1).slug, PERFORMER_GENRE_UNKNOWN);
  assert.equal(segments.at(-1).points, 1);
  assert.equal(segments.find((s) => s.slug === FINGERPRINT_OTHER).points, 1);
});

test("emcee-only people are omitted, not Other or Unknown", () => {
  const lineup = [
    { type: "person", id: "mc-1", role: "mc" },
    { type: "person", id: "mc-2", role: "mc" },
    { type: "person", id: "mc-3", role: "mc" },
    { type: "person", id: "singer", role: "vocalist" },
    { type: "person", id: "untagged", role: "vocalist" },
  ];
  const people = {
    "mc-1": { specialties: [{ slug: "emcee" }] },
    "mc-2": { specialties: [{ slug: "emcee" }] },
    "mc-3": { specialties: [{ slug: "emcee" }] },
    singer: { specialties: [{ slug: "que-huong" }] },
    untagged: {},
  };
  const { total, segments } = eventGenreFingerprint(lineup, people, {});
  assert.equal(total, 2);
  assert.deepEqual(
    segments.map((s) => ({ slug: s.slug, points: s.points, percent: s.percent })),
    [
      { slug: "que-huong", points: 1, percent: 50 },
      { slug: PERFORMER_GENRE_UNKNOWN, points: 1, percent: 50 },
    ],
  );
  assert.ok(!segments.some((s) => s.slug === "emcee" || s.slug === FINGERPRINT_OTHER));
});

test("untagged billed MC is omitted, not Unknown", () => {
  const lineup = [
    { type: "person", id: "mc", role: "mc" },
    { type: "person", id: "singer", role: "vocalist" },
  ];
  const people = {
    mc: {},
    singer: { specialties: [{ slug: "nhac-vang" }] },
  };
  const { total, segments } = eventGenreFingerprint(lineup, people, {});
  assert.equal(total, 1);
  assert.deepEqual(
    segments.map((s) => ({ slug: s.slug, points: s.points, percent: s.percent })),
    [{ slug: "nhac-vang", points: 1, percent: 100 }],
  );
});

test("producer specialty is omitted; dual-tag keeps full music weight", () => {
  const lineup = [
    { type: "person", id: "huy", role: "vocalist" },
    { type: "person", id: "band", role: "vocalist" },
  ];
  const people = {
    huy: { specialties: [{ slug: "producer" }, { slug: "nhac-tre" }] },
    band: { specialties: [{ slug: "nhac-vang" }] },
  };
  const { total, segments } = eventGenreFingerprint(lineup, people, {});
  assert.equal(total, 2);
  assert.deepEqual(
    segments.map((s) => ({ slug: s.slug, points: s.points, percent: s.percent })),
    [
      { slug: "nhac-vang", points: 1, percent: 50 },
      { slug: "nhac-tre", points: 1, percent: 50 },
    ],
  );
  assert.ok(!segments.some((s) => s.slug === "producer" || s.slug === FINGERPRINT_OTHER));
});

test("four music genres plus emcee: MC dropped, no Other", () => {
  const music = ["nhac-vang", "que-huong", "nhac-tre", "remix"];
  const lineup = [
    ...music.map((slug) => ({ type: "person", id: slug, role: "vocalist" })),
    { type: "person", id: "mc", role: "mc" },
  ];
  const people = {
    ...Object.fromEntries(music.map((slug) => [slug, { specialties: [{ slug }] }])),
    mc: { specialties: [{ slug: "emcee" }] },
  };
  const { total, segments } = eventGenreFingerprint(lineup, people, {});
  assert.equal(total, 4);
  assert.equal(segments.filter((s) => s.kind === "named").length, 4);
  assert.ok(!segments.some((s) => s.slug === FINGERPRINT_OTHER || s.slug === "emcee"));
});

