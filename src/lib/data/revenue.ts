import {
  dashboardSnapshot as mockDashboardSnapshot,
  overviewMetrics as mockOverviewMetrics,
  stripeTransactions as mockStripeTransactions,
  transactions as mockTransactions,
} from "@/lib/mock-data";
import { calculateBusinessMetrics } from "@/lib/metrics";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { StripeTransaction, Transaction } from "@/lib/types";
import { readRowsWithFallback } from "./fallback";

function dollars(cents: number) {
  return cents / 100;
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function normalizeTransactions(rows: Transaction[]): StripeTransaction[] {
  return rows.map((transaction) => ({
    id: transaction.external_id ?? transaction.id,
    status: transaction.status,
    customerEmail: transaction.customer_email,
    productName: transaction.product_name,
    purchaseTimestamp: formatTimestamp(transaction.purchased_at),
    amount: dollars(transaction.amount_cents),
    netAmount: dollars(transaction.net_amount_cents),
    utmSource: transaction.utm_source ?? "",
    utmCampaign: transaction.utm_campaign ?? "",
    utmContent: transaction.utm_content ?? "",
  }));
}

export async function getRevenueData() {
  const supabase = getSupabaseServerClient();
  const transactionResult = await readRowsWithFallback({
    source: "Revenue transactions",
    mockRows: mockTransactions,
    query: async () =>
      supabase
        ? await supabase
            .from("transactions")
            .select("*")
            .order("purchased_at", { ascending: false })
        : { data: null, error: new Error("Supabase client unavailable.") },
  });
  const stripeTransactions = normalizeTransactions(transactionResult.rows);

  if (transactionResult.mode === "mock") {
    return {
      mode: "mock" as const,
      stripeTransactions: mockStripeTransactions,
      overviewMetrics: mockOverviewMetrics,
      dashboardSnapshot: mockDashboardSnapshot,
    };
  }

  const successfulPurchases = transactionResult.rows.filter(
    (transaction) => transaction.status === "succeeded",
  );
  const refunds = transactionResult.rows.filter(
    (transaction) => transaction.status === "refunded",
  );
  const failedPayments = transactionResult.rows.filter(
    (transaction) => transaction.status === "failed",
  );
  const grossRevenue = successfulPurchases.reduce(
    (sum, transaction) => sum + dollars(transaction.amount_cents),
    0,
  );
  const overviewMetrics = calculateBusinessMetrics({
    grossRevenue,
    refunds: refunds.length,
    adSpend: mockOverviewMetrics.adSpend,
    purchases: successfulPurchases.length,
    leads: mockDashboardSnapshot.leads,
    failedPayments: failedPayments.length,
    checkoutStarts: successfulPurchases.length + failedPayments.length,
  });

  return {
    mode: transactionResult.mode,
    stripeTransactions,
    overviewMetrics,
    dashboardSnapshot: {
      successfulPurchases: successfulPurchases.length,
      failedPayments: failedPayments.length,
      refunds: refunds.length,
      checkoutStarts: successfulPurchases.length + failedPayments.length,
      leads: mockDashboardSnapshot.leads,
      appointments: mockDashboardSnapshot.appointments,
      averageOrderValue: mockDashboardSnapshot.averageOrderValue,
    },
  };
}
