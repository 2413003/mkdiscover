# MK Discover

A static GitHub Pages web app plus Supabase backend for becoming the default discovery layer for Milton Keynes.

The goal is not a narrow event directory. The goal is to index and surface **everything people might want to discover in Milton Keynes**: events, classes, clubs, food, services, local offers, venues, jobs, volunteering, activities, communities, organisations, spaces, and more.

## Non-negotiable product rule

**Long term, production must contain no fake or demo listings.**

This repository is structured so the frontend can run with zero bundled fake records. It only shows data returned from Supabase. If the database is empty, the UI should stay empty.

Use demo or test rows only in isolated development environments, and remove them before production.

## What this repo includes

- `index.html` — static app shell for GitHub Pages
- `styles.css` — minimal UI styling
- `app.js` — Supabase-powered search UI
- `config.js` — frontend config for Supabase URL and anon key
- `supabase/schema.sql` — database schema, indexes, policies, triggers
- `supabase/ingestion_notes.md` — how real data should enter the system
- `AI_INSTRUCTIONS.md` — permanent project brief for future AI edits
- `.github/workflows/deploy.yml` — GitHub Pages deployment workflow

## Architecture

### Frontend

- Static HTML/CSS/JS
- Deployable to GitHub Pages
- Reads directly from Supabase using the public anon key
- No server required for the first release

### Backend

- Supabase Postgres
- Row-level security enabled
- Public read access only for `published` records
- Admin writes happen through the Supabase dashboard, SQL editor, Edge Functions, or future ingestion pipelines

## Product direction

This should evolve into a Milton Keynes discovery engine, not just a directory.

Priority surfaces over time:

1. Search everything in MK
2. Live and current availability
3. Highest-trust, highest-relevance ranking
4. Rich profile pages for every entity
5. User habit loop: first place people check
6. B2B claiming, updating, featured placement, analytics
7. Real-time discovery across where people spend time

## How to deploy

## 1. Create a GitHub repo

Create a repo and upload these files.

## 2. Create a Supabase project

In Supabase SQL editor, run:

- `supabase/schema.sql`

## 3. Create the frontend config

Edit `config.js`:

```js
window.MK_DISCOVER_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_PUBLIC_ANON_KEY",
  APP_NAME: "MK Discover",
  APP_LOCATION: "Milton Keynes",
  ENABLE_REALTIME: true
};
```

## 4. Push to GitHub

GitHub Pages can serve this as a static site.

## 5. Enable Pages

In GitHub:

- Settings
- Pages
- Source: GitHub Actions

The included workflow deploys automatically on push to `main`.

## Data policy

### Production data rules

- No fake listings
- No invented opening hours
- No invented descriptions pretending to be facts
- No invented addresses or contact details
- No invented events
- No copying stale data forward without re-verification
- Every production record should have a source and last verified time

### Acceptable sources

- Official organisation websites
- Official booking pages
- Official social profiles
- Official calendars
- Direct owner submissions
- Manual admin research with source URL captured
- Future APIs / feeds / scraping pipelines where legally and operationally appropriate

## Recommended first real categories

- events
- food-and-drink
- clubs-and-communities
- fitness-and-sport
- classes-and-courses
- venues-and-spaces
- volunteering
- jobs
- deals-and-offers
- family-and-kids
- arts-and-culture
- nightlife
- services

## First admin workflow

Use the Supabase dashboard at first. Add only real rows.

Suggested process:

1. Add categories
2. Add a few dozen real Milton Keynes listings
3. Record source name and source URL externally or in a future source table
4. Mark records as `published`
5. Review search quality
6. Improve ranking logic

## Recommended next build steps

1. Add entity detail pages
2. Add full-text search using Postgres search vectors
3. Add source table and verification log
4. Add admin UI for manual curation
5. Add claim-your-page flow
6. Add ingestion pipelines for official feeds
7. Add geolocation and map results
8. Add personalised ranking and saved alerts
9. Add current-now feed
10. Add trust score and freshness score

## Important note about scale

This repo is a strong starting point. It is **not** the entire end-state system for indexing literally everything in MK. That requires ongoing ingestion, verification, ranking, entity resolution, admin tooling, and distribution.

This repository is designed so future AI can extend it without needing the project re-explained.
