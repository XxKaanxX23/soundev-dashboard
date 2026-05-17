import { describe, expect, it } from "vitest";
import { normalizeTransactions } from "./revenue";
import type { Transaction } from "@/lib/types";

const baseTransaction: Transaction = {
  id: "row_1",
  external_id: "ch_1",
  source: "stripe",
  created_at: "2026-05-17T00:00:00.000Z",
  updated_at: "2026-05-17T00:00:00.000Z",
  synced_at: "2026-05-17T00:00:00.000Z",
  customer_email: "buyer@soundev.com",
  product_name: "Drum Mastery Suite",
  status: "succeeded",
  amount_cents: 6700,
  net_amount_cents: 6475,
  currency: "usd",
  purchased_at: "2026-05-17T01:30:00.000Z",
  stripe_checkout_session_id: "cs_1",
  stripe_payment_intent_id: "pi_1",
  raw_event: {},
  utm_source: "meta",
  utm_medium: "paid_social",
  utm_campaign: "cold_producers",
  utm_content: "hook_a",
  utm_term: null,
};

describe("revenue normalization", () => {
  it("normalizes transaction rows into dashboard transaction data", () => {
    expect(normalizeTransactions([baseTransaction])).toEqual([
      expect.objectContaining({
        id: "ch_1",
        customerEmail: "buyer@soundev.com",
        productName: "Drum Mastery Suite",
        amount: 67,
        netAmount: 64.75,
        utmSource: "meta",
        utmCampaign: "cold_producers",
        utmContent: "hook_a",
      }),
    ]);
  });
});
