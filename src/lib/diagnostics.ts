import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { FailedPayment, Refund, SyncRun, Transaction } from "@/lib/types";

type DiagnosticsEnv = Record<string, string | undefined>;

export type DiagnosticsEnvStatus = {
  supabaseEnvDetected: boolean;
  stripeSecretKeyDetected: boolean;
  stripeWebhookSecretDetected: boolean;
  supabaseServiceRoleDetected: boolean;
};

export type DiagnosticSummary = {
  label: string;
  value: string;
  detail?: string;
};

export type DiagnosticsData = {
  env: DiagnosticsEnvStatus;
  supabaseAdminClientAvailable: boolean;
  lastSyncRun: DiagnosticSummary | null;
  lastStripeTransaction: DiagnosticSummary | null;
  lastFailedPayment: DiagnosticSummary | null;
  lastRefund: DiagnosticSummary | null;
};

type DiagnosticRows = {
  syncRun: SyncRun | null;
  transaction: Transaction | null;
  failedPayment: FailedPayment | null;
  refund: Refund | null;
};

export function getDiagnosticsEnvStatus(
  env: DiagnosticsEnv = process.env,
): DiagnosticsEnvStatus {
  return {
    supabaseEnvDetected: Boolean(
      env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    stripeSecretKeyDetected: Boolean(env.STRIPE_SECRET_KEY),
    stripeWebhookSecretDetected: Boolean(env.STRIPE_WEBHOOK_SECRET),
    supabaseServiceRoleDetected: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

function money(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function normalizeDiagnosticRows(rows: DiagnosticRows) {
  return {
    lastSyncRun: rows.syncRun
      ? {
          label: rows.syncRun.provider,
          value: rows.syncRun.status,
          detail: `${rows.syncRun.records_processed} records processed. Finished ${formatDate(rows.syncRun.finished_at)}.`,
          provider: rows.syncRun.provider,
          status: rows.syncRun.status,
          recordsProcessed: rows.syncRun.records_processed,
        }
      : null,
    lastStripeTransaction: rows.transaction
      ? {
          label: rows.transaction.customer_email,
          value: money(rows.transaction.amount_cents, rows.transaction.currency),
          detail: `${rows.transaction.product_name} paid ${formatDate(rows.transaction.purchased_at)}.`,
          customerEmail: rows.transaction.customer_email,
          amount: money(rows.transaction.amount_cents, rows.transaction.currency),
          externalId: rows.transaction.external_id,
        }
      : null,
    lastFailedPayment: rows.failedPayment
      ? {
          label: rows.failedPayment.customer_email,
          value: rows.failedPayment.failure_code,
          detail: `${money(rows.failedPayment.amount_cents, rows.failedPayment.currency)} failed ${formatDate(rows.failedPayment.failed_at)}. ${rows.failedPayment.failure_message}`,
          customerEmail: rows.failedPayment.customer_email,
          failureCode: rows.failedPayment.failure_code,
        }
      : null,
    lastRefund: rows.refund
      ? {
          label: rows.refund.customer_email,
          value: money(rows.refund.amount_cents, rows.refund.currency),
          detail: `${rows.refund.status} refund recorded ${formatDate(rows.refund.refunded_at)}.`,
          customerEmail: rows.refund.customer_email,
          reason: rows.refund.reason,
        }
      : null,
  };
}

export async function getDiagnosticsData(): Promise<DiagnosticsData> {
  const env = getDiagnosticsEnvStatus();
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    return {
      env,
      supabaseAdminClientAvailable: false,
      ...normalizeDiagnosticRows({
        syncRun: null,
        transaction: null,
        failedPayment: null,
        refund: null,
      }),
    };
  }

  try {
    const [syncRun, transaction, failedPayment, refund] = await Promise.all([
      supabase
        .from("sync_runs")
        .select("*")
        .eq("provider", "Stripe")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select("*")
        .order("purchased_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("failed_payments")
        .select("*")
        .order("failed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("refunds")
        .select("*")
        .order("refunded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      env,
      supabaseAdminClientAvailable: true,
      ...normalizeDiagnosticRows({
        syncRun: syncRun.error ? null : (syncRun.data as SyncRun | null),
        transaction: transaction.error
          ? null
          : (transaction.data as Transaction | null),
        failedPayment: failedPayment.error
          ? null
          : (failedPayment.data as FailedPayment | null),
        refund: refund.error ? null : (refund.data as Refund | null),
      }),
    };
  } catch {
    return {
      env,
      supabaseAdminClientAvailable: false,
      ...normalizeDiagnosticRows({
        syncRun: null,
        transaction: null,
        failedPayment: null,
        refund: null,
      }),
    };
  }
}
