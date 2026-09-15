#!/usr/bin/env node
/**
 * Local Entertainment preview. Serves dist/ on 127.0.0.1:4173, but
 * /img/entertainment/people/*.jpg and /img/entertainment/orgs/*.jpg
 * are read live from src/ (crop Save writes there) with Cache-Control:
 * no-store so the browser does not keep stale portraits. HTML is also
 * no-store; missing people/band <img> tags are injected when the src
 * JPEG exists (first Save, no rebuild).
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { injectLivePortraits } from "./people-portraits-live.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const srcPeople = join(root, "src/img/entertainment/people");
const srcOrgs = join(root, "src/img/entertainment/orgs");
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function safeJoin(base, urlPath) {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^\/+/, "");
  const abs = resolve(base, rel);
  const rootAbs = resolve(base) + sep;
  if (abs !== resolve(base) && !abs.startsWith(rootAbs)) return null;
  return abs;
}

function entertainmentJpegName(urlPath, prefix) {
  const pathOnly = urlPath.split("?")[0];
  if (!pathOnly.startsWith(prefix)) return null;
  const name = pathOnly.slice(prefix.length);
  if (!name || name.includes("/") || !/\.jpe?g$/i.test(name)) return null;
  return name;
}

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const peopleName = entertainmentJpegName(urlPath, "/img/entertainment/people/");
  const orgName = entertainmentJpegName(urlPath, "/img/entertainment/orgs/");
  const liveJpeg = peopleName
    ? { live: join(srcPeople, peopleName), fallback: join(dist, "img/entertainment/people", peopleName) }
    : orgName
      ? { live: join(srcOrgs, orgName), fallback: join(dist, "img/entertainment/orgs", orgName) }
      : null;
  if (liveJpeg) {
    const abs = existsSync(liveJpeg.live)
      ? liveJpeg.live
      : existsSync(liveJpeg.fallback)
        ? liveJpeg.fallback
        : null;
    if (!abs) {
      res.writeHead(404, { "Cache-Control": "no-store" });
      res.end("Not found");
      return;
    }
    const data = readFileSync(abs);
    res.writeHead(200, {
      "Content-Type": "image/jpeg",
      "Content-Length": data.length,
      "Cache-Control": "no-store",
    });
    res.end(data);
    return;
  }

  let abs = safeJoin(dist, urlPath);
  if (!abs) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (existsSync(abs) && statSync(abs).isDirectory()) {
    abs = join(abs, "index.html");
  }
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  let data = readFileSync(abs);
  const type = MIME[extname(abs).toLowerCase()] || "application/octet-stream";
  if (type.startsWith("text/html")) {
    data = Buffer.from(
      injectLivePortraits(data.toString("utf8"), urlPath, {
        srcPeopleDir: srcPeople,
        srcOrgsDir: srcOrgs,
      }),
      "utf8",
    );
  }
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": data.length,
    "Cache-Control": "no-store",
  });
  res.end(data);
});

server.listen(PORT, HOST, () => {
  console.log(`Preview http://${HOST}:${PORT}/ → ${dist}`);
  console.log("People/band JPEGs served live from src/img/entertainment/{people,orgs} (no-store)");
  console.log("HTML no-store; missing people/band <img> injected when src JPEG exists");
});
