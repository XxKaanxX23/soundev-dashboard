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
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  FailedPayment,
  Json,
  Refund,
  StripeTransaction,
  Transaction,
} from "@/lib/types";
import { type DataMode, warnFallback } from "./fallback";

type RevenueReadEnv = Record<string, string | undefined>;

const KNOWN_MOCK_STRIPE_MARKERS = [
  "mara@beatlab.co",
  "malik@drumpack.io",
  "devon@sounddesk.io",
  "beatlab",
  "drumpack",
  "sounddesk",
];

const NON_BUSINESS_STRIPE_EMAILS = new Set([
  "stripe@example.com",
  "unknown@soundev.local",
]);

function dollars(cents: number) {
  return cents / 100;
}

export function hasRevenueReadEnv(env: RevenueReadEnv = process.env) {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      (env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function selectRevenueReadClient<Client>(
  serviceRoleClient: Client | null,
  anonClient: Client | null,
) {
  return serviceRoleClient ?? anonClient;
}

function getRevenueReadClient() {
  return selectRevenueReadClient(
    getSupabaseServiceRoleClient(),
    getSupabaseServerClient(),
  );
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

function isRecord(value: Json | undefined): value is Record<string, Json | undefined> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stripeLivemodeValue(rawEvent: Json): boolean | null {
  if (!isRecord(rawEvent)) {
    return null;
  }

  if (typeof rawEvent.livemode === "boolean") {
    return rawEvent.livemode;
  }

  const data = rawEvent.data;
  if (!isRecord(data)) {
    return null;
  }

  const object = data.object;
  if (isRecord(object) && typeof object.livemode === "boolean") {
    return object.livemode;
  }

  return null;
}

function isNonBusinessStripeEmail(email: string) {
  return NON_BUSINESS_STRIPE_EMAILS.has(email.trim().toLowerCase());
}

function isDisplayableStripeSourceRow(
  row: Transaction | FailedPayment | Refund,
) {
  if (isNonBusinessStripeEmail(row.customer_email)) {
    return false;
  }

  return stripeLivemodeValue(row.raw_event) !== false;
}

export function filterDisplayableStripeRows({
  transactions,
  failedPayments,
  refunds,
}: {
  transactions: Transaction[];
  failedPayments: FailedPayment[];
  refunds: Refund[];
}) {
  return {
    transactions: transactions.filter(isDisplayableStripeSourceRow),
    failedPayments: failedPayments.filter(isDisplayableStripeSourceRow),
    refunds: refunds.filter(isDisplayableStripeSourceRow),
  };
}

export function normalizeTransactions(rows: Transaction[]): StripeTransaction[] {
  return rows.map((transaction) => ({
    id: transaction.external_id ?? transaction.id,
    status: transaction.status,
    customerEmail: transaction.customer_email,
    productName: transaction.product_name,
    purchaseTimestamp: formatTimestamp(transaction.purchased_at),
    eventTimestamp: transaction.purchased_at,
    amount: dollars(transaction.amount_cents),
    netAmount: dollars(transaction.net_amount_cents),
    utmSource: transaction.utm_source ?? "",
    utmCampaign: transaction.utm_campaign ?? "",
    utmContent: transaction.utm_content ?? "",
    paymentIntentId: transaction.stripe_payment_intent_id ?? undefined,
    chargeId: transaction.stripe_charge_id ?? undefined,
  }));
}

function normalizeFailedPayments(rows: FailedPayment[]): StripeTransaction[] {
  return rows.map((payment) => ({
    id: payment.external_id ?? payment.id,
    status: "failed",
    customerEmail: payment.customer_email,
    productName: payment.product_name,
    purchaseTimestamp: formatTimestamp(payment.failed_at),
    eventTimestamp: payment.failed_at,
    amount: dollars(payment.amount_cents),
    netAmount: 0,
    utmSource: payment.utm_source ?? "",
    utmCampaign: payment.utm_campaign ?? "",
    utmContent: payment.utm_content ?? "",
    paymentIntentId: payment.stripe_payment_intent_id ?? undefined,
  }));
}

function normalizeRefunds(rows: Refund[]): StripeTransaction[] {
  return rows.map((refund) => ({
    id: refund.external_id ?? refund.id,
    status: "refunded",
    customerEmail: refund.customer_email,
    productName: refund.product_name,
    purchaseTimestamp: formatTimestamp(refund.refunded_at),
    eventTimestamp: refund.refunded_at,
    amount: dollars(refund.amount_cents),
    netAmount: -dollars(refund.amount_cents),
    utmSource: "",
    utmCampaign: "",
    utmContent: "",
    paymentIntentId: refund.stripe_payment_intent_id ?? undefined,
    chargeId: refund.stripe_charge_id ?? undefined,
    refundId: refund.stripe_refund_id ?? undefined,
  }));
}

function eventTime(row: StripeTransaction) {
  return new Date(row.eventTimestamp ?? row.purchaseTimestamp).getTime();
}

export function hasLiveStripeData({
  transactions,
  failedPayments,
  refunds,
}: {
  transactions: Transaction[];
  failedPayments: FailedPayment[];
  refunds: Refund[];
}) {
  return (
    transactions.length > 0 || failedPayments.length > 0 || refunds.length > 0
  );
}

export function containsKnownMockStripeMarker(rows: StripeTransaction[]) {
  return rows.some((row) =>
    [
      row.customerEmail,
      row.productName,
      row.utmSource,
      row.utmCampaign,
      row.utmContent,
    ].some((value) => {
      const normalized = value.toLowerCase();
      return KNOWN_MOCK_STRIPE_MARKERS.some((marker) =>
        normalized.includes(marker),
      );
    }),
  );
}

function warnIfMockStripeLeak(mode: DataMode, rows: StripeTransaction[]) {
  if (
    process.env.NODE_ENV === "development" &&
    mode !== "mock" &&
    containsKnownMockStripeMarker(rows)
  ) {
    console.error(
      "Live Stripe data contains known mock/demo markers. Check revenue normalization before rendering.",
    );
  }
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
  if (!hasLiveStripeData({ transactions, failedPayments, refunds })) {
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
    adSpend: 0,
    purchases,
    leads: 0,
    failedPayments: failedPaymentCount,
    checkoutStarts,
    productPrice: purchases === 0 ? 67 : grossRevenue / purchases,
    refundAmount,
    netRevenue: grossRevenue - refundAmount,
    estimatedProfit: grossRevenue - refundAmount,
    cpa: calculateCpa(0, purchases),
    roas: calculateRoas(grossRevenue, 0),
    leadToPurchaseRate: calculateLeadToPurchaseRate(purchases, 0),
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
  const rawHasLiveRows = hasLiveStripeData({ transactions, failedPayments, refunds });
  const displayableRows = filterDisplayableStripeRows({
    transactions,
    failedPayments,
    refunds,
  });
  const mode = hasLiveStripeData(displayableRows)
    ? liveMode(displayableRows)
    : rawHasLiveRows
      ? "partial"
      : "mock";

  if (mode === "mock") {
    return {
      mode: "mock" as const,
      stripeTransactions: mockStripeTransactions,
      overviewMetrics: mockOverviewMetrics,
      dashboardSnapshot: mockDashboardSnapshot,
    };
  }

  const stripeTransactions = [
    ...normalizeTransactions(displayableRows.transactions),
    ...normalizeFailedPayments(displayableRows.failedPayments),
    ...normalizeRefunds(displayableRows.refunds),
  ].sort(
    (left, right) =>
      eventTime(right) - eventTime(left) || right.id.localeCompare(left.id),
  );
  warnIfMockStripeLeak(mode, stripeTransactions);
  const overviewMetrics = buildMetrics(displayableRows);
  const displayableSuccessfulPurchases = displayableRows.transactions.filter(
    (transaction) => transaction.status === "succeeded",
  );

  return {
    mode,
    stripeTransactions,
    overviewMetrics,
    dashboardSnapshot: {
      successfulPurchases: displayableSuccessfulPurchases.length,
      failedPayments: displayableRows.failedPayments.length,
      refunds: displayableRows.refunds.length,
      checkoutStarts:
        displayableSuccessfulPurchases.length + displayableRows.failedPayments.length,
      leads: 0,
      appointments: 0,
      averageOrderValue:
        displayableSuccessfulPurchases.length === 0
          ? 0
          : overviewMetrics.grossRevenue / displayableSuccessfulPurchases.length,
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
  if (!hasRevenueReadEnv()) {
    warnFallback("Revenue", "Supabase read env vars are missing.");
    return buildRevenueDataFromRows({
      transactions: [],
      failedPayments: [],
      refunds: [],
    });
  }

  const supabase = getRevenueReadClient();

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
