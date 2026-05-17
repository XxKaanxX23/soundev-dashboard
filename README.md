# Soundev Dashboard

Private analytics dashboard prototype for Soundev's Drum Mastery Suite.

This app currently runs on mock data only. Stripe, Meta Ads, GoHighLevel, Notion, Instagram, authentication, and Supabase reads/writes are not connected yet.

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

No real external integrations are connected yet. The schema and TypeScript interfaces are preparation for future ingestion from Stripe, Meta Ads, GoHighLevel, Notion, and Instagram.

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
