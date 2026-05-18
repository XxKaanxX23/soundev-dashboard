import {
  dashboardSnapshot as mockDashboardSnapshot,
  overviewMetrics as mockOverviewMetrics,
  stripeTransactions as mockStripeTransactions,
} from "@/lib/mock-data";
import {
  calculateCpa,
  calculateFailedPaymentRate,
  calculateLeadToPurchaseRate,
  calculateRefundRate,
  calculateRoas,
  type BusinessMetrics,
} from "@/lib/metrics";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  FailedPayment,
  Refund,
  StripeTransaction,
  Transaction,
} from "@/lib/types";
import { hasSupabaseReadEnv, type DataMode, warnFallback } from "./fallback";

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

function normalizeFailedPayments(rows: FailedPayment[]): StripeTransaction[] {
  return rows.map((payment) => ({
    id: payment.external_id ?? payment.id,
    status: "failed",
    customerEmail: payment.customer_email,
    productName: payment.product_name,
    purchaseTimestamp: formatTimestamp(payment.failed_at),
    amount: dollars(payment.amount_cents),
    netAmount: 0,
    utmSource: payment.utm_source ?? "",
    utmCampaign: payment.utm_campaign ?? "",
    utmContent: payment.utm_content ?? "",
  }));
}

function normalizeRefunds(rows: Refund[]): StripeTransaction[] {
  return rows.map((refund) => ({
    id: refund.external_id ?? refund.id,
    status: "refunded",
    customerEmail: refund.customer_email,
    productName: refund.product_name,
    purchaseTimestamp: formatTimestamp(refund.refunded_at),
    amount: dollars(refund.amount_cents),
    netAmount: -dollars(refund.amount_cents),
    utmSource: "",
    utmCampaign: "",
    utmContent: "",
  }));
}

function eventTime(row: StripeTransaction) {
  return new Date(row.purchaseTimestamp).getTime();
}

function liveMode({
  transactions,
  failedPayments,
  refunds,
}: {
  transactions: Transaction[];
  failedPayments: FailedPayment[];
  refunds: Refund[];
}): DataMode {
  if (
    transactions.length === 0 &&
    failedPayments.length === 0 &&
    refunds.length === 0
  ) {
    return "mock";
  }

  return transactions.length > 0 ? "live" : "partial";
}

function buildMetrics({
  transactions,
  failedPayments,
  refunds,
}: {
  transactions: Transaction[];
  failedPayments: FailedPayment[];
  refunds: Refund[];
}): BusinessMetrics {
  const successfulPurchases = transactions.filter(
    (transaction) => transaction.status === "succeeded",
  );
  const grossRevenue = successfulPurchases.reduce(
    (sum, transaction) => sum + dollars(transaction.amount_cents),
    0,
  );
  const refundAmount = refunds.reduce(
    (sum, refund) => sum + dollars(refund.amount_cents),
    0,
  );
  const purchases = successfulPurchases.length;
  const failedPaymentCount = failedPayments.length;
  const checkoutStarts = purchases + failedPaymentCount;

  return {
    grossRevenue,
    refunds: refunds.length,
    adSpend: mockOverviewMetrics.adSpend,
    purchases,
    leads: mockDashboardSnapshot.leads,
    failedPayments: failedPaymentCount,
    checkoutStarts,
    productPrice: purchases === 0 ? 67 : grossRevenue / purchases,
    refundAmount,
    netRevenue: grossRevenue - refundAmount,
    estimatedProfit: grossRevenue - refundAmount - mockOverviewMetrics.adSpend,
    cpa: calculateCpa(mockOverviewMetrics.adSpend, purchases),
    roas: calculateRoas(grossRevenue, mockOverviewMetrics.adSpend),
    leadToPurchaseRate: calculateLeadToPurchaseRate(
      purchases,
      mockDashboardSnapshot.leads,
    ),
    refundRate: calculateRefundRate(refunds.length, purchases),
    failedPaymentRate: calculateFailedPaymentRate(
      failedPaymentCount,
      checkoutStarts,
    ),
  };
}

export function buildRevenueDataFromRows({
  transactions,
  failedPayments,
  refunds,
}: {
  transactions: Transaction[];
  failedPayments: FailedPayment[];
  refunds: Refund[];
}) {
  const mode = liveMode({ transactions, failedPayments, refunds });

  if (mode === "mock") {
    return {
      mode: "mock" as const,
      stripeTransactions: mockStripeTransactions,
      overviewMetrics: mockOverviewMetrics,
      dashboardSnapshot: mockDashboardSnapshot,
    };
  }

  const successfulPurchases = transactions.filter(
    (transaction) => transaction.status === "succeeded",
  );
  const stripeTransactions = [
    ...normalizeTransactions(transactions),
    ...normalizeFailedPayments(failedPayments),
    ...normalizeRefunds(refunds),
  ].sort(
    (left, right) =>
      eventTime(right) - eventTime(left) || right.id.localeCompare(left.id),
  );
  const overviewMetrics = buildMetrics({ transactions, failedPayments, refunds });

  return {
    mode,
    stripeTransactions,
    overviewMetrics,
    dashboardSnapshot: {
      successfulPurchases: successfulPurchases.length,
      failedPayments: failedPayments.length,
      refunds: refunds.length,
      checkoutStarts: successfulPurchases.length + failedPayments.length,
      leads: mockDashboardSnapshot.leads,
      appointments: mockDashboardSnapshot.appointments,
      averageOrderValue:
        successfulPurchases.length === 0
          ? 0
          : overviewMetrics.grossRevenue / successfulPurchases.length,
    },
  };
}

async function readLiveRows<Row>(
  source: string,
  query: () => Promise<{ data: Row[] | null; error: { message?: string } | null }>,
) {
  try {
    const { data, error } = await query();

    if (error) {
      warnFallback(source, error.message ?? "Query failed.");
      return { rows: [] as Row[], failed: true };
    }

    return { rows: data ?? [], failed: false };
  } catch (error) {
    warnFallback(
      source,
      error instanceof Error ? error.message : "Query threw an unknown error.",
    );
    return { rows: [] as Row[], failed: true };
  }
}

export async function getRevenueData() {
  if (!hasSupabaseReadEnv()) {
    warnFallback("Revenue", "Supabase read env vars are missing.");
    return buildRevenueDataFromRows({
      transactions: [],
      failedPayments: [],
      refunds: [],
    });
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    warnFallback("Revenue", "Supabase client unavailable.");
    return buildRevenueDataFromRows({
      transactions: [],
      failedPayments: [],
      refunds: [],
    });
  }

  const [transactions, failedPayments, refunds] = await Promise.all([
    readLiveRows("Revenue transactions", async () =>
      supabase
        .from("transactions")
        .select("*")
        .order("purchased_at", { ascending: false }),
    ),
    readLiveRows("Failed payments", async () =>
      supabase
        .from("failed_payments")
        .select("*")
        .order("failed_at", { ascending: false }),
    ),
    readLiveRows("Refunds", async () =>
      supabase.from("refunds").select("*").order("refunded_at", { ascending: false }),
    ),
  ]);

  if (transactions.failed && failedPayments.failed && refunds.failed) {
    return buildRevenueDataFromRows({
      transactions: [],
      failedPayments: [],
      refunds: [],
    });
  }

  return buildRevenueDataFromRows({
    transactions: transactions.rows,
    failedPayments: failedPayments.rows,
    refunds: refunds.rows,
  });
}
