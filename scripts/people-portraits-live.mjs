/**
 * Live people-portrait helpers for local preview + face-crop Save.
 * Never copies dist → src (would overwrite a newer crop).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PEOPLE_PREFIX = "/img/entertainment/people/";

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
        out = out.replace(
          /(<header class="hero">[\s\S]*?<\/nav>)\s*<h1>([^<]*)<\/h1>/,
          (_, head, name) =>
            `${head}
        <div class="entity-heading">
        <div class="entity-photo entity-photo--person">${peopleImgTag(id, name, meta.mtimeMs)}</div>
        <div class="entity-heading-copy">
          <h1>${name}</h1>
        
        </div>
      </div>`,
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
      html = html.replace(
        /(<header class="hero">[\s\S]*?<\/nav>)\s*<h1>([^<]*)<\/h1>/,
        (_, head, h1) =>
          `${head}
        <div class="entity-heading">
        <div class="entity-photo entity-photo--person">${peopleImgTag(id, h1, meta.mtimeMs)}</div>
        <div class="entity-heading-copy">
          <h1>${h1}</h1>
        
        </div>
      </div>`,
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
