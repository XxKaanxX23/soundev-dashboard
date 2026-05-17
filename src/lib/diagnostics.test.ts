import { describe, expect, it } from "vitest";
import { getDiagnosticsEnvStatus, normalizeDiagnosticRows } from "./diagnostics";
import type { FailedPayment, Refund, SyncRun, Transaction } from "./types";

const timestamp = "2026-05-17T05:00:00.000Z";

const baseRow = {
  id: "row_1",
  external_id: "external_1",
  source: "stripe" as const,
  created_at: timestamp,
  updated_at: timestamp,
  synced_at: timestamp,
};

describe("diagnostics helpers", () => {
  it("reports env presence without exposing secret values", () => {
    const status = getDiagnosticsEnvStatus({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon_real_value",
      STRIPE_SECRET_KEY: "sk_test_real_value",
      STRIPE_WEBHOOK_SECRET: "whsec_real_value",
      SUPABASE_SERVICE_ROLE_KEY: "",
    });

    expect(status).toEqual({
      supabaseEnvDetected: true,
      stripeSecretKeyDetected: true,
      stripeWebhookSecretDetected: true,
      supabaseServiceRoleDetected: false,
      metaAdsEnvDetected: false,
    });
    expect(JSON.stringify(status)).not.toContain("real_value");
  });

  it("normalizes latest Stripe rows into display-safe diagnostics data", () => {
    const syncRun: SyncRun = {
      ...baseRow,
      source: "stripe",
      connection_id: null,
      provider: "Stripe",
      status: "success",
      started_at: timestamp,
      finished_at: timestamp,
      records_processed: 3,
      error_message: null,
    };
    const transaction: Transaction = {
      ...baseRow,
      customer_email: "buyer@soundev.com",
      product_name: "Drum Mastery Suite",
      status: "succeeded",
      amount_cents: 6700,
      net_amount_cents: 6700,
      currency: "usd",
      purchased_at: timestamp,
      stripe_checkout_session_id: "cs_test_123",
      stripe_payment_intent_id: "pi_test_123",
      raw_event: { secret: "should-not-render" },
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "cold_producers",
      utm_content: "hook_a",
      utm_term: null,
    };
    const failedPayment: FailedPayment = {
      ...baseRow,
      transaction_external_id: null,
      customer_email: "declined@soundev.com",
      product_name: "Drum Mastery Suite",
      amount_cents: 6700,
      currency: "usd",
      failed_at: timestamp,
      failure_code: "card_declined",
      failure_message: "Card declined",
      stripe_payment_intent_id: "pi_failed_123",
      raw_event: {},
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
    };
    const refund: Refund = {
      ...baseRow,
      transaction_external_id: "pi_test_123",
      customer_email: "buyer@soundev.com",
      product_name: "Drum Mastery Suite",
      amount_cents: 6700,
      currency: "usd",
      refunded_at: timestamp,
      status: "succeeded",
      reason: "requested_by_customer",
      stripe_refund_id: "re_test_123",
      stripe_charge_id: "ch_test_123",
      stripe_payment_intent_id: "pi_test_123",
      raw_event: {},
    };

    expect(
      normalizeDiagnosticRows({
        syncRun,
        transaction,
        failedPayment,
        refund,
      }),
    ).toMatchObject({
      lastSyncRun: {
        provider: "Stripe",
        status: "success",
        recordsProcessed: 3,
      },
      lastStripeTransaction: {
        customerEmail: "buyer@soundev.com",
        amount: "$67.00",
        externalId: "external_1",
      },
      lastFailedPayment: {
        customerEmail: "declined@soundev.com",
        failureCode: "card_declined",
      },
      lastRefund: {
        customerEmail: "buyer@soundev.com",
        reason: "requested_by_customer",
      },
    });
  });
});
