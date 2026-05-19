# GoHighLevel Capability Audit

## Purpose

This audit verifies what the current GoHighLevel/LeadConnector Private Integration API can actually expose for the Soundev Dashboard. It is intentionally read-only and discovery-focused. It does not assume that analytics visible in the GoHighLevel UI are available through the API.

## How To Run

Start the local app with valid server-side GoHighLevel env vars in `.env.local`:

```powershell
npm run dev
```

Run the audit:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/debug/ghl-capabilities"
```

The route returns sanitized JSON only. It does not write results to Supabase.

## Endpoints Tested

The audit probes small samples from these areas:

- Contacts
- Opportunities
- Forms
- Form submissions
- Funnels
- Funnel pages
- Orders / payments
- Transactions
- Custom fields
- Location metadata

Each endpoint reports its own status. One failed endpoint does not fail the entire audit.

## What Each Endpoint Can Answer

- Contacts: whether GHL can support leads, source fields, tags, custom fields, and UTM-like fields.
- Opportunities: whether GHL can support pipeline, stage, status, and value reporting.
- Forms: whether GHL can expose form definitions.
- Form submissions: whether GHL can expose lead capture events, submission fields, source, referrer, or UTM attribution.
- Funnels: whether GHL can expose funnel structure.
- Funnel pages: whether GHL can expose page structure and whether any page analytics fields appear.
- Orders / payments: whether GHL can expose order-level records, products, contacts, statuses, and source fields.
- Transactions: whether GHL can expose payment transaction records and provider/status fields.
- Custom fields: whether UTM or click ID fields exist in the location.
- Location: whether basic location access works without exposing private location details.

## Sensitive Data Handling

The audit response must not expose:

- API keys or tokens
- full names
- full emails
- phone numbers
- raw contact payloads
- raw payment/order payloads

Samples are redacted:

- Email: `k***@domain.com`
- Phone: `***1234`
- Name: first initial only
- Raw JSON fields are omitted

## How To Interpret Results

Use the `summary` block first:

- `canUseGhlForLeads`: contacts are accessible.
- `canUseGhlForForms`: forms or form submissions are accessible.
- `canUseGhlForOrders`: orders or transactions are accessible.
- `canUseGhlForCheckoutStarts`: checkout-start-like fields were visible.
- `canUseGhlForLandingPageViews`: page-view/session/visit analytics fields were visible.
- `canUseGhlForUtmAttribution`: UTM or click ID fields were visible.
- `directGa4StillRecommended`: direct GA4 should remain in the roadmap for landing page behavior.

Endpoint `fieldNames` show available field paths. Use them to decide whether mappings can be safely added in a later implementation phase.

## Decision Rules

- If GHL exposes page views and checkout starts reliably, GHL may be usable for landing/funnel analytics after validating counts against the GHL UI.
- If GHL exposes forms/orders but not page analytics, use GHL for leads/forms/orders and GA4 for page behavior.
- If GHL does not expose landing page analytics, direct GA4 is required.
- If UTM fields are not found, fix attribution capture before treating campaign-level funnel metrics as reliable.

## Current Known Status

Phase 8C confirmed the working direction:

- GHL can be used for leads, forms, attribution fields, and funnel structure.
- GHL cannot currently be trusted for checkout starts, orders, transactions, or full page analytics.
- Direct GA4 is required for landing page behavior.

The GHL audit route remains available for re-checking endpoint access after token, API, or funnel changes:

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/debug/ghl-capabilities"
```

Do not paste secrets or unredacted customer data into this document. Record only endpoint availability, useful field names, and dashboard decisions.
