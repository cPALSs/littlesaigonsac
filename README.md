# Little Saigon Sactown

Live: [https://littlesaigonsac.town](https://littlesaigonsac.town)  
Repo: [cPALSs/littlesaigonsac](https://github.com/cPALSs/littlesaigonsac)

cPALSs place-brand site for Sacramento Little Saigon. **Viet Eats** is the first section (dish-first kitchen picks). Canon is [`data/categories.json`](data/categories.json); HTML is generated into `dist/` (not committed).

## Edit / preview / publish

```bash
cd Operations/Sites/littlesaigonsac
npm start
# → http://127.0.0.1:4173/
```

Edit the JSON (and CSS/JS under `src/`), run `npm run build`, then:

```bash
git add -A && git commit -m "Update Little Saigon Sactown" && git push
```

Push to `main` deploys via `.github/workflows/deploy-pages.yml` (builds `dist/`, uploads that folder to Pages).

## DNS

Cloudflare zone **littlesaigonsac.town** (cPALSs account), same GitHub Pages pattern as eglny.com:

| Name | Type | Content | Proxy |
|------|------|---------|-------|
| `@` | A | `185.199.108.153` (and `.109` `.110` `.111`) | DNS only |
| `www` | CNAME | `cpalss.github.io` | DNS only |

Repo **Settings → Pages** → custom domain `littlesaigonsac.town` → Enforce HTTPS after DNS verifies.

Assigned Cloudflare nameservers (same pair as `cpalss.com` / `eglny.com`): `david.ns.cloudflare.com` · `kim.ns.cloudflare.com`. Registrar is still Namecheap (`dns1/dns2.registrar-servers.com`) until those NS are switched.

## Notes

- Category stills: `src/img/`. Dish-row thumbs stay off until frames are large enough.
- Do not file dish canon into Community Graph SQLite.
- Visitor pages must not link monorepo paths.
