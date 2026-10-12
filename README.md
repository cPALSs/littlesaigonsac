# Little Saigon Sactown

Live: [https://littlesaigonsac.town](https://littlesaigonsac.town)  
Repo: [cPALSs/littlesaigonsac](https://github.com/cPALSs/littlesaigonsac)

cPALSs place-brand site for Sacramento Little Saigon. **Viet Eats** is dish-first kitchen picks ([`data/categories.json`](data/categories.json)). **Entertainment** is a scrubbed concert poster gallery ([`data/entertainment.json`](data/entertainment.json), generated from Community Graph). HTML is generated into `dist/` (not committed).

Ops sources (brand masters, TikTok, unused stock) live in the cPALSs vault at `Operations/Little Saigon Sactown/` — not this repo. This clone is the website only.

## Edit / preview / publish

```bash
cd Operations/Sites/littlesaigonsac
npm start
# → http://127.0.0.1:4173/
```

Edit the JSON (and CSS/JS under `src/`), run `npm run build` / `npm start`, and **preview locally**. Do **not** `git push` while iterating (copy/CSS/listing tweaks). Wait until Bao says `push`, `deploy`, `ship`, or `okay to push`.

```bash
git add -A && git commit -m "Update Little Saigon Sactown" && git push
```

Push to `main` deploys via `.github/workflows/deploy-pages.yml` (builds `dist/`, uploads that folder to Pages). First-pass “put this new page live” may push once; a tweak loop does not.

## DNS

Cloudflare zones on the cPALSs account. Nameservers: `david.ns.cloudflare.com` · `kim.ns.cloudflare.com`.

**littlesaigonsac.town** (GitHub Pages origin):

| Name | Type | Content | Proxy |
|------|------|---------|-------|
| `@` | A | `185.199.108.153` (and `.109` `.110` `.111`) | DNS only |
| `www` | CNAME | `littlesaigonsac.town` | Proxied |

Redirect Rule: `www.littlesaigonsac.town` → `https://littlesaigonsac.town` (301, path + query).

Repo **Settings → Pages** → custom domain `littlesaigonsac.town` → Enforce HTTPS after DNS verifies.

**littlesaigonsac.com** (redirect-only):

- `www` → apex `https://littlesaigonsac.com` (301)
- apex → `https://littlesaigonsac.town` (301)

## Entertainment export

After ingesting Vietnamese Concert flyers into Community Graph, regenerate public JSON + JPEG posters from the cPALSs vault (`Community OS/database`), not this clone:

```bash
node scripts/export-entertainment-public.mjs
```

That writes `data/entertainment.json` and `src/img/entertainment/{activity-id}.jpg` here. Then `npm run build` / `npm start` in this clone.

## Notes

- Category stills: `src/img/`. Concert posters: `src/img/entertainment/`. Performer / band avatars: `src/img/entertainment/{people,orgs}/`.
- `src/img/` holds full-resolution sources. The build (`scripts/images.mjs`, sharp) writes smaller WebP variants into `dist/img/` and pages load those: avatars `{id}.236.webp` (7.5rem at 2x), poster cards `{id}.720.webp`, category cards `.720.webp`, category heroes `.2240.webp`. The lightbox and `og:image` use the file at the source path; posters there are capped at digital A5 (1748×2480). Variants are cached in `.cache/img/` (gitignored), so only new or changed images are re-rendered. Run `npm install` once in this clone.
- Do not file dish canon into Community Graph SQLite.
- Visitor pages must not link monorepo paths, `file://`, or Bao Thoughts vault paths.
