# Soundev Dashboard Project Handoff

## 1. Project Overview

**Name:** Soundev Dashboard

**Business:** Soundev sells Drum Mastery Suite, a digital drum workflow system for music producers.

**Product price:** $67

**Purpose:** Private analytics dashboard for combining Stripe, Meta Ads, GoHighLevel, Notion, and Instagram data into one practical business command center.

**Main goal:** Stop checking multiple dashboards manually and make better decisions about revenue, ads, funnel performance, creative testing, attribution, and operational next actions.

The app started as a clean mock-data prototype and has progressed into a Supabase-ready dashboard with live Stripe, Meta Ads, and GoHighLevel foundations plus a Soundev-specific electric-blue visual theme. Notion, Instagram, auth, deployment, and scheduled syncs are not connected yet.

## 2. Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Stripe SDK
- Meta Marketing API
- Recharts
- Vitest
- ESLint

Local development:

```powershell
npm run dev
```

Verification:

```powershell
npm test
npm run lint
npm run build
```

## 3. Current Architecture

### App Pages

Routes live under `src/app`:

- `/` - Overview / command center
- `/revenue` - Stripe revenue events and KPIs
- `/meta-ads` - Meta Ads performance
- `/funnel` - GoHighLevel funnel page with live contact/opportunity fallback
- `/creative-tracker` - Notion-style creative tracker placeholder/mock page
- `/instagram` - Instagram analytics placeholder/mock page
- `/settings` - future connection cards
- `/settings/diagnostics` - environment and latest-row diagnostics

### Dashboard Components

Reusable dashboard UI lives under `src/components/dashboard`:

**Layout / Navigation**
- `sidebar.tsx`
- `header.tsx`
- `page-section.tsx`
- `date-range-selector.tsx`

**Data Display**
- `data-table.tsx`
- `kpi-card.tsx`
- `status-badge.tsx`
- `data-mode-badge.tsx`
- `alert-callout.tsx`
- `api-state-card.tsx`

**Charts** *(added/expanded in Phase 7D)*
- `chart-renderers.tsx` — base Recharts renderers (`BarChartRenderer`, `LineChartRenderer`, `ComposedChartRenderer`, `MultiBarChartRenderer`). Also exports `chartPalette` color constants.
- `bar-chart-card.tsx` — single-series bar chart wrapper
- `line-chart-card.tsx` — multi-line chart wrapper
- `multi-bar-chart-card.tsx` — grouped/stacked bar chart wrapper *(Phase 7D)*
- `composed-chart-card.tsx` — bar + line dual-axis chart wrapper *(Phase 7D)*

**Panels / Status**
- `source-freshness.tsx` — per-source live/partial/mock/not-connected badge. **Always pass source-specific mode, never the combined page mode.**
- `source-connection-card.tsx`
- `data-health-panel.tsx`
- `data-trust-panel.tsx`
- `next-actions-panel.tsx`

### Visual Theme System

Phase 7C centralized the Soundev visual direction in `src/app/globals.css`.

Theme direction:

- black void background
- cold cinematic electric-blue glow
- deep blue-black surfaces
- thin cool-blue borders
- premium minimal control-room UI
- subdued amber/red only for warning/error states

Theme tokens live in CSS variables and Tailwind v4 `@theme inline` aliases:

- `--sd-void`
- `--sd-surface`
- `--sd-surface-elevated`
- `--sd-surface-hover`
- `--sd-border`
- `--sd-border-strong`
- `--sd-text`
- `--sd-text-secondary`
- `--sd-text-muted`
- `--sd-accent`
- `--sd-accent-bright`
- `--sd-glow`
- `--sd-glow-soft`

Reusable CSS component classes:

- `.soundev-card`
- `.soundev-card-hover`
- `.soundev-subcard`
- `.soundev-icon`
- `.soundev-control`
- `.soundev-divider`

Tailwind zinc/sky/indigo/emerald/amber/rose color aliases were tuned toward the Soundev palette so existing utility classes stay visually coherent.

### Data Access Layer

Server-side data readers live under `src/lib/data`:

- `revenue.ts` — Stripe transactions, failed payments, refunds. Exports `getRevenueData()`, `buildRevenueDataFromRows()`, `normalizeTransactions()`.
- `ads.ts` — Meta Ads metrics, campaigns, ad sets, ads. Exports `getAdsData()`, `buildAdsDataFromRows()`. Returns `metaRevenueWarning: boolean` when spend exists but `revenue_cents = 0`.
- `funnel.ts` — GoHighLevel contacts and opportunities. Exports `getFunnelData()`, `buildFunnelDataFromRows()`, `normalizeGhlContacts()`, `normalizeGhlOpportunities()`. Returns `opportunitiesNote: string | null` when contacts exist but opportunities are empty.
- `overview.ts` — Orchestrates all sources into a single page payload. Returns `revenueMode` and `adsMode` alongside combined `mode` so pages can pass source-specific modes to `SourceFreshness` badges.
- `creative.ts` — Notion creative tracker (mock fallback).
- `instagram.ts` — Instagram analytics (mock fallback).
- `settings.ts` — Source connection cards.
- `freshness.ts` — Per-source sync run health from `sync_runs` table.
- `fallback.ts` — `DataMode` type, `combineDataModes()`, `warnFallback()` utilities.

The dashboard should read from Supabase when credentials and rows exist. If credentials are missing or tables are empty, it falls back to mock data. The most important rule is: **do not mix fake rows with live data for the same source.**

### Mock Fallback System

Mock data lives in `src/lib/mock-data.ts`. It is allowed for local demo/empty mode, especially for disconnected sources, but it must not be presented as real live data.

Recent guardrails:

- Revenue uses live Stripe rows when any displayable Stripe data exists.
- Revenue filters out Stripe CLI/test/placeholder rows from business display:
  - `stripe@example.com`
  - `unknown@soundev.local`
  - Stripe raw events with `livemode === false`
- If live Stripe rows exist but all are filtered out as test data, Revenue shows empty partial/live state instead of falling back to fake mock rows.

### Supabase Clients

Supabase helpers:

- `src/lib/supabase/client.ts` - browser/client-safe setup if needed
- `src/lib/supabase/server.ts` - anon server client
- `src/lib/supabase/admin.ts` - service role/admin client

Important: private dashboard reads should prefer server-side/service-role reads where appropriate. Never expose service role keys or Stripe/Meta tokens client-side.

### Sync Routes

API routes:

- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/sync/stripe/route.ts`
- `src/app/api/sync/meta/route.ts`
- `src/app/api/sync/ghl/route.ts`
- `src/app/api/health/stripe/route.ts`
- `src/app/api/debug/data-status/route.ts`

Sync routes write to Supabase using the service-role client when configured. They must not expose secrets.

### Diagnostics Page

Diagnostics route:

- `/settings/diagnostics`
- File: `src/app/settings/diagnostics/page.tsx`
- Data helper: `src/lib/diagnostics.ts`

It shows env detection, admin client availability, last sync run, last Stripe transaction, last failed payment, last refund, latest Meta sync, latest Meta metric row, latest GoHighLevel sync/contact/opportunity rows, and error states. It never shows secret values.

### Source Freshness System

Source freshness helpers:

- `src/lib/data/freshness.ts`
- `src/components/dashboard/source-freshness.tsx`

This reads `sync_runs` and `source_connections` to show freshness/status per source.

### Recommendations Engine

Recommendations live in:

- `src/lib/recommendations.ts`

It generates practical recommendations based on CPA, ROAS, refund rate, failed payment rate, Meta/Stripe mismatch, missing Meta revenue, low UTM coverage, promising ads, and losing ads.

### Measurement and Source-of-Truth Layer

Phase 8 added a planning/accuracy layer:

- `MEASUREMENT_PLAN.md` - full metric definitions, Morning Brief blueprint, GHL capability audit checklist, GA4 readiness plan, and diagnostics roadmap.
- `SOURCE_OF_TRUTH.md` - source ownership rules and missing-data labeling rules.
- `src/lib/business-settings.ts` - locked business settings and cents-based calculation helpers.
- `src/lib/metric-definitions.ts` - typed core metric definitions.
- `src/lib/source-of-truth.ts` - source map and dashboard data rules.
- `src/lib/data-confidence.ts` - missing-data states and confidence helpers.

These modules are intentionally pure helpers. They do not connect new APIs and they do not change Stripe, Meta, or GoHighLevel sync behavior.

## 4. Environment Variables

Current `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=
GHL_API_KEY=
GHL_LOCATION_ID=
```

Descriptions:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL. Public identifier, safe for browser use.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key. Public-safe only if RLS policies are safe.
- `SUPABASE_SERVICE_ROLE_KEY` - Server-only Supabase admin key. Never expose to browser.
- `STRIPE_SECRET_KEY` - Server-only Stripe secret key for webhooks/backfill.
- `STRIPE_WEBHOOK_SECRET` - Server-only Stripe webhook signing secret.
- `META_ACCESS_TOKEN` - Server-only Meta Marketing API token.
- `META_AD_ACCOUNT_ID` - Meta ad account ID. May need `act_` prefix depending on usage.
- `GHL_API_KEY` - Server-only GoHighLevel/LeadConnector Private Integration token.
- `GHL_LOCATION_ID` - GoHighLevel location/sub-account ID to sync.

Do not include real values in docs, code, logs, or client bundles.

## 5. Completed Phases

### Phase 1: Initial Dashboard Shell and Mock UI

Built the first dashboard prototype with dark UI, sidebar navigation, KPI cards, chart cards, data tables, status badges, and realistic mock data.

Pages created:

- Overview
- Revenue
- Meta Ads
- Funnel
- Creative Tracker
- Instagram
- Settings

### Phase 1.5: Business-Friendly Metrics and Data Health

Added helper text/tooltips for business metrics, date selector UI, warning callouts, Next Actions, Data Health, UTM coverage, and metric tests.

### Phase 2: Supabase Optional Setup and Schema

Added Supabase-ready structure without requiring credentials:

- Supabase clients
- `.env.example`
- `supabase/schema.sql`
- TypeScript table types in `src/lib/types.ts`
- mock data updated toward table-compatible shapes

### Phase 3: Stripe Webhook Foundation

Added Stripe SDK and webhook foundation:

- Webhook route: `/api/webhooks/stripe`
- Handles successful payments, failed payments, refunds
- Writes to `transactions`, `failed_payments`, `refunds`, `sync_runs`
- Gracefully skips when credentials are missing

### Phase 4: Supabase Read Layer with Mock Fallback

Added server-side data readers with mock fallback:

- `src/lib/data/revenue.ts`
- `src/lib/data/ads.ts`
- `src/lib/data/funnel.ts`
- `src/lib/data/creative.ts`
- `src/lib/data/instagram.ts`
- `src/lib/data/overview.ts`
- `src/lib/data/fallback.ts`

### Phase 5: Diagnostics and Stripe Health Checks

Added:

- `/settings/diagnostics`
- `/api/health/stripe`
- README/setup diagnostics guidance

### Phase 6: Meta Ads Marketing API Sync Foundation

Added direct Meta Marketing API helpers and manual sync endpoint:

- `src/lib/meta/client.ts`
- `src/lib/meta/sync.ts`
- `/api/sync/meta`

Writes Meta campaigns, ad sets, ads, daily metrics, and sync runs into Supabase.

### Phase 6B: Meta Live Rendering and Stripe Historical Backfill

Added:

- Meta Ads live rendering from Supabase
- Stripe historical backfill route: `/api/sync/stripe`
- `src/lib/stripe/sync.ts`
- migration: `supabase/migrations/phase-6b-stripe-backfill.sql`

### Phase 7A: Dashboard Intelligence and Data Trust Upgrade

Added:

- Recommendations engine
- Source freshness cards
- Overview Stripe fee estimate
- Break-even CPA
- Meta/Stripe mismatch detection
- Meta ad status labels
- Revenue filters/search
- Compact Stripe IDs in Revenue table
- Data mode improvements
- Guardrails against fake Stripe rows mixing with live Stripe data

### Phase 7A.1: Data Source Honesty Cleanup

Added Overview source labels, Data Trust panel, UTM attribution warning, and guardrails so mock GoHighLevel funnel numbers are not shown as real before GHL is connected.

### Phase 7B: GoHighLevel Integration Foundation

Added:

- `src/lib/ghl/client.ts`
- `src/lib/ghl/sync.ts`
- `/api/sync/ghl`
- `supabase/migrations/phase-7b-ghl-foundation.sql`
- GoHighLevel diagnostics
- Funnel live data reader for `ghl_contacts` and `ghl_opportunities`
- README/handoff instructions for manual sync

The sync uses a server-only `GHL_API_KEY` and `GHL_LOCATION_ID`, pulls contacts and opportunities where supported, upserts by `external_id`, and writes `sync_runs`. Activity/event history is not ingested yet; `eventsSynced` returns `0`.

### Phase 7C: Soundev Visual Theme Refresh

Completed a visual-only refresh based on the black void / electric-blue glowing figure direction.

Updated:

- `src/app/globals.css` theme tokens, global background, selection color, focus states, and reusable Soundev classes
- layout shell background/text treatment
- Sidebar active states and brand block
- Header/date range controls
- KPI cards
- Data tables
- Data mode/status badges
- Source freshness cards
- Alert callouts
- Next Actions panel
- Data Trust panel
- Data Health panel
- Source connection cards
- Chart cards and chart renderer colors
- Revenue filter/search controls
- Settings/diagnostics card shells

This phase did not change business logic, data readers, Supabase schema, Stripe sync, Meta sync, GoHighLevel sync, mock fallback behavior, or tests.

### Phase 8: Measurement Plan and Source-of-Truth Lockdown

Added a planning and accuracy layer so the dashboard cannot quietly present assumptions as facts.

New documents:

- `MEASUREMENT_PLAN.md`
- `SOURCE_OF_TRUTH.md`

New code contracts:

- `src/lib/business-settings.ts` - locked reporting settings, known fixed expenses, daily targets, cents-based fee/profit/CPA/ROAS helpers.
- `src/lib/metric-definitions.ts` - definitions for every core metric, including source of truth, formula, classification, required fields, freshness, missing-data behavior, and caveats.
- `src/lib/source-of-truth.ts` - source ownership map and global no-mock/no-assumption data rules.
- `src/lib/data-confidence.ts` - missing-data display states, confidence scoring, and mock-business-data guard helper.

Business settings locked:

- Default reporting window: last 24 hours
- Timezone: America/Chicago
- Monthly revenue goal: $30,000
- Product price: $67
- Landing page: https://drums.soundev.shop/
- Known fixed software expenses: GoHighLevel $97/month, ChatGPT $20/month
- Daily fixed allocation: about $3.90/day
- Daily revenue pace target: about $1,000/day
- Daily purchase pace target: about 15 purchases/day

Source-of-truth map:

- Stripe: purchases, gross revenue, net revenue, refunds, failed payments, customer payment records, payment timestamps.
- Meta Ads: spend, impressions, reach, clicks, CTR, CPC, CPM, campaign/ad set/ad performance, Meta-reported purchases as attribution comparison only.
- GoHighLevel: contacts/leads, forms if exposed, opportunities, source/custom fields, UTM fields if stored, funnel records if exposed.
- GA4: future source for landing page views, CTA clicks, video interactions, checkout starts, and page/funnel behavior.
- Manual settings: product price, goals, known fixed expenses, and future manual expenses.

Dashboard truth rules added:

- No fake/mock business data in real dashboard UI.
- No silent assumptions.
- No test API keys or temporary credentials presented as production-ready.
- Every metric needs a source label.
- Every estimated metric needs an estimated label.
- Every unavailable metric needs a reason.
- Never mix mock rows with live rows.

Morning Brief direction:

- Overview should evolve into a last-24-hours Morning Brief in America/Chicago.
- It should show net revenue, ad spend, estimated profit, purchases, blended CPA, blended ROAS, daily revenue goal progress, and daily purchase goal progress.
- It should generate a plain-English summary and 3 to 5 action items based only on verified data.
- It must show GA4-dependent metrics as unavailable until GA4 is actually connected and event tracking is verified.

GA4 plan:

- GA4 is not connected yet.
- Required future events: `landing_page_view`, `primary_cta_click`, video milestones, `checkout_start`, and `purchase` for comparison only.
- Required parameters: page URL/path, referrer, UTM fields, `fbclid`, device, and country.

GHL capability audit plan:

- Verify whether the API can expose contacts, opportunities, forms, form submissions, funnels, funnel pages, payments/orders, transactions, custom fields, attribution/source fields, UTM fields, page/funnel analytics, Google Analytics-connected metrics, and Meta dashboard-connected metrics.
- Do not assume the GHL API exposes the same analytics shown in the GHL dashboard UI.
- If GHL cannot expose landing page analytics, GA4 direct tracking is required.

Cashflow/expense plan:

- Current profit remains estimated.
- Stripe fees use a default estimate of 2.9% + $0.30 per successful transaction.
- Fixed expense allocation covers known software only and is not full accounting.

## 6. Current Integrations

### Stripe

Webhook route:

- `/api/webhooks/stripe`

Historical sync route:

- `/api/sync/stripe`

Tables written:

- `transactions`
- `failed_payments`
- `refunds`
- `sync_runs`

Events handled:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `refund.created`

What works right now:

- Webhook foundation works.
- Historical backfill works.
- Diagnostics can see latest Stripe rows.
- `/revenue` reads live Stripe data server-side.
- Revenue filters out Stripe CLI/test rows and placeholder emails from business display.

Known issue/watchout:

- Remaining mock Stripe leakage was recently addressed, but should be re-verified after future changes.
- Test rows can still exist in Supabase. They are hidden from business display, not deleted.
- UTM fields are often empty because GHL/Stripe metadata is not yet passing attribution cleanly.

### Meta Ads

Sync route:

- `/api/sync/meta`

API fields pulled:

- campaigns
- ad sets
- ads
- insights including spend, impressions, clicks, CTR, CPC, CPM, actions, action values, purchase ROAS, date start/stop

Tables written:

- `ad_campaigns`
- `ad_sets`
- `ads`
- `ad_daily_metrics`
- `sync_runs`

Diagnostics behavior:

- `/settings/diagnostics` shows latest Meta sync, latest metric row, and error state.

What works right now:

- Manual Meta sync works.
- `/meta-ads` renders live Supabase Meta rows when `ad_daily_metrics` has rows.
- Stable row IDs were addressed for duplicate campaign/ad/adset names.

Known issue/watchout:

- Meta ad-level revenue may be zero if `action_values` are not available.
- Meta can report purchases without revenue/action values.
- Always verify table keys stay based on IDs/dates, not visible names.

### GoHighLevel

Sync route:

- `/api/sync/ghl`

API behavior:

- Uses the current GoHighLevel/LeadConnector API with `Authorization: Bearer ${GHL_API_KEY}` and `Version: 2021-07-28`.
- Reads contacts through `/contacts/search`.
- Reads opportunities through `/opportunities/search`.
- Events/activities are not synced yet; `eventsSynced` is currently `0`.

Tables written:

- `ghl_contacts`
- `ghl_opportunities`
- `sync_runs`

Diagnostics behavior:

- `/settings/diagnostics` shows GoHighLevel env detection, latest GHL sync run, latest contact, latest opportunity, and last error state.

What works right now:

- Manual sync foundation exists.
- `/funnel` reads live GoHighLevel contacts/opportunities when rows exist.
- Overview shows real leads, opportunity/checkout proxy metrics, and lead-to-purchase only when GoHighLevel rows exist.

Known issue/watchout:

- GoHighLevel field shapes vary across accounts and API versions; verify contact/opportunity mappings against the production location.
- UTM fields depend on the funnel passing attribution into GoHighLevel.
- No scheduled sync exists yet.

### Supabase

Schema files:

- `supabase/schema.sql`
- `supabase/migrations/phase-6b-stripe-backfill.sql`
- `supabase/migrations/phase-7b-ghl-foundation.sql`

Important tables:

- Stripe: `transactions`, `failed_payments`, `refunds`
- Meta: `ad_campaigns`, `ad_sets`, `ads`, `ad_daily_metrics`
- GoHighLevel: `ghl_contacts`, `ghl_opportunities`, `funnel_events`
- Notion placeholder: `notion_creatives`
- Instagram placeholder: `instagram_daily_metrics`
- Operations: `source_connections`, `sync_runs`

Live/mock fallback rules:

- If a source has usable live rows, use live rows.
- If a source query fails or all relevant tables are empty, use mock fallback.
- Never append mock rows to live rows.
- Never make fake rows look like real business data.

## 7. Important Supabase Tables

- `transactions` - successful Stripe payments and purchase records.
- `failed_payments` - failed Stripe payment intents/declines.
- `refunds` - Stripe refunds.
- `ad_campaigns` - Meta campaign metadata.
- `ad_sets` - Meta ad set metadata.
- `ads` - Meta ad metadata and creative angle.
- `ad_daily_metrics` - Meta daily performance rows by ad/date.
- `sync_runs` - sync history and status for Stripe/Meta/GoHighLevel/future integrations.
- `source_connections` - future connection/freshness metadata for source cards.
- `ghl_contacts` - GoHighLevel contacts/leads with attribution fields, tags, custom fields, and raw source payload.
- `ghl_opportunities` - GoHighLevel pipeline/opportunity rows with stage/status/value fields and raw source payload.
- `funnel_events` - future funnel stage events from GoHighLevel. It is not written in Phase 7B.
- `notion_creatives` - future Notion creative tracker rows.
- `instagram_daily_metrics` - future Instagram account/content metrics.

## 8. Current Pages

### `/`

Current data source:

- Stripe via `getRevenueData`
- Meta via `getAdsData`
- GoHighLevel via `getFunnelData` when contacts/opportunities exist
- Creative/Instagram/source-health can still use mock fallback

Live or mock:

- Partial live when Stripe/Meta/GoHighLevel are mixed with disconnected sources.

Needs work:

- Continue verifying no disconnected source shows fake metrics as real.
- Add real date range filtering across all live sources.

### `/revenue`

Current data source:

- Supabase Stripe tables: `transactions`, `failed_payments`, `refunds`
- Falls back to mock only when no live Stripe rows exist or Supabase is unavailable.

Live or mock:

- Live when displayable Stripe rows exist.
- Partial when only non-business/test rows exist.

Needs work:

- Continue verifying no test rows or placeholder emails appear.
- Eventually add date range filtering against real event timestamps.

### `/meta-ads`

Current data source:

- Supabase Meta tables: `ad_daily_metrics`, `ads`, `ad_sets`, `ad_campaigns`

Live or mock:

- Live when metric rows and joins exist.
- Partial live when metrics exist but joins are incomplete.
- Mock only when `ad_daily_metrics` is empty or Supabase is unavailable.

Needs work:

- Revenue/action values may be zero depending on Meta tracking.
- Add stronger date range handling.

### `/funnel`

Current data source:

- Supabase GoHighLevel tables: `ghl_contacts`, `ghl_opportunities`
- Stripe purchase counts where useful for lead-to-purchase context

Live or mock:

- Live when `ghl_contacts` rows exist.
- Partial when only `ghl_opportunities` rows exist.
- Mock only when no live GoHighLevel rows exist or Supabase is unavailable.

Needs work:

- Add deeper funnel event/activity ingestion when the schema and GHL endpoint behavior are confirmed.
- Add date range filtering.

### `/creative-tracker`

Current data source:

- Mock Notion-style data.

Live or mock:

- Mock.

Needs work:

- Notion integration not connected.

### `/instagram`

Current data source:

- Mock Instagram-style data.

Live or mock:

- Mock.

Needs work:

- Instagram integration not connected.

### `/settings`

Current data source:

- Source connection cards, mostly mock/placeholder with env-aware Stripe state.

Live or mock:

- Mixed setup state.

Needs work:

- Make connection statuses fully driven by `source_connections` plus env/sync state.

### `/settings/diagnostics`

Current data source:

- Server-side diagnostics using Supabase service role when available.

Live or mock:

- Live diagnostics if env vars are configured.

Needs work:

- Add more source-specific troubleshooting as integrations expand.

## 9. Current Known Issues / Watchouts

- Some pages may still show mock data while live data exists. This must be prevented.
- Overview should show GoHighLevel funnel metrics only when GHL rows exist.
- Funnel metrics should show live, partial, or mock mode clearly.
- UTM coverage is currently often 0%, likely because GHL/Stripe metadata is not passing UTMs.
- Meta may track purchases but not revenue/action_values.
- Hydration warnings can be caused by browser extensions like Grammarly and can be silenced with `suppressHydrationWarning`.
- Never expose secret keys client-side.
- Never put tokens in `NEXT_PUBLIC` variables unless they are safe public keys.
- Keep mock fallback for demo/empty mode, but never mix fake rows with live data.
- Do not change Stripe webhook/backfill behavior unless explicitly requested.
- Do not change Meta sync behavior unless explicitly requested.
- The new theme is tokenized, but some page-level copy/layout can still be refined after seeing real production data density.
- Cross-device visual QA should be repeated before deployment once real production data density is known.

## 10. Current Best Next Task

Recommended next task: **Phase 8B: Morning Brief UI and Last-24-Hour Activation**

Goal:

- Use the Phase 8 measurement contract to make the Overview page default to a trustworthy Morning Brief.
- Filter live Stripe, Meta, and GoHighLevel reads to the last 24 hours in America/Chicago.
- Show source labels, estimated labels, and missing-data reasons on every top-line metric.
- Keep GA4-dependent metrics unavailable until GA4 is actually connected and event tracking is verified.
- Do not add Notion, Instagram, auth, deployment, or scheduled syncs yet.

Use this exact prompt:

```text
Implement Phase 8B: Morning Brief UI and Last-24-Hour Activation.

Goals:
1. Turn Overview into the Morning Brief defined in MEASUREMENT_PLAN.md.
2. Default reporting to the last 24 hours in America/Chicago.
3. Use Phase 8 source-of-truth rules for every metric display.

Tasks:
1. Read MEASUREMENT_PLAN.md and SOURCE_OF_TRUTH.md before changing code.
2. Add a reusable Morning Brief data shape using Stripe, Meta, GoHighLevel, and manual settings only.
3. Apply last-24-hour filtering to Overview data without changing sync routes.
4. Show unavailable states for GA4-only metrics: landing page views, CTA clicks, and verified checkout starts.
5. Label estimated profit, blended CPA, blended ROAS, and goal progress as estimated/directional where appropriate.
6. Generate a plain-English summary and 3 to 5 action items based only on verified data.
7. Add tests for date filtering, missing-data states, and no recommendations from missing data.
8. Run:
   npm test
   npm run lint
   npm run build

Important:
Do not add GA4 API integration yet.
Do not add scheduled sync.
Do not change Stripe, Meta, or GoHighLevel sync behavior.
Do not mix mock rows with live rows.
```

## 11. Roadmap After Phase 8

Recommended order:

1. Phase 8B: Morning Brief UI and last-24-hour activation
2. Phase 8C: GoHighLevel capability audit and field validation
3. Phase 8D: GA4 tracking specification and tag plan
4. Phase 9: Basic auth / password gate
5. Phase 10: Deploy to Vercel
6. Phase 11: Scheduled syncs
7. Phase 12: Notion creative tracker integration
8. Phase 13: Instagram insights

## 12. Git Workflow

- Always run tests/lint/build before commit.
- Commit after each stable phase.
- Push to GitHub.
- Never commit `.env.local`.
- Keep commits scoped and descriptive.
- Do not revert user changes unless explicitly asked.

Current GitHub repo:

```text
https://github.com/XxKaanxX23/soundev-dashboard.git
```

## 13. Commands

Local dev:

```powershell
npm run dev
```

Verification:

```powershell
npm test
npm run lint
npm run build
```

Meta sync:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/sync/meta"
```

GoHighLevel sync:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/sync/ghl"
```

Stripe historical sync:

```powershell
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/sync/stripe" `
  -ContentType "application/json" `
  -Body '{"days":90}'
```

Diagnostics:

```text
http://localhost:3000/settings/diagnostics
```

Stripe CLI local webhook testing:

```powershell
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Then trigger Stripe test events from another terminal as needed.

Git:

```powershell
git status
git add .
git commit -m "Describe the stable phase"
git push
```

## 14. Agent Instructions

Next coding agent:

- Read this file first.
- Inspect current code before changing anything.
- Do not assume mock data is safe to display with live data.
- Prefer small phases.
- Keep tests passing.
- Keep secrets server-side.
- Preserve mock fallback for empty/demo mode.
- Do not add multiple integrations in one pass unless explicitly requested.
- Explain changes clearly after implementation.
- Before touching Next.js App Router behavior, read the relevant local docs under `node_modules/next/dist/docs/` because this project uses a newer Next.js version.
- For business data, always ask: "Is this live, mock, partial, unavailable, or test data?" The UI should make that answer clear.

## 15. Phase 7D Changelog

### Root Cause Fix

The 'Partial Live Data' false positive on the Overview page was caused by passing the combined page mode to SourceFreshness badges instead of source-specific modes. Fix: getOverviewData() now returns revenueMode and adsMode which are passed directly to Stripe and Meta badges.

### Data Mode Rules

- Stripe: transactions > 0 = live. Only failed/refund rows = partial. No rows = mock.
- Meta Ads: ad_daily_metrics > 0 with joins = live. Metrics exist, joins missing = partial. No metrics = mock.
- GHL: contacts > 0 = live. Contacts = 0 = partial. No rows = mock.

### New Features

- metaRevenueWarning flag when Meta spend exists but revenue_cents = 0 (banner shown, mode unchanged)
- opportunitiesNote for GHL live mode with zero opportunities
- 5 new chart types across Overview, Revenue, Meta Ads, and Funnel pages
- MultiBarChartCard and ComposedChartCard new components
- Diagnostics: Row Counts and Field Coverage sections

### Verification

68 tests passing. Lint clean. Build success.
