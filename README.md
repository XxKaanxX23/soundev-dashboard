# Soundev Dashboard

Private analytics dashboard prototype for Soundev's Drum Mastery Suite.

This app supports mock/demo mode plus optional server-side live reads from Supabase. Stripe, Meta Ads, and GoHighLevel integration foundations are in place. Notion, Instagram, authentication, deployment, and scheduled syncs are not connected yet.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app does not require Supabase environment variables for local mock mode.

## Supabase Prep

Phase 2 adds Supabase-ready structure without requiring a live Supabase project.

### Create A Supabase Project

1. Go to [supabase.com](https://supabase.com).
2. Create a new project.
3. Open the project dashboard.
4. Go to `SQL Editor`.
5. Paste the contents of `supabase/schema.sql`.
6. Run the SQL to create the database tables, indexes, and `updated_at` triggers.

### Environment Variables

Copy `.env.example` to `.env.local` when you are ready to point the app at a Supabase project:

```bash
cp .env.example .env.local
```

Then add:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

These values come from Supabase project settings under `API`.

### Current Supabase Behavior

The Supabase client helpers live in:

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`

Both helpers return `null` when env vars are missing. That is intentional so the dashboard keeps running locally with mock data.

The app still runs without credentials. When Supabase or integration env vars are missing, pages use mock fallback or show disconnected states.

## Stripe Webhook Foundation

Phase 3 adds a Stripe webhook endpoint and event mapping, but it still does not require real Stripe or Supabase credentials to run the dashboard locally.

Stripe is intended to be the source of truth for:

- successful payments
- failed payments
- refunds

### Environment Variables

Add these to `.env.local` when you are ready to test real Stripe webhooks:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not prefix Stripe secret keys with `NEXT_PUBLIC_`. They must stay server-only.

`SUPABASE_SERVICE_ROLE_KEY` is only used by the server-side webhook route to write verified Stripe events into Supabase. The app still works without it; verified events will be acknowledged but not stored.

## Meta Ads Sync Foundation

Phase 6 adds a manual server-side Meta Marketing API sync endpoint. It does not add scheduled jobs and does not connect Notion or Instagram.

### Meta Environment Variables

Add these to `.env.local` when you are ready to test Meta sync:

```bash
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=
```

Do not prefix the Meta token with `NEXT_PUBLIC_`. It must stay server-only.

### Create A Meta Developer App

1. Go to the Meta for Developers dashboard.
2. Create an app for business/marketing API use.
3. Add Marketing API access.
4. Generate an access token with the `ads_read` permission.
5. Confirm the token can read the ad account you want to sync.

### Find The Ad Account ID

Use Meta Ads Manager or Business Settings to find the ad account ID. The sync helper accepts either:

```bash
META_AD_ACCOUNT_ID=1234567890
```

or:

```bash
META_AD_ACCOUNT_ID=act_1234567890
```

The implementation normalizes the value to the `act_` format for Graph API calls.

### Run Manual Meta Sync Locally

Start the app:

```bash
npm run dev
```

Trigger a manual sync:

```bash
curl -X POST http://localhost:3000/api/sync/meta
```

The sync pulls the last 7 days by default from:

- `/{ad_account_id}/campaigns`
- `/{ad_account_id}/adsets`
- `/{ad_account_id}/ads`
- `/{ad_account_id}/insights`

It upserts into:

- `ad_campaigns`
- `ad_sets`
- `ads`
- `ad_daily_metrics`
- `sync_runs`

Check `/settings/diagnostics` after running the sync. The diagnostics page shows whether Meta env vars are detected, the last Meta sync run, the latest metric row, and any last sync error state.

## GoHighLevel Sync Foundation

Phase 7B adds a manual server-side GoHighLevel/LeadConnector sync endpoint for funnel contacts and opportunities. It does not add scheduled jobs, auth, Notion, or Instagram.

### GoHighLevel Environment Variables

Add these to `.env.local` when you are ready to test GoHighLevel sync:

```bash
GHL_API_KEY=
GHL_LOCATION_ID=
```

Do not prefix the GoHighLevel API key with `NEXT_PUBLIC_`. It must stay server-only.

### Create A Private Integration Token

1. In GoHighLevel/LeadConnector, open the target sub-account/location.
2. Create or locate a Private Integration token with contact and opportunity read access.
3. Copy the token into `GHL_API_KEY`.
4. Copy the location/sub-account ID into `GHL_LOCATION_ID`.

The sync helper sends:

```text
Authorization: Bearer ${GHL_API_KEY}
Version: 2021-07-28
```

### Run Manual GoHighLevel Sync Locally

Start the app:

```bash
npm run dev
```

Trigger a manual sync:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/sync/ghl"
```

The sync pulls contacts and opportunities where supported, then upserts into:

- `ghl_contacts`
- `ghl_opportunities`
- `sync_runs`

`eventsSynced` currently returns `0` because the current implementation does not safely ingest GoHighLevel activity/event history yet. The `funnel_events` table exists for a later phase.

Check `/settings/diagnostics` after running the sync. Diagnostics shows GoHighLevel env detection, latest GHL sync run, latest contact, latest opportunity, and last error state. The Funnel page uses live GoHighLevel rows when they exist and otherwise falls back to mock/demo mode.

### Webhook Endpoint

Create a Stripe webhook endpoint that points to:

```text
/api/webhooks/stripe
```

For a deployed app, use the full URL:

```text
https://your-domain.com/api/webhooks/stripe
```

Select these Stripe events:

- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `refund.created`

### Local Stripe CLI Testing

Install the Stripe CLI:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows with Scoop
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

Log in:

```bash
stripe login
```

Run the local app:

```bash
npm run dev
```

In a second terminal, forward webhook events to the local Next.js app:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Stripe CLI will print a webhook signing secret. Put that value in `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

Trigger local test events:

```bash
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
stripe trigger refund.created
```

The route verifies Stripe signatures before mapping events. When Supabase credentials are present, it upserts into:

- `transactions`
- `failed_payments`
- `refunds`
- `sync_runs`

When Stripe or Supabase credentials are missing, the route returns JSON errors or skip messages instead of crashing the app.

### Stripe Diagnostics

Open the dashboard and go to:

```text
/settings/diagnostics
```

The diagnostics page shows setup booleans and the latest stored Stripe records:

- Supabase env detected
- Stripe secret key detected
- Stripe webhook secret detected
- Supabase service role detected
- Last `sync_runs` row for Stripe
- Last successful transaction
- Last failed payment
- Last refund

It never displays actual secret values.

You can also check the JSON health endpoint:

```bash
curl http://localhost:3000/api/health/stripe
```

The response reports env/client availability and a timestamp only.

### Stripe Historical Backfill

Stripe webhooks only capture future events. Run a manual backfill when setting up
the dashboard or when you need to refresh historical revenue, failed payments,
and refunds.

Local command:

```bash
curl -X POST http://localhost:3000/api/sync/stripe \
  -H "Content-Type: application/json" \
  -d "{\"days\":90}"
```

PowerShell command:

```powershell
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/sync/stripe" `
  -ContentType "application/json" `
  -Body '{"days":90}'
```

The default window is 90 days. The route uses `STRIPE_SECRET_KEY` and
`SUPABASE_SERVICE_ROLE_KEY`, then upserts into:

- `transactions`
- `failed_payments`
- `refunds`
- `sync_runs`

Rows are upserted by `external_id` to prevent duplicates.

### Stripe Troubleshooting

Webhook secret mismatch:
Make sure `STRIPE_WEBHOOK_SECRET` is the `whsec_...` value printed by the same `stripe listen` session forwarding to your local app. Restart `npm run dev` after changing `.env.local`.

Supabase env missing:
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase project settings. The dashboard will keep using mock data until valid env vars and table data exist.

Service role key missing:
Set `SUPABASE_SERVICE_ROLE_KEY` for the webhook route to store verified Stripe events. Without it, the local app can still run, but Stripe webhook writes will be skipped.

Table schema not applied:
Run `supabase/schema.sql` in the Supabase SQL Editor before testing webhooks. Missing tables will prevent Stripe events from being stored.

Dashboard still showing mock data:
The Phase 4 data layer falls back to mock mode when Supabase tables are empty. Trigger Stripe test events and verify rows exist in `transactions`, `failed_payments`, `refunds`, and `sync_runs`.

## Database Structure

The schema file is:

```text
supabase/schema.sql
```

It creates:

- `transactions`
- `failed_payments`
- `refunds`
- `ad_campaigns`
- `ad_sets`
- `ads`
- `ad_daily_metrics`
- `ghl_contacts`
- `ghl_opportunities`
- `funnel_events`
- `notion_creatives`
- `instagram_daily_metrics`
- `source_connections`
- `sync_runs`

Shared TypeScript interfaces live in:

```text
src/lib/types.ts
```

Mock records in `src/lib/mock-data.ts` now use table-shaped source data and derive the existing dashboard view models from those records.

## Verification

```bash
npm test
npm run lint
npm run build
```
