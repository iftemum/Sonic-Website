# Sonic Window Cleaning

Marketing site for **Sonic Window Cleaning** — a Saskatoon-based exterior cleaning business serving 25+ surrounding communities. Built with [Astro](https://astro.build).

## Status

- ✅ Hero section with looping background video, dark navy overlay, animated headline, and dual CTAs
- ✅ SEO foundation: meta tags, Open Graph + Twitter cards, geo tags, `LocalBusiness` JSON-LD covering all service-area cities
- ⏳ Services, Work, Service Area, Reviews sections (next)

## Branching model

- `main` — production-ready code only. Never committed to directly.
- `develop` — integration branch. All feature branches start here and merge back here.
- `feature/*` — short-lived branches off `develop` for individual sections (e.g. `feature/services`, `feature/reviews`).

When the full site is complete, `develop` is merged into `main` for release.

## Tech stack

- **Astro 6** (static)
- **Inter** via Google Fonts
- Optimized assets via `astro:assets`
- Background video hosted on Cloudflare R2

## Project structure

```text
/
├── public/
│   ├── favicon.svg
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   └── sonic_logo.webp
│   ├── components/
│   │   └── Hero.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
├── astro.config.mjs
└── package.json
```

## Commands

Run from the project root. Requires Node `>=22.12.0`.

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start local dev server at `localhost:4321`   |
| `npm run build`   | Build the production site to `./dist/`       |
| `npm run preview` | Preview the production build locally         |
| `npm run astro`   | Run Astro CLI commands (`astro check`, etc.) |

## SEO notes

The `LocalBusiness` schema in [`src/layouts/Layout.astro`](src/layouts/Layout.astro) lists every service-area city (Saskatoon, Warman, Martensville, Osler, Dalmeny, Langham, Delisle, Vanscoy, Clavet, Dundurn, Aberdeen, Allan, Asquith, Borden, Bradwell, Colonsay, Cudworth, Duck Lake, Hague, Hanley, Hepburn, Kenaston, Radisson, Rosthern, Viscount, Wakaw, Waldheim) for local-pack visibility.

Before going live:

1. Add a real `public/og-image.jpg` (1200×630).
2. Set the production `site` URL in [`astro.config.mjs`](astro.config.mjs) so canonical and OG URLs resolve absolutely.
3. Fill in `streetAddress`, `postalCode`, and `telephone` on the `LocalBusiness` schema once available.
