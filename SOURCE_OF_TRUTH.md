# Soundev Source of Truth

## Purpose

This document locks which system is allowed to answer each business question in the Soundev Dashboard. It exists to prevent the dashboard from mixing fake rows, attribution estimates, test data, or disconnected-source placeholders with real business data.

## Global Rules

1. Stripe is the money source of truth.
2. Meta Ads is the paid acquisition delivery/performance source of truth.
3. GoHighLevel is the lead/contact/opportunity source of truth.
4. GA4 is the page behavior and event tracking source of truth after event availability is audited and synced.
5. Manual settings are the source of truth for goals, product price, and known fixed expenses.
6. Mock data is allowed only for demo/empty mode when a source has no live rows.
7. Never append mock rows to live rows.
8. Unavailable metrics must say why they are unavailable.
9. Estimated metrics must say they are estimated.
10. Temporary/test credentials must never be presented as production-ready.

## Source Map

### Stripe

Stripe owns:

- Purchases
- Gross revenue
- Refunds
- Refund rate
- Failed payments
- Failed payment rate numerator
- Net revenue
- Customer payment records
- Payment timestamps

Stripe caveats:

- Stripe fees are estimated until balance transaction fees are synced.
- Test-mode and Stripe CLI rows must not be shown as live business performance.
- UTM coverage depends on metadata passed into Stripe.

### Meta Ads

Meta Ads owns:

- Ad spend
- Impressions
- Reach when available
- Clicks
- CTR
- CPC
- CPM
- Campaign/ad set/ad delivery performance
- Meta-reported purchases as attribution comparison

Meta caveats:

- Meta-reported purchases are not money truth.
- Meta purchase value can be missing even when purchases are reported.
- Temporary Graph API Explorer tokens can expire and should not be treated as production-ready.

### GoHighLevel

GoHighLevel owns:

- Leads/contacts
- Forms/form submissions if API exposes them
- Opportunities if used
- Source/custom fields
- UTM fields if stored
- Funnel records if exposed by API

GoHighLevel caveats:

- Do not assume the API exposes all analytics shown inside the GoHighLevel dashboard UI.
- Use `/api/debug/ghl-capabilities` and `GHL_CAPABILITY_AUDIT.md` to verify API-accessible fields before promoting any GHL form, funnel page, order, transaction, or analytics field into source-of-truth status.
- Activity/event ingestion still needs audit.
- If GHL cannot expose landing page analytics, GA4 direct tracking is required.

### GA4

GA4 owns after event verification:

- Landing page views
- Engaged sessions
- CTA clicks
- Video interactions
- Checkout starts if tracked
- Page/funnel behavior
- Purchase event comparison only

GA4 caveats:

- GA4 Data API foundation exists, but metrics must only render when required events are present in GA4/synced rows.
- The known measurement ID is `G-0D4LN9DL38`; API reads require the numeric GA4 property ID.
- Required events and parameters must be verified before metrics are shown as real.
- If `landing_page_view` is missing but `page_view` exists for the Soundev landing page URL, landing page views may be derived from filtered `page_view`.
- Missing `primary_cta_click` and `checkout_start` events must show tracking-not-configured states.
- Stripe remains purchase and revenue truth.

### Manual Settings

Manual settings own:

- Product price
- Monthly revenue goal
- Daily pace targets
- Known fixed expenses
- Future manual expense entries

Manual settings caveats:

- Current fixed expense list covers known software only.
- It is not a full accounting system.

## Metric Source Rules

| Metric | Primary source | Secondary source | Classification |
| --- | --- | --- | --- |
| Gross revenue | Stripe | None | Exact |
| Net revenue | Stripe | None | Exact |
| Refunds | Stripe | None | Exact |
| Refund rate | Stripe | None | Exact |
| Failed payments | Stripe | None | Exact |
| Failed payment rate | Stripe | GA4 | Directional until checkout starts are verified |
| Purchases | Stripe | Meta Ads | Exact |
| Leads | GoHighLevel | None | Exact after GHL field audit |
| Landing page views | GA4 | None | Unavailable until connected |
| CTA clicks | GA4 | None | Unavailable until configured |
| Checkout starts | GA4 | GoHighLevel | Unavailable until verified |
| Checkout conversion rate | GA4 | Stripe | Unavailable until checkout starts are verified |
| Lead-to-purchase rate | GoHighLevel | Stripe | Exact after lead/purchase matching is audited |
| Ad spend | Meta Ads | None | Exact |
| CPA | Meta Ads | Stripe | Blended/directional |
| Blended ROAS | Stripe | Meta Ads | Blended/directional |
| Meta-reported purchases | Meta Ads | Stripe | Directional |
| Meta purchase value | Meta Ads | Stripe | Directional |
| Estimated Stripe fees | Stripe | None | Estimated |
| Fixed daily expense allocation | Manual settings | None | Estimated |
| Estimated profit | Stripe | Meta Ads | Estimated |
| Daily revenue goal progress | Manual settings | Stripe | Estimated |
| Daily purchase goal progress | Manual settings | Stripe | Estimated |
| UTM coverage | Stripe | GoHighLevel | Exact for present fields |
| Data freshness | Sync metadata | Source connections | Directional |
| Data confidence | Dashboard rules | Source status | Directional |

## Morning Dashboard Truth Rules

The Morning Brief should default to the last 24 hours in America/Chicago.

It can show:

- Net revenue from Stripe.
- Purchases from Stripe.
- Ad spend from Meta Ads.
- Estimated profit when Stripe and Meta data are present.
- Goal pace based on manual settings plus Stripe rows.

It must not show:

- Fake lead counts before GoHighLevel data exists.
- Landing page views before GA4 is connected.
- CTA clicks before GA4 tracking is configured.
- Checkout starts before GA4 or verified GHL tracking exists.
- Ad-level ROAS when Meta purchase value is missing.

## Credential Truth Rules

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are the only browser-safe Supabase env vars.
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `META_ACCESS_TOKEN`, `GHL_API_KEY`, and `GOOGLE_APPLICATION_CREDENTIALS_JSON` must stay server-side.
- Test keys, temporary tokens, and missing webhook secrets must be presented as setup states, not production-ready integrations.

## Missing Data Labels

Use these states instead of fake numbers:

- Not connected
- Unavailable
- Waiting for first sync
- Tracking not configured
- Source stale
- Credential issue

Each label needs a reason. Example: "Landing page views are unavailable until GA4 is connected."
