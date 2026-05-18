# Soundev Dashboard Project Handoff

## 1. Project Overview

**Name:** Soundev Dashboard

**Business:** Soundev sells Drum Mastery Suite, a digital drum workflow system for music producers.

**Product price:** $67

**Purpose:** Private analytics dashboard for combining Stripe, Meta Ads, GoHighLevel, Notion, and Instagram data into one practical business command center.

**Main goal:** Stop checking multiple dashboards manually and make better decisions about revenue, ads, funnel performance, creative testing, attribution, and operational next actions.

The app started as a clean mock-data prototype and has progressed into a Supabase-ready dashboard with live Stripe and Meta Ads foundations. GoHighLevel, Notion, Instagram, auth, deployment, and scheduled syncs are not connected yet.

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
- `/funnel` - GoHighLevel-style funnel placeholder/mock page
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
- `src/app/api/health/stripe/route.ts`
- `src/app/api/debug/data-status/route.ts`

Sync routes write to Supabase using the service-role client when configured. They must not expose secrets.

### Diagnostics Page

Diagnostics route:

- `/settings/diagnostics`
- File: `src/app/settings/diagnostics/page.tsx`
- Data helper: `src/lib/diagnostics.ts`

It shows env detection, admin client availability, last sync run, last Stripe transaction, last failed payment, last refund, latest Meta sync, latest Meta metric row, and error states. It never shows secret values.

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
```

Descriptions:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL. Public identifier, safe for browser use.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key. Public-safe only if RLS policies are safe.
- `SUPABASE_SERVICE_ROLE_KEY` - Server-only Supabase admin key. Never expose to browser.
- `STRIPE_SECRET_KEY` - Server-only Stripe secret key for webhooks/backfill.
- `STRIPE_WEBHOOK_SECRET` - Server-only Stripe webhook signing secret.
- `META_ACCESS_TOKEN` - Server-only Meta Marketing API token.
- `META_AD_ACCOUNT_ID` - Meta ad account ID. May need `act_` prefix depending on usage.

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

### Supabase

Schema files:

- `supabase/schema.sql`
- `supabase/migrations/phase-6b-stripe-backfill.sql`

Important tables:

- Stripe: `transactions`, `failed_payments`, `refunds`
- Meta: `ad_campaigns`, `ad_sets`, `ads`, `ad_daily_metrics`
- GHL placeholders: `ghl_contacts`, `ghl_opportunities`, `funnel_events`
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
- `sync_runs` - sync history and status for Stripe/Meta/future integrations.
- `source_connections` - future connection/freshness metadata for source cards.
- `ghl_contacts` - future GoHighLevel contacts/leads.
- `ghl_opportunities` - future GoHighLevel pipeline/opportunity rows.
- `funnel_events` - future funnel stage events from GoHighLevel.
- `notion_creatives` - future Notion creative tracker rows.
- `instagram_daily_metrics` - future Instagram account/content metrics.

## 8. Current Pages

### `/`

Current data source:

- Stripe via `getRevenueData`
- Meta via `getAdsData`
- Funnel/creative/source-health can still use mock fallback

Live or mock:

- Partial live when Stripe/Meta exist and other sources are mock.

Needs work:

- Must stop showing fake funnel metrics as real while GoHighLevel is not connected.
- Needs clearer per-KPI source trust labels.

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

- Mock GoHighLevel-style data.

Live or mock:

- Mock.

Needs work:

- GoHighLevel integration not connected.
- Should not be used as real funnel truth yet.

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
- Overview may show funnel metrics like Leads or Checkout Starts even though GoHighLevel is not connected.
- Funnel metrics should show `Not connected` or `Unavailable` until GoHighLevel is live.
- UTM coverage is currently often 0%, likely because GHL/Stripe metadata is not passing UTMs.
- Meta may track purchases but not revenue/action_values.
- Hydration warnings can be caused by browser extensions like Grammarly and can be silenced with `suppressHydrationWarning`.
- Never expose secret keys client-side.
- Never put tokens in `NEXT_PUBLIC` variables unless they are safe public keys.
- Keep mock fallback for demo/empty mode, but never mix fake rows with live data.
- Do not change Stripe webhook/backfill behavior unless explicitly requested.
- Do not change Meta sync behavior unless explicitly requested.

## 10. Current Best Next Task

Recommended next task: **Phase 7A.1: Data Source Honesty Cleanup**

Goal:

- Stop showing fake funnel metrics before GoHighLevel is connected.
- Make source trust clear on every KPI.
- Add Data Trust section.
- Make UTM attribution warning clear.
- Prevent mock rows from mixing with live Stripe/Meta data.

Use this exact prompt:

```text
Implement Phase 7A.1: Data Source Honesty Cleanup.

Current issue:
Overview now shows live Stripe and Meta data, but it may still display funnel metrics like Leads and Checkout Starts before GoHighLevel is connected. This can mislead the user because Stripe and Meta are live, but funnel data is not.

Goals:
1. Prevent mock funnel numbers from appearing as real on the Overview page.
2. Make every KPI clearly tied to its source.
3. Keep the dashboard trustworthy before adding GoHighLevel.

Tasks:
1. Audit Overview page metrics:
   - Leads
   - Lead-to-purchase
   - Checkout starts
   - UTM coverage
   - purchases
   - revenue
   - spend
   - profit

2. If GoHighLevel live data is not connected:
   - Do not show fake lead counts as real.
   - Show Leads as "Not connected" or "Connect GHL".
   - Show Lead-to-purchase as "Unavailable".
   - Show Checkout Starts as "Unavailable" unless derived from real Stripe or Meta data.
   - Add helper text explaining that funnel metrics require GoHighLevel sync.

3. Add per-card source labels where helpful:
   - Revenue source: Stripe
   - Spend source: Meta Ads
   - Funnel source: GoHighLevel, not connected
   - Creative source: Notion, not connected

4. Make UTM coverage clear:
   - If Stripe live data exists but UTM coverage is 0%, show a warning:
     "Stripe purchases are live, but UTM attribution is missing. Check whether GoHighLevel passes UTM fields into Stripe metadata."

5. Add a Data Trust section:
   - Stripe: live
   - Meta Ads: live / partial
   - GoHighLevel: not connected
   - Notion: not connected
   - Instagram: not connected

6. Add tests:
   - Overview does not display mock lead count when GHL is not connected.
   - Overview shows unavailable state for lead-to-purchase without GHL.
   - UTM warning appears when live Stripe purchases have 0% UTM coverage.
   - Revenue and spend still render from Stripe/Meta live data.

7. Run:
   npm test
   npm run lint
   npm run build

Important:
Do not add GoHighLevel yet.
Do not remove mock mode from disconnected pages.
Do not change Stripe sync.
Do not change Meta sync.
```

## 11. Roadmap After Phase 7A.1

Recommended order:

1. Phase 7B: GoHighLevel integration
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
