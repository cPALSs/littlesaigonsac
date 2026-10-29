/**
 * Build-time image variants. Sources in src/img stay full resolution; pages
 * load small WebP variants, and the lightbox / og:image get the full file.
 * Rendered files are cached in .cache/img/ and reused while newer than the source.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";

/** Largest avatar: .entity-photo 7.5rem box minus 1px border = 118 CSS px, 2x retina. */
export const AVATAR_PX = 236;

/** Digital A5 at 300 dpi; the long edge may be either side (landscape flyers). */
const A5_LONG = 2480;
const A5_SHORT = 1748;

const CACHE_VERSION = "v1";
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export const KINDS = {
  avatar: { tag: String(AVATAR_PX), lazy: true },
  /** Covers a 4-up desktop card (≈269×403 CSS px at 2:3) and the 22rem event-page column, 2x. */
  posterThumb: { tag: "720" },
  /** Viet Eats grid card (≈360 CSS px max), 2x. */
  catCard: { tag: "720" },
  /** Viet Eats hero spans the 1120px wrap, 2x. */
  catHero: { tag: "2240" },
};

let sharpModule;
async function loadSharp() {
  sharpModule ??= (await import("sharp")).default;
  return sharpModule;
}

const posix = (p) => p.split(sep).join("/");

/** Which treatment a src/img-relative path gets. */
export function roleForRel(rel) {
  const r = posix(rel);
  if (
    /^entertainment\/(people|orgs)\/[^/]+$/.test(r) ||
    /^foodies\/[^/]+$/.test(r) ||
    /^lists\/lion-dance\/[^/]+$/.test(r)
  ) {
    return "avatar";
  }
  if (/^entertainment\/[^/]+$/.test(r)) return "poster";
  if (/^[^/]+$/.test(r)) return "category";
  return "passthrough";
}

export function defaultKind(rel) {
  return { avatar: "avatar", poster: "posterThumb", category: "catCard" }[roleForRel(rel)] || null;
}

export function variantRel(rel, kind) {
  const r = posix(rel);
  return `${r.slice(0, r.length - extname(r).length)}.${KINDS[kind].tag}.webp`;
}

/** Render one variant to a Buffer. `input` is a file path or Buffer. */
export async function renderVariant(input, kind) {
  const sharp = await loadSharp();
  const img = sharp(input).rotate();
  switch (kind) {
    case "avatar":
      img.resize(AVATAR_PX, AVATAR_PX, { fit: "cover", position: "centre", withoutEnlargement: true });
      return img.webp({ quality: 80 }).toBuffer();
    case "posterThumb":
      img.resize(720, 810, { fit: "outside", withoutEnlargement: true });
      return img.webp({ quality: 78 }).toBuffer();
    case "catCard":
      img.resize({ width: 720, withoutEnlargement: true });
      return img.webp({ quality: 78 }).toBuffer();
    case "catHero":
      img.resize({ width: 2240, withoutEnlargement: true });
      return img.webp({ quality: 75 }).toBuffer();
    default:
      throw new Error(`Unknown image kind: ${kind}`);
  }
}

function withinA5(width, height) {
  return Math.max(width, height) <= A5_LONG && Math.min(width, height) <= A5_SHORT;
}

/** Full-size poster capped at A5; keeps the source format so the URL does not change. */
async function renderFull(absPath, width, height) {
  const sharp = await loadSharp();
  const landscape = width > height;
  const img = sharp(absPath)
    .rotate()
    .resize(landscape ? A5_LONG : A5_SHORT, landscape ? A5_SHORT : A5_LONG, {
      fit: "inside",
      withoutEnlargement: true,
    });
  const ext = extname(absPath).toLowerCase();
  if (ext === ".png") return img.png({ compressionLevel: 9 }).toBuffer();
  if (ext === ".webp") return img.webp({ quality: 85 }).toBuffer();
  return img.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
}

function walk(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    if (ent.name.startsWith(".")) return [];
    const abs = join(dir, ent.name);
    if (ent.isDirectory()) return walk(abs, base);
    return [posix(relative(base, abs))];
  });
}

async function pool(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}

/**
 * Render (or reuse cached) variants for every image under srcDir.
 * Returns lookups for imgEl / og:image and emit() to copy into dist.
 */
export async function prepareSiteImages({ srcDir, cacheDir }) {
  const sharp = await loadSharp();
  const cacheRoot = join(cacheDir, CACHE_VERSION);
  /** rel → { from: absPath, width, height } for files written under dist/img. */
  const outputs = new Map();
  let rendered = 0;

  const cached = async (outRel, srcAbs, render) => {
    const cacheAbs = join(cacheRoot, outRel);
    const fresh = existsSync(cacheAbs) && statSync(cacheAbs).mtimeMs >= statSync(srcAbs).mtimeMs;
    if (!fresh) {
      mkdirSync(dirname(cacheAbs), { recursive: true });
      writeFileSync(cacheAbs, await render());
      rendered += 1;
    }
    const meta = await sharp(cacheAbs).metadata();
    outputs.set(outRel, { from: cacheAbs, width: meta.width, height: meta.height });
  };

  await pool(walk(srcDir), 8, async (rel) => {
    const abs = join(srcDir, rel);
    if (!IMAGE_EXT.has(extname(rel).toLowerCase())) {
      outputs.set(rel, { from: abs });
      return;
    }
    const meta = await sharp(abs).metadata();
    const role = roleForRel(rel);

    if (role === "poster" && !(withinA5(meta.width, meta.height) && /\.jpe?g$/i.test(rel))) {
      await cached(rel, abs, () => renderFull(abs, meta.width, meta.height));
    } else {
      outputs.set(rel, { from: abs, width: meta.width, height: meta.height });
    }

    const kinds =
      role === "avatar" ? ["avatar"] : role === "poster" ? ["posterThumb"] : role === "category" ? ["catCard", "catHero"] : [];
    for (const kind of kinds) {
      await cached(variantRel(rel, kind), abs, () => renderVariant(abs, kind));
    }
  });

  return {
    rendered,
    count: outputs.size,
    /** Variant for a page <img>; falls back to the emitted file when the path has none. */
    variant(rel, kind = defaultKind(rel)) {
      const r = posix(rel);
      if (kind) {
        const vRel = variantRel(r, kind);
        const v = outputs.get(vRel);
        if (v) return { rel: vRel, width: v.width, height: v.height, lazy: Boolean(KINDS[kind].lazy) };
      }
      const o = outputs.get(r);
      return o ? { rel: r, width: o.width, height: o.height, lazy: false } : null;
    },
    /** The file served at the source path (full poster, og:image). */
    full(rel) {
      const o = outputs.get(posix(rel));
      return o ? { width: o.width, height: o.height } : null;
    },
    emit(distImgDir) {
      for (const [rel, { from }] of outputs) {
        const dest = join(distImgDir, rel);
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(from, dest);
      }
    },
  };
}

/** Render one avatar for a live crop Save straight into dist (no cache). */
export async function writeAvatarVariant(srcAbs, distImgDir, rel) {
  const dest = join(distImgDir, variantRel(rel, "avatar"));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, await renderVariant(srcAbs, "avatar"));
  return dest;
}
