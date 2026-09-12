/**
 * Live portrait helpers for local preview + face-crop Save.
 * People → people/{id}.jpg; billed bands → orgs/{id}.jpg.
 * Never copies dist → src (would overwrite a newer crop).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PEOPLE_PREFIX = "/img/entertainment/people/";
const ORGS_PREFIX = "/img/entertainment/orgs/";

/** Hero with a bare h1 (no photo yet): keep chips / socials under the name. */
const HERO_BARE_H1_RE =
  /(<header class="hero">[\s\S]*?<\/nav>)\s*<h1>([^<]*)<\/h1>([\s\S]*?)(?=\s*<\/header>)/;

function wrapHeroEntityHeading(head, name, photoClass, photoHtml, afterH1 = "") {
  return `${head}
        <div class="entity-heading">
        <div class="${photoClass}">${photoHtml}</div>
        <div class="entity-heading-copy">
          <h1>${name}</h1>
        ${afterH1}
        </div>
      </div>`;
}

export function peopleJpegPath(srcPeopleDir, id) {
  return join(srcPeopleDir, `${id}.jpg`);
}

export function peopleImgTag(id, alt, mtimeMs) {
  return `<img src="${PEOPLE_PREFIX}${id}.jpg?t=${mtimeMs}" alt="${alt}">`;
}

export function copySrcPeopleJpegToDist(srcPeopleDir, distPeopleDir, id) {
  const src = peopleJpegPath(srcPeopleDir, id);
  if (!existsSync(src)) return false;
  mkdirSync(distPeopleDir, { recursive: true });
  const dest = join(distPeopleDir, `${id}.jpg`);
  if (existsSync(dest)) {
    const ss = statSync(src);
    const ds = statSync(dest);
    if (ss.size === ds.size && Math.abs(ss.mtimeMs - ds.mtimeMs) < 2) return false;
    if (ds.mtimeMs > ss.mtimeMs + 2 && ds.size > 0) return false;
  }
  copyFileSync(src, dest);
  return true;
}

export function copyMissingOrNewerPeopleJpegs(srcPeopleDir, distPeopleDir, ids) {
  const copied = [];
  for (const id of ids) {
    if (copySrcPeopleJpegToDist(srcPeopleDir, distPeopleDir, id)) copied.push(id);
  }
  return copied;
}

function jpegMeta(srcPeopleDir, id) {
  const abs = peopleJpegPath(srcPeopleDir, id);
  if (!existsSync(abs)) return null;
  return { mtimeMs: Math.floor(statSync(abs).mtimeMs) };
}

/**
 * Inject or refresh people <img> tags when the JPEG exists in src/.
 * Used by preview so first-time Saves show without a site rebuild.
 */
export function injectPeoplePortraits(html, urlPath, srcPeopleDir) {
  if (!html.includes("/entertainment/people/") && !html.includes(PEOPLE_PREFIX)) {
    return html;
  }

  let out = html.replace(
    /<a href="\/entertainment\/people\/([a-z0-9-]+)\/"><span class="entity-photo entity-photo--person performer-avatar">(?:<img[^>]*>)?<\/span><span class="performer-name">([^<]*)<\/span><\/a>/g,
    (full, id, name) => {
      const meta = jpegMeta(srcPeopleDir, id);
      if (!meta) return full;
      return `<a href="/entertainment/people/${id}/"><span class="entity-photo entity-photo--person performer-avatar">${peopleImgTag(id, name, meta.mtimeMs)}</span><span class="performer-name">${name}</span></a>`;
    },
  );

  const personMatch = urlPath.match(/^\/entertainment\/people\/([a-z0-9-]+)\/?$/);
  if (personMatch) {
    const id = personMatch[1];
    const meta = jpegMeta(srcPeopleDir, id);
    if (meta) {
      if (out.includes(`${PEOPLE_PREFIX}${id}.jpg`)) {
        out = out.replace(
          new RegExp(`${PEOPLE_PREFIX}${id}\\.jpg(?:\\?t=\\d+)?`, "g"),
          `${PEOPLE_PREFIX}${id}.jpg?t=${meta.mtimeMs}`,
        );
      } else {
        out = out.replace(HERO_BARE_H1_RE, (_, head, name, afterH1) =>
          wrapHeroEntityHeading(
            head,
            name,
            "entity-photo entity-photo--person",
            peopleImgTag(id, name, meta.mtimeMs),
            afterH1,
          ),
        );
        out = out.replace(
          /content="https:\/\/littlesaigonsac\.town\/img\/brand\/og-image\.png"/g,
          `content="https://littlesaigonsac.town${PEOPLE_PREFIX}${id}.jpg"`,
        );
      }
    }
  }

  return out;
}

/** Patch baked dist HTML after a crop Save (names left untouched). */
export function patchDistPersonPortraitHtml({ distRoot, srcPeopleDir, id, alt }) {
  const meta = jpegMeta(srcPeopleDir, id);
  if (!meta) return { performers: false, personPage: false };
  const name = alt || id;
  const img = peopleImgTag(id, name, meta.mtimeMs);
  let performers = false;
  let personPage = false;

  const performersPath = join(distRoot, "entertainment/performers/index.html");
  if (existsSync(performersPath)) {
    const before = readFileSync(performersPath, "utf8");
    const after = before.replace(
      new RegExp(
        `<a href="/entertainment/people/${id}/"><span class="entity-photo entity-photo--person performer-avatar">(?:<img[^>]*>)?</span><span class="performer-name">([^<]*)</span></a>`,
      ),
      (_, listed) =>
        `<a href="/entertainment/people/${id}/"><span class="entity-photo entity-photo--person performer-avatar">${peopleImgTag(id, listed, meta.mtimeMs)}</span><span class="performer-name">${listed}</span></a>`,
    );
    if (after !== before) {
      writeFileSync(performersPath, after);
      performers = true;
    }
  }

  const pagePath = join(distRoot, "entertainment/people", id, "index.html");
  if (existsSync(pagePath)) {
    let html = readFileSync(pagePath, "utf8");
    const before = html;
    if (html.includes(`${PEOPLE_PREFIX}${id}.jpg`)) {
      html = html.replace(
        new RegExp(`${PEOPLE_PREFIX}${id}\\.jpg(?:\\?t=\\d+)?`, "g"),
        `${PEOPLE_PREFIX}${id}.jpg?t=${meta.mtimeMs}`,
      );
    } else {
      html = html.replace(HERO_BARE_H1_RE, (_, head, h1, afterH1) =>
        wrapHeroEntityHeading(
          head,
          h1,
          "entity-photo entity-photo--person",
          peopleImgTag(id, h1, meta.mtimeMs),
          afterH1,
        ),
      );
      html = html.replace(
        /content="https:\/\/littlesaigonsac\.town\/img\/brand\/og-image\.png"/g,
        `content="https://littlesaigonsac.town${PEOPLE_PREFIX}${id}.jpg"`,
      );
    }
    if (html !== before) {
      writeFileSync(pagePath, html);
      personPage = true;
    }
  }

  return { performers, personPage };
}

export function sitePeopleDirs(siteRoot) {
  return {
    srcPeopleDir: join(siteRoot, "src/img/entertainment/people"),
    distPeopleDir: join(siteRoot, "dist/img/entertainment/people"),
    distRoot: join(siteRoot, "dist"),
  };
}

export function publishPeoplePortrait(siteRoot, id, alt) {
  const { srcPeopleDir, distPeopleDir, distRoot } = sitePeopleDirs(siteRoot);
  const copied = copySrcPeopleJpegToDist(srcPeopleDir, distPeopleDir, id);
  const patched = patchDistPersonPortraitHtml({ distRoot, srcPeopleDir, id, alt });
  return { copied, ...patched };
}

export function orgsJpegPath(srcOrgsDir, id) {
  return join(srcOrgsDir, `${id}.jpg`);
}

export function orgsImgTag(id, alt, mtimeMs) {
  return `<img src="${ORGS_PREFIX}${id}.jpg?t=${mtimeMs}" alt="${alt}">`;
}

export function copySrcOrgsJpegToDist(srcOrgsDir, distOrgsDir, id) {
  const src = orgsJpegPath(srcOrgsDir, id);
  if (!existsSync(src)) return false;
  mkdirSync(distOrgsDir, { recursive: true });
  const dest = join(distOrgsDir, `${id}.jpg`);
  if (existsSync(dest)) {
    const ss = statSync(src);
    const ds = statSync(dest);
    if (ss.size === ds.size && Math.abs(ss.mtimeMs - ds.mtimeMs) < 2) return false;
    if (ds.mtimeMs > ss.mtimeMs + 2 && ds.size > 0) return false;
  }
  copyFileSync(src, dest);
  return true;
}

function orgJpegMeta(srcOrgsDir, id) {
  const abs = orgsJpegPath(srcOrgsDir, id);
  if (!existsSync(abs)) return null;
  return { mtimeMs: Math.floor(statSync(abs).mtimeMs) };
}

/**
 * Inject or refresh billed-band <img> tags when the JPEG exists in src/.
 */
export function injectOrgPortraits(html, urlPath, srcOrgsDir) {
  if (!html.includes("/entertainment/orgs/") && !html.includes(ORGS_PREFIX)) {
    return html;
  }

  let out = html.replace(
    /<a href="\/entertainment\/orgs\/([a-z0-9-]+)\/"><span class="entity-photo entity-photo--org performer-avatar">(?:<img[^>]*>)?<\/span><span class="performer-name">([^<]*)<\/span><\/a>/g,
    (full, id, name) => {
      const meta = orgJpegMeta(srcOrgsDir, id);
      if (!meta) return full;
      return `<a href="/entertainment/orgs/${id}/"><span class="entity-photo entity-photo--org performer-avatar">${orgsImgTag(id, name, meta.mtimeMs)}</span><span class="performer-name">${name}</span></a>`;
    },
  );

  const orgMatch = urlPath.match(/^\/entertainment\/orgs\/([a-z0-9-]+)\/?$/);
  if (orgMatch) {
    const id = orgMatch[1];
    const meta = orgJpegMeta(srcOrgsDir, id);
    if (meta) {
      if (out.includes(`${ORGS_PREFIX}${id}.jpg`)) {
        out = out.replace(
          new RegExp(`${ORGS_PREFIX}${id}\\.jpg(?:\\?t=\\d+)?`, "g"),
          `${ORGS_PREFIX}${id}.jpg?t=${meta.mtimeMs}`,
        );
      } else {
        out = out.replace(HERO_BARE_H1_RE, (_, head, name, afterH1) =>
          wrapHeroEntityHeading(
            head,
            name,
            "entity-photo entity-photo--org",
            orgsImgTag(id, name, meta.mtimeMs),
            afterH1,
          ),
        );
        out = out.replace(
          /content="https:\/\/littlesaigonsac\.town\/img\/brand\/og-image\.png"/g,
          `content="https://littlesaigonsac.town${ORGS_PREFIX}${id}.jpg"`,
        );
      }
    }
  }

  return out;
}

export function injectLivePortraits(html, urlPath, { srcPeopleDir, srcOrgsDir }) {
  let out = injectPeoplePortraits(html, urlPath, srcPeopleDir);
  if (srcOrgsDir) out = injectOrgPortraits(out, urlPath, srcOrgsDir);
  return out;
}

/** Patch baked dist HTML after a band crop Save. */
export function patchDistOrgPortraitHtml({ distRoot, srcOrgsDir, id, alt }) {
  const meta = orgJpegMeta(srcOrgsDir, id);
  if (!meta) return { performers: false, orgPage: false };
  const name = alt || id;
  let performers = false;
  let orgPage = false;

  const performersPath = join(distRoot, "entertainment/performers/index.html");
  if (existsSync(performersPath)) {
    const before = readFileSync(performersPath, "utf8");
    const after = before.replace(
      new RegExp(
        `<a href="/entertainment/orgs/${id}/"><span class="entity-photo entity-photo--org performer-avatar">(?:<img[^>]*>)?</span><span class="performer-name">([^<]*)</span></a>`,
      ),
      (_, listed) =>
        `<a href="/entertainment/orgs/${id}/"><span class="entity-photo entity-photo--org performer-avatar">${orgsImgTag(id, listed, meta.mtimeMs)}</span><span class="performer-name">${listed}</span></a>`,
    );
    if (after !== before) {
      writeFileSync(performersPath, after);
      performers = true;
    }
  }

  const pagePath = join(distRoot, "entertainment/orgs", id, "index.html");
  if (existsSync(pagePath)) {
    let html = readFileSync(pagePath, "utf8");
    const before = html;
    if (html.includes(`${ORGS_PREFIX}${id}.jpg`)) {
      html = html.replace(
        new RegExp(`${ORGS_PREFIX}${id}\\.jpg(?:\\?t=\\d+)?`, "g"),
        `${ORGS_PREFIX}${id}.jpg?t=${meta.mtimeMs}`,
      );
    } else {
      html = html.replace(HERO_BARE_H1_RE, (_, head, h1, afterH1) =>
        wrapHeroEntityHeading(
          head,
          h1,
          "entity-photo entity-photo--org",
          orgsImgTag(id, h1, meta.mtimeMs),
          afterH1,
        ),
      );
      html = html.replace(
        /content="https:\/\/littlesaigonsac\.town\/img\/brand\/og-image\.png"/g,
        `content="https://littlesaigonsac.town${ORGS_PREFIX}${id}.jpg"`,
      );
    }
    if (html !== before) {
      writeFileSync(pagePath, html);
      orgPage = true;
    }
  }

  return { performers, orgPage };
}

export function siteOrgsDirs(siteRoot) {
  return {
    srcOrgsDir: join(siteRoot, "src/img/entertainment/orgs"),
    distOrgsDir: join(siteRoot, "dist/img/entertainment/orgs"),
    distRoot: join(siteRoot, "dist"),
  };
}

export function publishOrgPortrait(siteRoot, id, alt) {
  const { srcOrgsDir, distOrgsDir, distRoot } = siteOrgsDirs(siteRoot);
  const copied = copySrcOrgsJpegToDist(srcOrgsDir, distOrgsDir, id);
  const patched = patchDistOrgPortraitHtml({ distRoot, srcOrgsDir, id, alt });
  return { copied, ...patched };
}

export function publishEntertainmentPortrait(siteRoot, kind, id, alt) {
  return kind === "org"
    ? publishOrgPortrait(siteRoot, id, alt)
    : publishPeoplePortrait(siteRoot, id, alt);
}
