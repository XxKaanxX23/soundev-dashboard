import { describe, expect, it } from "vitest";
import {
  mapStripeEventToFailedPayment,
  mapStripeEventToRefund,
  mapStripeEventToSyncRun,
  mapStripeEventToTransaction,
  stripeIntegrationState,
} from "./events";

describe("Stripe event mapping", () => {
  it("maps checkout.session.completed into a transaction row", () => {
    const row = mapStripeEventToTransaction({
      id: "evt_checkout",
      type: "checkout.session.completed",
      created: 1_779_035_200,
      data: {
        object: {
          id: "cs_test_123",
          object: "checkout.session",
          payment_intent: "pi_123",
          customer_details: { email: "buyer@soundev.com" },
          amount_total: 6700,
          currency: "usd",
          payment_status: "paid",
          metadata: {
            product_name: "Drum Mastery Suite",
            utm_source: "meta",
            utm_medium: "paid_social",
            utm_campaign: "cold_producers",
            utm_content: "hook_a",
            utm_term: "drum workflow",
          },
        },
      },
    });

    expect(row).toMatchObject({
      external_id: "cs_test_123",
      source: "stripe",
      customer_email: "buyer@soundev.com",
      product_name: "Drum Mastery Suite",
      status: "succeeded",
      amount_cents: 6700,
      net_amount_cents: 6700,
      currency: "usd",
      stripe_checkout_session_id: "cs_test_123",
      stripe_payment_intent_id: "pi_123",
      utm_source: "meta",
      utm_campaign: "cold_producers",
      utm_content: "hook_a",
    });
  });

  it("maps payment_intent.payment_failed into a failed payment row", () => {
    const row = mapStripeEventToFailedPayment({
      id: "evt_failed",
      type: "payment_intent.payment_failed",
      created: 1_779_035_260,
      data: {
        object: {
          id: "pi_failed",
          object: "payment_intent",
          amount: 6700,
          currency: "usd",
          receipt_email: "declined@soundev.com",
          last_payment_error: {
            code: "card_declined",
            message: "Your card was declined.",
          },
          metadata: {
            product_name: "Drum Mastery Suite",
            utm_source: "meta",
          },
        },
      },
    });

    expect(row).toMatchObject({
      external_id: "pi_failed",
      source: "stripe",
      customer_email: "declined@soundev.com",
      product_name: "Drum Mastery Suite",
      amount_cents: 6700,
      currency: "usd",
      failure_code: "card_declined",
      failure_message: "Your card was declined.",
      stripe_payment_intent_id: "pi_failed",
      utm_source: "meta",
    });
  });

  it("maps refund.created into a refund row", () => {
    const row = mapStripeEventToRefund({
      id: "evt_refund",
      type: "refund.created",
      created: 1_779_035_320,
      data: {
        object: {
          id: "re_123",
          object: "refund",
          amount: 6700,
          currency: "usd",
          charge: "ch_123",
          payment_intent: "pi_123",
          reason: "requested_by_customer",
          status: "succeeded",
          metadata: {
            product_name: "Drum Mastery Suite",
            customer_email: "refund@soundev.com",
          },
        },
      },
    });

    expect(row).toMatchObject({
      external_id: "re_123",
      source: "stripe",
      customer_email: "refund@soundev.com",
      product_name: "Drum Mastery Suite",
      amount_cents: 6700,
      currency: "usd",
      status: "succeeded",
      reason: "requested_by_customer",
      stripe_charge_id: "ch_123",
      stripe_payment_intent_id: "pi_123",
    });
  });

  it("maps every handled event into a sync run row", () => {
    const row = mapStripeEventToSyncRun({
      id: "evt_sync",
      type: "payment_intent.succeeded",
      created: 1_779_035_380,
      data: { object: { id: "pi_123", object: "payment_intent" } },
    });

    expect(row).toMatchObject({
      external_id: "evt_sync",
      source: "stripe",
      provider: "Stripe",
      status: "success",
      records_processed: 1,
    });
  });

  it("reports missing Stripe env vars without throwing", () => {
    expect(
      stripeIntegrationState({
        STRIPE_SECRET_KEY: "",
        STRIPE_WEBHOOK_SECRET: "",
      }),
    ).toEqual({
      status: "disconnected",
      detail: "Stripe keys are not configured. Mock revenue data is being used.",
    });

    expect(
      stripeIntegrationState({
        STRIPE_SECRET_KEY: "sk_test_123",
        STRIPE_WEBHOOK_SECRET: "",
      }).status,
    ).toBe("error");
  });
});
