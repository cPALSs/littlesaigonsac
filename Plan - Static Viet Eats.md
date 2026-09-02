# Plan — static Viet Eats (leave Beehiiv)

**Status:** Local site in `Operations/Sites/littlesaigonsac` · GitHub Pages [cPALSs/littlesaigonsac](https://github.com/cPALSs/littlesaigonsac) · 2026-09-02  
**Owner:** cPALSs (Bao)  
**Preview:** `npm start` → [http://127.0.0.1:4173/](http://127.0.0.1:4173/)  
**Live:** [littlesaigonsac.town](https://littlesaigonsac.town/)  
**Reference IA:** Beehiiv Viet Eats **categories** (Phở, Cháo, Bánh mì, …) with dishes and kitchens nested underneath. OC [Top 50](https://littlesaigongo.com/guide) is a later option, not this pass.

Edit this clone; push `main` to publish. Dish canon stays in `data/categories.json` — do not file it into Community Graph SQLite. cPALSs still has leftover Viet Eats / Passport copy under Product Scaffolds and Franchise 12; this site is the public renderer.

---

## Why

OC’s [Food Guide](https://littlesaigongo.com/guide) is a **numbered dish catalog**: Vietnamese name, English gloss, hero, then a page per món with kitchens. That is the Viet Eats idea.

Beehiiv is a newsletter CMS. The live site reads as a **chronological feed of food families** (Phở, Bún, Bánh, Chè), not 50 món. Writes already go through Chrome + ProseMirror nested lists because MCP writes are plan-blocked. Posts are **web-only**, so email (Beehiiv’s actual job) is unused. The machine-readable map already exists as a JSON canon; Beehiiv is a leaky renderer.

Static pages in this vault, edited in Cursor, invert that: canon is source, site is generated.

---

## Steal vs leave (OC)

**Steal (information architecture)**

- Dish-first index, not a blog
- One URL per **named recipe** (`phở bò`, not “noodles”)
- Vietnamese name + English gloss on the card and the page
- Short what-it-is on the dish page
- Kitchen(s) underneath the dish — never the other way around

**Leave (Little Saigon Go is a different product)**

- 800-business directory, claim-my-business, check-in / rewards / app
- Ranked 1st–8th lists for a saturated dish
- “Find it nearby” that dumps other metros onto a local dish
- Matcha Tea / nhậu as directory padding
- Cloning OC’s 50 as Sacramento’s 50

Sac editorial (keep): **one best-of-class kitchen per named dish**, or an **open gap**. Not pay-to-list. Kitchen must actually serve that named dish.

---

## Current live state (2026-09-02)

Beehiiv publication `pub_8794d295-8334-4654-abe5-88cc4b0e34df`, tag `viet-eats`. Seven published posts:

| Slug (approx) | Title family |
|---------------|----------------|
| `/p/vieteats-pho` | Phở |
| `/p/vieteats-chao` | Cháo |
| `/p/vieteats-banh-mi` | Bánh mì |
| `/p/vieteats-meat-seafood` | Thịt / Hải sản |
| `/p/vieteats-ca-phe` (confirm slug) | Cà phê |
| `/p/vieteats-banh` | Bánh |
| `/p/vieteats-bun` | Bún |

Homepage also cards **Chè**. Filled examples already in the old canon: Phở City / Pho Momma / Pho Viet Anh (phở bò), Lollibowl (cháo cá), Paris Bánh Mì (thịt nguội), Creasian Fusion (bò né), Em Coffee House / Caffeine Society Club (cà phê phin đen).

Those family posts are the migration **input**, not the target IA.

---

## Target

| Surface | Job |
|---------|-----|
| `/` | Town home — wordmark + nav. Viet Eats is featured, not the whole site. Category cards sort by Pacific breakfast / lunch / dinner (snacks lead between meals). |
| `/viet-eats/` | Category grid (Phở, Cháo, …). Extra `site.nav` items land beside Viet Eats later. |
| `/viet-eats/{category}/` | Named dishes with a thumb left of the list number, then kitchens (or “No candidate yet”). |
| Canon in this folder | JSON — **source of truth**; site is built from it |

Keep the custom domain. Redirect old `/p/vieteats-*` URLs so existing links do not 404.

**Fifty is a ceiling, not a launch bar.** Ship the index with filled lanes plus visible gaps. Restock from what a Stockton Blvd / Elk Grove eater can actually order. Hội An / Hanoi specialties stay gaps until a local kitchen owns them.

---

## Suggested later work (ordered)

1. **Lock a Sac dish roster** — ~50 rows: Vietnamese name, English gloss, slug, status (`filled` / `open`), kitchen if any. Use OC’s list (appendix) as a **prior**, not a clone. Start from live Beehiiv nested dishes, not from families.
2. **Move canon here** — copy/adapt the dish ↔ kitchen map into this folder. Stop treating Beehiiv as source.
3. **Pick a static stack** — Astro or 11ty is enough. Cloudflare Pages or GitHub Pages. Point `littlesaigonsac.town` DNS after a staging pass.
4. **Build thin pages** — index + dish template. Gloss, maps link on address text, gap state. No CMS, no comments, no subscriber gate.
5. **Redirects** — map each old `/p/vieteats-*` family post to the right dish pages (or a family landing that only exists as a redirect hub).
6. **Park Beehiiv** — unpublish or leave a stub pointing at the new URLs. Cancel when DNS + redirects are proven. Keep the account only if a real email list appears later.
7. **Optional reconcile** — one-line pointer from cPALSs Product Scaffolds / Franchise 12 to this folder, so agents stop treating Beehiiv as the product home. Do that in a later cPALSs pass; not required to ship the site.

---

## Out of scope this plan

- Passport stamps, Sky Port, LNY food registry alignment
- Metro “vetted Viet businesses” directory (second SKU, still declined)
- Replacing [saclittlesaigon.com](https://www.saclittlesaigon.com/)
- Instagram growth for [@littlesaigonsactown](https://www.instagram.com/littlesaigonsactown/)
- Beehiiv custom pages / paid-plan MCP writes as a workaround

---

## Open decisions (when work starts)

- Exact stack (Astro vs 11ty vs plain HTML)
- Host (Cloudflare Pages vs GitHub Pages vs other)
- Whether later sections (directories, place letters) share the same header nav or sit as featured blocks on `/` first
- One kitchen vs allowing a second address when two EG/Stockton kitchens both own the lane
- How aggressive to be about NAVV / US-diaspora dish names vs OC’s Vietnam-tourist roster

---

## Appendix — OC Top 50 Món Việt (prior only)

From [littlesaigongo.com/guide](https://littlesaigongo.com/guide) on 2026-09-02. Numbered 1–50; 51+ are extras on the same index.

1. Phở bò — Beef noodle soup
2. Phở gà — Chicken noodle soup
3. Bún bò Huế — Spicy beef & pork noodle soup
4. Bún riêu cua — Crab & tomato noodle soup
5. Bún thịt nướng — Grilled pork noodle bowl
6. Gỏi cuốn — Fresh spring rolls
7. Cơm tấm — Broken rice with grilled pork
8. Bánh mì — Vietnamese sandwich
9. Bánh xèo — Sizzling crepe
10. Chả giò — Fried spring rolls
11. Bánh cuốn — Steamed rice rolls
12. Hủ tiếu — Southern noodle soup
13. Bún chả — Hanoi grilled pork & noodles
14. Mì Quảng — Quảng noodles
15. Lẩu — Vietnamese hot pot
16. Cơm chiên — Vietnamese fried rice
17. Bò kho — Vietnamese beef stew
18. Bò lúc lắc — Shaking beef
19. Bánh canh — Thick noodle soup
20. Cháo gà — Chicken rice porridge
21. Nem nướng — Grilled pork patties
22. Thịt kho trứng — Braised pork belly & eggs
23. Súp cua — Crab egg drop soup
24. Chả cá Lã Vọng — Hanoi turmeric fish with dill
25. Cá kho tộ — Caramelized fish in clay pot
26. Lẩu mắm — Fermented fish hot pot
27. Cao lầu — Hội An noodles
28. Canh chua — Sweet & sour soup
29. Gà nướng sả — Lemongrass grilled chicken
30. Heo quay — Vietnamese roasted pork
31. Vịt quay — Roasted duck
32. Xôi gấc — Red sticky rice
33. Bánh bao — Steamed bun
34. Bánh bèo — Steamed rice cakes
35. Bánh khọt — Mini savory pancakes
36. Bánh ướt — Wet rice rolls
37. Rau muống xào tỏi — Stir-fried water spinach with garlic
38. Bún mắm — Fermented fish noodle soup
39. Bò né — Sizzling Vietnamese steak
40. Cơm gà Hội An — Hội An chicken rice
41. Mì xào giòn — Crispy fried noodles
42. Chè ba màu — Three-color dessert
43. Chè đậu xanh — Mung bean sweet soup
44. Bánh flan — Vietnamese crème caramel
45. Chè trôi nước — Glutinous rice balls in ginger syrup
46. Sinh tố bơ — Avocado smoothie
47. Cà phê trứng — Egg coffee
48. Cà phê sữa đá — Vietnamese iced coffee
49. Nước mía — Sugarcane juice
50. Bánh tét — Cylindrical sticky rice cake

Also on their index (not the marketed 50): Matcha tea · Cá nướng · Nhậu food.

Sac already treats **cà phê phin đen** (black drip) as the coffee lane, not egg coffee. Prefer lived Sacramento menus when the roster is locked.
