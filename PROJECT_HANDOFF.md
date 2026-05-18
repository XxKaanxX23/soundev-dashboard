# Soundev Dashboard Project Handoff

## 1. Project Overview

**Name:** Soundev Dashboard

**Business:** Soundev sells Drum Mastery Suite, a digital drum workflow system for music producers.

**Product price:** $67

**Purpose:** Private analytics dashboard for combining Stripe, Meta Ads, GoHighLevel, Notion, and Instagram data into one practical business command center.

**Main goal:** Stop checking multiple dashboards manually and make better decisions about revenue, ads, funnel performance, creative testing, attribution, and operational next actions.

The app started as a clean mock-data prototype and has progressed into a Supabase-ready dashboard with live Stripe, Meta Ads, and GoHighLevel foundations. Notion, Instagram, auth, deployment, and scheduled syncs are not connected yet.

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

- `sidebar.tsx`
- `header.tsx`
- `date-range-selector.tsx`
- `data-mode-badge.tsx`
- `data-table.tsx`
- `kpi-card.tsx`
- `line-chart-card.tsx`
- `bar-chart-card.tsx`
- `status-badge.tsx`
- `source-connection-card.tsx`
- `source-freshness.tsx`
- `data-health-panel.tsx`
- `next-actions-panel.tsx`
- `alert-callout.tsx`
- `page-section.tsx`

### Data Access Layer

Server-side data readers live under `src/lib/data`:

- `revenue.ts`
- `ads.ts`
- `funnel.ts`
- `creative.ts`
- `instagram.ts`
- `overview.ts`
- `settings.ts`
- `freshness.ts`
- `fallback.ts`

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

## 10. Current Best Next Task

Recommended next task: **Phase 7B.1: GoHighLevel Field Validation and Attribution QA**

Goal:

- Run the manual GoHighLevel sync against the production location.
- Compare normalized contacts/opportunities against GoHighLevel UI records.
- Confirm UTM/custom field mapping.
- Decide whether `funnel_events` can be populated safely or whether a dedicated activity table is needed.
- Keep mock/live honesty rules intact.

Use this exact prompt:

```text
Implement Phase 7B.1: GoHighLevel field validation and attribution QA.

Goals:
1. Verify Phase 7B GoHighLevel sync output against real GoHighLevel records.
2. Harden field mappings for contacts, opportunities, custom fields, tags, and UTM attribution.
3. Keep Overview/Funnel source honesty intact.

Tasks:
1. Run manual GoHighLevel sync with production env vars.
2. Inspect latest `ghl_contacts`, `ghl_opportunities`, and `sync_runs` rows.
3. Compare normalized dashboard rows to GoHighLevel UI data.
4. Improve mapping only where verified by real payload shape.
5. Decide whether activity/funnel events can safely populate `funnel_events`; if not, document the limitation.
6. Add tests for any mapping changes.
7. Run:
   npm test
   npm run lint
   npm run build

Important:
Do not expose GHL_API_KEY client-side.
Do not change Stripe or Meta sync behavior.
Do not add scheduled sync yet.
```

## 11. Roadmap After Phase 7B

Recommended order:

1. Phase 7B.1: GoHighLevel field validation and attribution QA
2. Phase 8: Notion creative tracker integration
3. Phase 9: Basic auth / password gate
4. Phase 10: Deploy to Vercel
5. Phase 11: Scheduled syncs
6. Phase 12: Instagram insights

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
