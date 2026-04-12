# MK Discover

A static GitHub Pages web app plus Supabase backend for becoming the default discovery layer for Milton Keynes.

The goal is not a narrow event directory. The goal is to index and surface **everything people might want to discover in Milton Keynes**: events, classes, clubs, food, services, local offers, venues, jobs, volunteering, activities, communities, organisations, spaces, and more.

# MK Discover — Full System README

## CORE OBJECTIVE

Become the **default starting point for ALL activity in Milton Keynes**.

> When anyone in MK wants anything, they check this first.

This is NOT just a website.
This is a **discovery layer for an entire city**.

---

# FUNDAMENTAL STRATEGY

This project is designed to replicate what companies like:

* Google (discovery)
* Amazon (transactions)
* Apple (default interface)
* Microsoft (daily workflow)

do — but at a **local monopoly level (Milton Keynes)**.

### The goal:

Control:

* where people go
* what people do
* what people buy
* how people spend time

---

# PRODUCT PRINCIPLE

The product must answer ONE question perfectly:

> "What should I do right now in Milton Keynes?"

Everything else expands from this.

---

# NON-NEGOTIABLE RULES

## 1. NO FAKE DATA (CRITICAL)

Production must NEVER include:

* fake listings
* placeholder content
* demo entries

If no data exists:

* show empty state
* do NOT fabricate

Reason:
Trust = monopoly.
Fake data destroys trust.

---

## 2. SPEED > EVERYTHING

User should get value in < 2 seconds.

* no login required
* no friction
* instant results

---

## 3. CLARITY > FEATURES

* minimal UI
* no clutter
* only high-value info

---

## 4. LOCAL DOMINANCE ONLY

Do NOT expand outside Milton Keynes until dominance achieved.

---

# SYSTEM ARCHITECTURE

## Frontend (GitHub Pages)

* index.html
* styles.css
* app.js
* config.js

Role:

* display data
* handle search
* render results

## Backend (Supabase)

* search_documents table
* categories table

Role:

* store ALL real data
* control publishing
* enable querying

## Deployment

* GitHub Actions → GitHub Pages

---

# DATA MODEL

Everything is stored as a **search document**.

This allows:

* unified search
* flexible expansion
* simple indexing

## Types (expand over time)

* event
* place
* food
* service
* job
* deal
* activity

---

# PHASED ROADMAP

## PHASE 1 — EVENTS DOMINATION (START HERE)

Goal:
Own "what’s happening in MK"

Actions:

* manually input events
* scrape from:

  * Facebook
  * Eventbrite
  * Meetup
  * local venues
* add your own events (chess etc.)

Target:

* 50–200 real listings

---

## PHASE 2 — DAILY HABIT

Goal:
Make users check daily

Add:

* "Today"
* "Tonight"
* "This week"

Distribution:

* Facebook groups
* QR codes (chess club)
* posters

---

## PHASE 3 — CATEGORY EXPANSION

Add:

* food
* services
* gyms
* study spots
* jobs

Goal:
Expand from events → everything

---

## PHASE 4 — SUPPLY LOCK-IN

Make businesses NEED the platform

Add:

* submit listing form
* featured placements
* analytics (future)

---

## PHASE 5 — MONETISATION

* featured listings
* commissions
* promote your own businesses

---

# DISTRIBUTION STRATEGY (CRITICAL)

## 1. Facebook groups

Post:
"Everything happening in Milton Keynes today"

## 2. Physical presence

* posters
* QR codes
* events (your chess club)

## 3. SEO (later)

Pages:

* things to do in MK today
* MK events this week

---

# WHY THIS WORKS

Most platforms fail because:

* fragmented information
* outdated listings
* poor UX

This wins by:

* being faster
* being simpler
* being more relevant

---

# FUTURE SYSTEMS (AI SHOULD BUILD THESE)

## 1. Ingestion pipeline

Automatically collect:

* events
* businesses
* listings

## 2. Ranking engine

Sort by:

* relevance
* time
* popularity

## 3. Entity pages

Each listing gets its own page

## 4. User signals

Clicks → improve ranking

## 5. Notifications

Daily updates

---

# SUCCESS METRIC

Primary metric:

> % of Milton Keynes residents who check this first

---

# FAILURE MODES (AVOID THESE)

* fake data
* too much text
* confusing
* amateur design
* complicated user interface
* difficult to use
* slow UI
* cluttered design
* too many features early
* expanding outside MK too early


---

# FINAL TRUTH

This project is NOT about building a website.

It is about:

> Controlling the starting point of human action in Milton Keynes.

That is how monopoly is achieved.


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
