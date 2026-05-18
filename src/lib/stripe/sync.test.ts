import { describe, expect, it, vi } from "vitest";
import {
  mapChargeToRefundRows,
  mapPaymentIntentToFailedPayment,
  mapPaymentIntentToTransaction,
  syncStripeHistory,
} from "./sync";

const created = 1_779_035_200;

describe("Stripe historical sync", () => {
  it("maps successful payment intents into transaction rows", () => {
    const row = mapPaymentIntentToTransaction(
      {
        id: "pi_123",
        object: "payment_intent",
        status: "succeeded",
        amount: 6700,
        amount_received: 6700,
        currency: "usd",
        created,
        receipt_email: "buyer@soundev.com",
        payment_method_types: ["card"],
        latest_charge: {
          id: "ch_123",
          billing_details: { email: "charge@soundev.com" },
        },
        metadata: {
          product_name: "Drum Mastery Suite",
          utm_source: "meta",
          utm_campaign: "cold_producers",
          utm_content: "hook_a",
        },
      },
      {
        id: "cs_123",
        customer_email: "checkout@soundev.com",
        metadata: {
          utm_content: "checkout_hook",
        },
      },
    );

    expect(row).toMatchObject({
      external_id: "pi_123",
      stripe_payment_intent_id: "pi_123",
      stripe_charge_id: "ch_123",
      stripe_checkout_session_id: "cs_123",
      customer_email: "checkout@soundev.com",
      amount_cents: 6700,
      payment_method_type: "card",
      utm_source: "meta",
      utm_content: "checkout_hook",
    });
  });

  it("maps failed payment intents into failed payment rows", () => {
    const row = mapPaymentIntentToFailedPayment({
      id: "pi_failed",
      object: "payment_intent",
      status: "requires_payment_method",
      amount: 6700,
      currency: "usd",
      created,
      receipt_email: "declined@soundev.com",
      last_payment_error: {
        code: "card_declined",
        message: "Your card was declined.",
      },
      metadata: {},
    });

    expect(row).toMatchObject({
      external_id: "pi_failed",
      stripe_payment_intent_id: "pi_failed",
      customer_email: "declined@soundev.com",
      failure_code: "card_declined",
      failure_message: "Your card was declined.",
    });
  });

  it("maps charge refunds into refund rows", () => {
    const rows = mapChargeToRefundRows({
      id: "ch_123",
      object: "charge",
      payment_intent: "pi_123",
      billing_details: { email: "buyer@soundev.com" },
      refunds: {
        data: [
          {
            id: "re_123",
            amount: 6700,
            currency: "usd",
            charge: "ch_123",
            payment_intent: "pi_123",
            reason: "requested_by_customer",
            status: "succeeded",
            created,
            metadata: {},
          },
        ],
      },
    });

    expect(rows[0]).toMatchObject({
      external_id: "re_123",
      stripe_refund_id: "re_123",
      stripe_charge_id: "ch_123",
      stripe_payment_intent_id: "pi_123",
      customer_email: "buyer@soundev.com",
      amount_cents: 6700,
    });
  });

  it("uses upsert by external_id for duplicate-safe writes", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({ upsert })),
    };
    const stripe = {
      paymentIntents: { list: vi.fn(async () => ({ data: [], has_more: false })) },
      checkout: {
        sessions: { list: vi.fn(async () => ({ data: [], has_more: false })) },
      },
      charges: { list: vi.fn(async () => ({ data: [], has_more: false })) },
    };

    await syncStripeHistory({ stripe, supabase, days: 30 });

    expect(upsert).toHaveBeenCalledWith(expect.anything(), {
      onConflict: "external_id",
    });
  });

  it("calls Stripe list methods with their SDK resource context intact", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({ upsert })),
    };
    const makeListResource = () => ({
      makeRequest: vi.fn(async () => ({ data: [], has_more: false })),
      list(params: Record<string, unknown>) {
        return this.makeRequest(params);
      },
    });
    const paymentIntents = makeListResource();
    const sessions = makeListResource();
    const charges = makeListResource();
    const refunds = makeListResource();

    const result = await syncStripeHistory({
      stripe: {
        paymentIntents,
        checkout: { sessions },
        charges,
        refunds,
      },
      supabase,
      days: 30,
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(paymentIntents.makeRequest).toHaveBeenCalled();
    expect(sessions.makeRequest).toHaveBeenCalled();
    expect(charges.makeRequest).toHaveBeenCalled();
    expect(refunds.makeRequest).toHaveBeenCalled();
  });

  it("fails safely when credentials are missing", async () => {
    const result = await syncStripeHistory({
      stripe: null,
      supabase: null,
      days: 90,
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Set STRIPE_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY.",
    );
  });
});
