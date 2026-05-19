import { describe, expect, it } from "vitest";
import {
  buildGhlAuditSummary,
  detectUtmFields,
  redactSensitiveRecord,
  runGhlCapabilityAudit,
} from "./audit";

describe("GoHighLevel capability audit", () => {
  it("returns a safe setup response when GHL env vars are missing", async () => {
    const result = await runGhlCapabilityAudit({
      env: {},
      fetcher: (() => Promise.resolve(Response.json({}))) as typeof fetch,
    });

    expect(result).toMatchObject({
      ok: false,
      locationIdPresent: false,
      tokenPresent: false,
      summary: {
        directGa4StillRecommended: true,
      },
    });
    expect(JSON.stringify(result)).not.toContain("GHL_API_KEY");
  });

  it("does not fail the whole audit when one endpoint fails", async () => {
    const fetcher = (async (url: URL | RequestInfo) => {
      const href = String(url);

      if (href.includes("/contacts/search")) {
        return Response.json({
          contacts: [{ id: "contact_1", email: "lead@example.com" }],
        });
      }

      return Response.json({ message: "Not found" }, { status: 404 });
    }) as typeof fetch;

    const result = await runGhlCapabilityAudit({
      env: { GHL_API_KEY: "secret-token", GHL_LOCATION_ID: "loc_1" },
      fetcher,
    });

    expect(result.ok).toBe(true);
    expect(result.endpoints.contacts.ok).toBe(true);
    expect(result.endpoints.forms.ok).toBe(false);
    expect(result.errors.forms).toBeDefined();
    expect(JSON.stringify(result)).not.toContain("secret-token");
  });

  it("redacts sensitive values from samples", () => {
    expect(
      redactSensitiveRecord({
        name: "Mara Producer",
        email: "mara@example.com",
        phone: "+15555550123",
        raw_event: { secret: "do not expose" },
      }),
    ).toEqual({
      name: "M",
      email: "m***@example.com",
      phone: "***0123",
    });
  });

  it("detects UTM-like fields and click identifiers", () => {
    expect(
      detectUtmFields([
        "utmSource",
        "customFields.value",
        "attribution.fbclid",
        "Contact.GCLID",
        "source",
      ]),
    ).toEqual(["utm_source", "fbclid", "gclid"]);
  });

  it("recommends GA4 when GHL has forms/orders but no page analytics", () => {
    expect(
      buildGhlAuditSummary({
        contacts: { ok: true, count: 2, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
        opportunities: { ok: true, count: 1, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
        forms: { ok: true, count: 1, fieldNames: ["id", "name"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
        formSubmissions: { ok: true, count: 1, fieldNames: ["contactId", "formId"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
        funnels: { ok: true, count: 1, fieldNames: ["id", "name"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
        funnelPages: { ok: true, count: 1, fieldNames: ["id", "url"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
        orders: { ok: true, count: 1, fieldNames: ["id", "contactId"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
        transactions: { ok: false, count: 0, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [], error: "404" },
        customFields: { ok: true, count: 0, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
        location: { ok: true, count: 1, fieldNames: ["id"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
      }).directGa4StillRecommended,
    ).toBe(true);
  });

  it("allows GHL to be enough only when page analytics and checkout starts are visible", () => {
    const summary = buildGhlAuditSummary({
      contacts: { ok: true, count: 2, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
      opportunities: { ok: true, count: 1, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
      forms: { ok: true, count: 1, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
      formSubmissions: { ok: true, count: 1, fieldNames: ["checkoutStart", "utm_source"], utmFieldsFound: ["utm_source"], attributionFieldsFound: [], notes: [] },
      funnels: { ok: true, count: 1, fieldNames: ["id"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
      funnelPages: { ok: true, count: 1, fieldNames: ["pageViews", "visits", "url"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
      orders: { ok: true, count: 1, fieldNames: ["checkoutStatus"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
      transactions: { ok: true, count: 1, fieldNames: ["paymentProvider"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
      customFields: { ok: true, count: 1, fieldNames: ["utm_source"], utmFieldsFound: ["utm_source"], attributionFieldsFound: [], notes: [] },
      location: { ok: true, count: 1, fieldNames: ["id"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
    });

    expect(summary.canUseGhlForLandingPageViews).toBe(true);
    expect(summary.canUseGhlForCheckoutStarts).toBe(true);
    expect(summary.canUseGhlForUtmAttribution).toBe(true);
    expect(summary.directGa4StillRecommended).toBe(false);
  });

  it("requires GA4 when GHL exposes no funnel analytics", () => {
    const summary = buildGhlAuditSummary({
      contacts: { ok: true, count: 2, fieldNames: ["id"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
      opportunities: { ok: true, count: 0, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
      forms: { ok: false, count: 0, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [], error: "not available" },
      formSubmissions: { ok: false, count: 0, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [], error: "not available" },
      funnels: { ok: false, count: 0, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [], error: "not available" },
      funnelPages: { ok: false, count: 0, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [], error: "not available" },
      orders: { ok: false, count: 0, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [], error: "not available" },
      transactions: { ok: false, count: 0, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [], error: "not available" },
      customFields: { ok: true, count: 0, fieldNames: [], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
      location: { ok: true, count: 1, fieldNames: ["id"], utmFieldsFound: [], attributionFieldsFound: [], notes: [] },
    });

    expect(summary.canUseGhlForLandingPageViews).toBe(false);
    expect(summary.canUseGhlForCheckoutStarts).toBe(false);
    expect(summary.directGa4StillRecommended).toBe(true);
  });
});
