# Soundev Measurement Plan

## Purpose

This plan defines how the Soundev Dashboard should measure Drum Mastery Suite performance without guessing, mixing fake rows with live rows, or treating directional attribution data as money truth.

Default reporting window: **Last 24 hours**  
Timezone: **America/Chicago**  
Product price: **$67**  
Monthly revenue goal: **$30,000**  
Daily revenue pace target: **about $1,000/day**  
Daily purchase pace target: **about 15 purchases/day**  
Landing page: **https://drums.soundev.shop/**

Known fixed software expenses:

| Expense | Monthly |
| --- | ---: |
| GoHighLevel | $97 |
| ChatGPT | $20 |
| Total known fixed software | $117 |
| Daily fixed allocation | about $3.90 |

## Non-Negotiable Measurement Rules

1. No fake/mock business data in the real dashboard UI.
2. No silent assumptions.
3. No test API keys or temporary credentials presented as production-ready.
4. Every metric must have a source-of-truth label.
5. Every estimated metric must be labeled as estimated.
6. Every unavailable metric must say why it is unavailable.
7. Never mix mock rows with live data.
8. Recommendations must be based only on verified data.

## Core Metric Definitions

| Metric | Business question | Source of truth | Secondary comparison | Formula | Class | Required fields | Freshness | Missing-data behavior | Caveats |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gross revenue | How much money did Stripe collect before refunds? | Stripe | None | Sum successful Stripe transaction amounts. | Exact | `transactions.amount_cents`, `transactions.status` | Webhook real time, backfill/manual sync on demand. | Waiting for first Stripe sync. | Test-mode rows must not be shown as real revenue. |
| Net revenue | How much revenue remains after refunds? | Stripe | None | Gross revenue - refunds. | Exact | `transactions.amount_cents`, `refunds.amount_cents` | Webhook real time, backfill/manual sync on demand. | Waiting for Stripe transactions and refunds. | Stripe fees are not subtracted from net revenue. |
| Refunds | How much money was returned to customers? | Stripe | None | Sum Stripe refund amounts. | Exact | `refunds.amount_cents`, `refunds.status` | Webhook real time, backfill/manual sync on demand. | Waiting for Stripe refund rows. | Partial refunds must be amount-based, not count-only. |
| Refund rate | What share of purchases are being refunded? | Stripe | None | Refund count / purchase count. | Exact | `refunds.id`, `transactions.id` | Webhook real time, backfill/manual sync on demand. | Unavailable until Stripe purchases exist. | Amount-based refund impact should also be reviewed. |
| Failed payments | How many purchase attempts failed at payment? | Stripe | None | Count failed Stripe payment rows. | Exact | `failed_payments.id`, `failed_payments.created_at` | Webhook real time, backfill/manual sync on demand. | Waiting for Stripe failed payment rows. | Failed payments are not the same as checkout starts. |
| Failed payment rate | How much checkout demand is lost to declines? | Stripe | GA4 | Failed payments / verified checkout starts. | Directional until checkout tracking is verified | `failed_payments.id`, `checkout_starts` | Stripe real time; checkout starts need GA4 or verified GHL tracking. | Unavailable until checkout starts are tracked. | Stripe payment attempts can only be a temporary directional proxy. |
| Purchases | How many customers bought? | Stripe | Meta Ads | Count successful Stripe purchases. | Exact | `transactions.status`, `transactions.amount_cents` | Webhook real time, backfill/manual sync on demand. | Waiting for first Stripe transaction. | Meta purchases are attribution comparison only. |
| Leads | How many prospects entered the funnel? | GoHighLevel | None | Count GHL contacts/leads in window. | Exact | `ghl_contacts.id`, `ghl_contacts.first_seen_at` | Manual GHL sync until scheduled sync exists. | Not connected until GHL sync has live rows. | Contact creation date may not equal form submission date. |
| Landing page views | How many people reached the landing page? | GA4 | None | Count `landing_page_view` events for landing page URL. | Exact | `event_name`, `page_url`, `event_timestamp` | GA4 near-real-time once connected. | Unavailable until GA4 is connected. | GHL dashboard analytics must not be assumed API-accessible. |
| CTA clicks | How many visitors clicked the main CTA? | GA4 | None | Count `primary_cta_click` events. | Exact | `event_name`, `page_url`, UTM fields | GA4 near-real-time once connected. | Unavailable until GA4 event tracking is configured. | Requires GTM/GA4 event instrumentation. |
| Checkout starts | How many people started checkout? | GA4 | GoHighLevel | Count verified `checkout_start` events. | Exact | `checkout_start`, timestamp | GA4 near-real-time once connected. | Unavailable until GA4 or GHL checkout tracking is verified. | GA4 is required if GHL cannot expose checkout analytics. |
| Checkout conversion rate | What share of checkout starts become purchases? | GA4 | Stripe | Stripe purchases / verified checkout starts. | Exact when both are verified | `checkout_starts`, `transactions.id` | GA4 and Stripe fresh for same window. | Unavailable until checkout starts are tracked. | Stripe purchases are truth; GA4 purchase events are comparison only. |
| Lead-to-purchase rate | How well do leads turn into buyers? | GoHighLevel | Stripe | Stripe purchases / GHL leads. | Exact when identity/window logic is verified | `ghl_contacts.id`, `transactions.id` | GHL manual sync plus Stripe live data. | Unavailable until GHL has live lead rows. | Lead and purchase identity matching is not yet hardened. |
| Ad spend | How much did Meta spend? | Meta Ads | None | Sum Meta insights spend. | Exact | `ad_daily_metrics.spend_cents` | Manual Meta sync until scheduled sync exists. | Waiting for first Meta sync. | Temporary Graph API Explorer tokens can expire. |
| CPA | How much ad spend is required per Stripe purchase? | Meta Ads | Stripe | Meta ad spend / Stripe purchases. | Directional | `ad_daily_metrics.spend_cents`, `transactions.id` | Meta and Stripe fresh for same window. | Unavailable until both Meta spend and Stripe purchases exist. | Label as blended CPA unless attribution is clean. |
| Blended ROAS | How much Stripe net revenue came back per dollar of Meta spend? | Stripe | Meta Ads | Stripe net revenue / Meta ad spend. | Directional | `transactions.amount_cents`, `refunds.amount_cents`, `ad_daily_metrics.spend_cents` | Meta and Stripe fresh for same window. | Unavailable until Meta spend exists. | This is blended business ROAS, not ad-level ROAS. |
| Meta-reported purchases | How many purchases does Meta attribute to ads? | Meta Ads | Stripe | Sum purchase actions from Meta insights. | Directional | `ad_daily_metrics.actions` | Manual Meta sync until scheduled sync exists. | Waiting for first Meta sync. | Use for attribution mismatch detection only. |
| Meta purchase value | Does Meta have revenue/action value data? | Meta Ads | Stripe | Sum purchase `action_values` from Meta insights. | Directional | `ad_daily_metrics.action_values` | Manual Meta sync until scheduled sync exists. | Unavailable because Meta purchase value may be missing. | Stripe remains money truth. |
| Estimated Stripe fees | Roughly how much processing cost should be reserved? | Stripe | None | 2.9% of Stripe gross revenue + $0.30 per successful transaction. | Estimated | `transactions.amount_cents`, `transactions.id` | Calculated whenever Stripe purchases exist. | Unavailable until Stripe purchases exist. | Estimated until Stripe balance transaction fees are synced. |
| Fixed daily expense allocation | How much known fixed software cost should today carry? | Manual settings | None | $117 / 30 days. | Estimated | Business settings fixed expenses | Manual settings update when expenses change. | Unavailable only if manual settings are missing. | Known software only; not full accounting. |
| Estimated profit | Was the business likely profitable in the window? | Stripe | Meta Ads | Stripe net revenue - Meta spend - estimated Stripe fees - fixed expense allocation. | Estimated | Net revenue, ad spend, estimated fees, fixed allocation | Calculated when Stripe and Meta data are fresh. | Unavailable until Stripe and Meta data exist. | Excludes unknown contractors, taxes, chargeback fees, and non-listed expenses. |
| Daily revenue goal progress | Is today on pace for $30,000/month? | Manual settings | Stripe | Stripe net revenue / $1,000 daily pace target. | Estimated | Stripe revenue, monthly goal | Last 24 hours in America/Chicago. | Waiting for Stripe rows in window. | Uses a flat 30-day month target. |
| Daily purchase goal progress | Is today on pace for about 15 purchases? | Manual settings | Stripe | Stripe purchases / 15 daily purchase target. | Estimated | Stripe purchases, product price | Last 24 hours in America/Chicago. | Waiting for Stripe purchases in window. | Target rounds up from $30,000/month at $67/product. |
| UTM coverage | How much purchase data can be attributed back to campaigns? | Stripe | GoHighLevel | Purchases with `utm_source`, `utm_campaign`, and `utm_content` / total purchases. | Exact | UTM fields on Stripe/GHL records | Calculated whenever Stripe purchases exist. | Unavailable until Stripe purchases exist. | If 0%, check whether GHL passes UTMs into Stripe metadata. |
| Data freshness | Can the user trust the dashboard is current? | Sync metadata | Source connections | Evaluate latest `sync_runs` and source status. | Directional | `sync_runs.source`, `finished_at`, `status` | Source-specific. | Waiting for first sync. | No scheduled syncs yet. |
| Data confidence | How much should the user trust a metric or recommendation? | Dashboard rules | Source status | Required sources connected + fresh + required fields present. | Directional | Source status, freshness, required fields | Calculated with each dashboard read. | Unavailable when required source is not connected. | Confidence is a guardrail, not a source audit replacement. |

## Calculation Helpers

Phase 8 code helpers live in `src/lib/business-settings.ts`.

- Break-even CPA: product price - estimated Stripe fee per purchase - estimated fixed expense allocation per purchase - refund impact per purchase.
- Estimated Stripe fee: 2.9% of Stripe gross revenue + $0.30 per successful transaction.
- Estimated profit: Stripe net revenue - Meta ad spend - estimated Stripe fees - fixed expense allocation.
- Daily revenue goal progress: revenue actual / 100,000 cents.
- Daily purchase goal progress: purchases actual / 15.
- Blended ROAS: Stripe net revenue / Meta ad spend.
- Blended CPA: Meta ad spend / Stripe purchases.

All fee/profit/goal helpers are cents-based. Estimated outputs must be labeled as estimated in the UI.

## Morning Brief Blueprint

Default window: **Last 24 hours**  
Timezone: **America/Chicago**

### 1. Top Summary

- Net revenue, source: Stripe
- Ad spend, source: Meta Ads
- Estimated profit, source: Stripe + Meta Ads + manual settings
- Purchases, source: Stripe
- Blended CPA, source: Meta Ads + Stripe
- Blended ROAS, source: Stripe + Meta Ads
- Daily revenue goal progress, source: Stripe + manual settings
- Daily purchase goal progress, source: Stripe + manual settings

### 2. Plain-English Summary

The summary should say:

- What happened in the last 24 hours.
- Whether the business was estimated profitable.
- Whether revenue and purchase pace are ahead or behind daily goals.
- Which data cannot be trusted yet.

It must not mention metrics that are unavailable as if they are facts.

### 3. Today's Action Plan

- Maximum 3 to 5 action items.
- Based only on verified data.
- No vague recommendations.
- No recommendations based on missing data.

### 4. Funnel Health

Show:

- Meta clicks, source: Meta Ads
- Landing page views, source: GA4, unavailable until connected
- CTA clicks, source: GA4, unavailable until configured
- Checkout starts, source: GA4 or verified GHL tracking, unavailable until verified
- Purchases, source: Stripe
- Refunds, source: Stripe

### 5. Data Health

Show:

- Stripe: live/stale/failed
- Meta: live/token expired/stale/failed
- GoHighLevel: live/stale/failed
- GA4: not connected
- UTM tracking: healthy/partial/broken

## Strict Missing-Data Behavior

If data exists, show the real number. If data does not exist, show one of:

- Not connected
- Unavailable
- Waiting for first sync
- Tracking not configured
- Source stale
- Credential issue

Examples:

- Landing page views: "Unavailable until GA4 is connected."
- CTA clicks: "Unavailable until GA4 event tracking is configured."
- Checkout starts: "Unavailable until GA4 or GHL checkout tracking is verified."
- Ad-level revenue: "Unavailable because Meta purchase value is missing."
- Estimated profit: "Estimated, based on Stripe net revenue minus Meta spend minus estimated Stripe fees minus known fixed daily expense allocation."

## GHL Capability Audit Checklist

GoHighLevel has built-in dashboards, but the API may not expose everything shown in the UI. Do not assume GHL exposes dashboard analytics through the API.

Audit whether the current Private Integration token and location can pull:

- Contacts
- Opportunities
- Forms
- Form submissions
- Funnels
- Funnel pages
- Payments/orders
- Transactions
- Custom fields
- Attribution/source fields
- UTM fields
- Page/funnel analytics
- Google Analytics-connected metrics
- Meta dashboard-connected metrics

If GoHighLevel cannot expose landing page analytics or checkout behavior via API, GA4 direct tracking is required.

## GA4 Readiness Plan

GA4 is not connected yet.

Unknowns:

- GA4 property ID
- Whether Google Tag Manager is installed
- Whether custom events exist
- Whether CTA clicks are tracked
- Whether checkout starts are tracked

Required future GA4 events:

- `landing_page_view`
- `primary_cta_click`
- `video_play`
- `video_25_percent`
- `video_50_percent`
- `video_75_percent`
- `video_complete`
- `checkout_start`
- `purchase` for comparison only; Stripe remains purchase truth

Required parameters:

- `page_url`
- `page_path`
- `referrer`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `fbclid` if available
- `device`
- `country`

## Diagnostics Roadmap

Diagnostics should continue moving toward a source-by-source trust report:

- Source status
- Latest sync time
- Stale/not stale
- Credential health
- Row counts
- UTM coverage
- GA4 connection status
- Missing event tracking
- Whether dashboard can calculate profit, funnel conversion, checkout conversion, blended ROAS, and ad-level ROAS

## Current Data Confidence Notes

- Profit can be estimated when Stripe and Meta rows exist.
- Funnel conversion is not reliable until GHL source fields and event behavior are audited.
- Checkout conversion is unavailable until GA4 or verified GHL checkout tracking exists.
- Blended ROAS is available when Stripe net revenue and Meta spend exist.
- Ad-level ROAS is unavailable or directional when Meta purchase value is missing.
