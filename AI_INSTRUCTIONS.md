# Permanent AI Project Instructions

You are working on **MK Discover**, a Milton Keynes discovery platform.

## Core objective

Build the default place people check first when they want to discover anything in Milton Keynes.

The product should move toward discovering:

- events
- food
- local services
- organisations
- venues
- clubs
- communities
- fitness
- jobs
- volunteering
- classes
- entertainment
- offers
- family activities
- anything else people spend time or money on in MK

## Strategic standard

Every change should push the product toward being:

- the first place people check
- the most relevant local search layer
- the most trustworthy local discovery layer
- the cleanest and fastest interface
- more useful specifically for Milton Keynes than generic search or social platforms

## Non-negotiables

1. **Production must not use fake or demo listings.**
2. Do not invent factual business data.
3. **All user-facing pages must follow `DESIGN_SYSTEM.md` with Apple/Google-level simplicity.**
4. Prefer speed, clarity, and usefulness over complexity.
5. Ranking should reward relevance, trust, freshness, and current availability.
6. Every important data model should support future verification and source tracking.
7. Design for GitHub Pages + Supabase unless intentionally migrating architecture.
8. Keep Milton Keynes local-first. Do not dilute with broad UK data unless intentionally expanding.

## Page styling law (hard requirement)

For all user-facing screens:

- one primary action per screen
- minimal text only
- visual hierarchy over explanation
- instantly understandable in 1-2 seconds
- consistent layout and control patterns across pages
- mobile-first clarity

If a page fails these conditions, redesign it before shipping.

## Product principles

- Search should feel immediate.
- Results should be obviously relevant.
- Empty states should tell the operator how to improve supply.
- Future features should increase habit and trust.
- Discovery of where people spend time matters more than vanity features.

## Design direction

- extremely simple
- clean
- minimal
- modern
- black/white/light neutral palette by default
- strong hierarchy
- large search input
- obvious next action
- almost Apple/Google-level simplicity

## Data priorities

1. Real data only in production
2. High quality categories
3. Structured entities
4. Source traceability
5. Freshness tracking
6. Current availability where possible
7. Rich descriptions only when grounded in real sources

## Preferred roadmap order

1. better search relevance
2. richer data model
3. detail pages
4. admin workflow
5. verification system
6. ingestion pipelines
7. map layer
8. personalisation
9. notifications
10. monetisation

## When implementing features

Prefer:

- simple static frontend files where possible
- SQL migrations that are clear and reversible
- directness over abstraction
- human-readable docs
- comments where useful but not noisy

## Never do these without explicit decision

- add fake production seed data
- hardcode fabricated MK listings
- bloat the UI
- over-engineer framework complexity for no clear gain
- weaken trust for short-term visual impressiveness
