import type {
  FailedPayment,
  Json,
  Refund,
  SyncRun,
  Transaction,
} from "@/lib/types";

type StripeRecord = Record<string, unknown>;
type StripeListResponse<T> = {
  data: T[];
  has_more?: boolean;
};

type StripeListMethod<T> = (
  params: Record<string, unknown>,
) => Promise<StripeListResponse<T>>;

type StripeLike = {
  paymentIntents?: { list: StripeListMethod<StripeRecord> };
  checkout?: { sessions?: { list: StripeListMethod<StripeRecord> } };
  charges?: { list: StripeListMethod<StripeRecord> };
  refunds?: { list: StripeListMethod<StripeRecord> };
} | null;

type SupabaseLike = {
  from: (table: string) => {
    upsert: (
      payload: unknown,
      options?: { onConflict?: string },
    ) => PromiseLike<{ error?: { message?: string } | Error | null }>;
  };
} | null;

type TransactionInsert = Partial<Omit<Transaction, "id" | "created_at" | "updated_at">> &
  Pick<Transaction, "source">;
type FailedPaymentInsert = Partial<
  Omit<FailedPayment, "id" | "created_at" | "updated_at">
> &
  Pick<FailedPayment, "source">;
type RefundInsert = Partial<Omit<Refund, "id" | "created_at" | "updated_at">> &
  Pick<Refund, "source">;
type SyncRunInsert = Partial<Omit<SyncRun, "id" | "created_at" | "updated_at">> &
  Pick<SyncRun, "source">;

export type StripeBackfillSummary = {
  ok: boolean;
  transactionsSynced: number;
  failedPaymentsSynced: number;
  refundsSynced: number;
  errors: string[];
};

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as StripeRecord)
    : null;
}

function stringId(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return objectValue(value)?.id ? asString(objectValue(value)?.id) : null;
}

function metadataFrom(...records: (StripeRecord | null | undefined)[]) {
  return records.reduce<Record<string, string | undefined>>((metadata, record) => {
    const value = record?.metadata;

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return metadata;
    }

    return {
      ...metadata,
      ...(value as Record<string, string | undefined>),
    };
  }, {});
}

function rawJson(value: unknown) {
  return value as Json;
}

function unixTimestamp(value: unknown) {
  const seconds = typeof value === "number" ? value : Math.floor(Date.now() / 1000);
  return new Date(seconds * 1000).toISOString();
}

function customerEmailFrom({
  paymentIntent,
  charge,
  session,
}: {
  paymentIntent?: StripeRecord | null;
  charge?: StripeRecord | null;
  session?: StripeRecord | null;
}) {
  const sessionDetails = objectValue(session?.customer_details);
  const chargeBilling = objectValue(charge?.billing_details);

  return (
    asString(sessionDetails?.email) ??
    asString(session?.customer_email) ??
    asString(chargeBilling?.email) ??
    asString(paymentIntent?.receipt_email) ??
    asString(paymentIntent?.customer_email) ??
    "unknown@soundev.local"
  );
}

function latestChargeFrom(paymentIntent: StripeRecord) {
  return objectValue(paymentIntent.latest_charge);
}

function paymentMethodTypeFrom(paymentIntent: StripeRecord, charge: StripeRecord | null) {
  const paymentMethodTypes = paymentIntent.payment_method_types;

  if (Array.isArray(paymentMethodTypes) && typeof paymentMethodTypes[0] === "string") {
    return paymentMethodTypes[0];
  }

  const paymentMethodDetails = objectValue(charge?.payment_method_details);
  return asString(paymentMethodDetails?.type);
}

function utmFrom(metadata: Record<string, string | undefined>) {
  return {
    utm_source: metadata.utm_source ?? null,
    utm_medium: metadata.utm_medium ?? null,
    utm_campaign: metadata.utm_campaign ?? null,
    utm_content: metadata.utm_content ?? null,
    utm_term: metadata.utm_term ?? null,
  };
}

export function mapPaymentIntentToTransaction(
  paymentIntent: StripeRecord,
  checkoutSession?: StripeRecord,
): TransactionInsert | null {
  if (paymentIntent.status !== "succeeded") {
    return null;
  }

  const charge = latestChargeFrom(paymentIntent);
  const metadata = metadataFrom(paymentIntent, charge, checkoutSession);
  const amountCents =
    asNumber(paymentIntent.amount_received) || asNumber(paymentIntent.amount);

  return {
    external_id: asString(paymentIntent.id) ?? "unknown_payment_intent",
    source: "stripe",
    customer_email: customerEmailFrom({ paymentIntent, charge, session: checkoutSession }),
    product_name: metadata.product_name ?? "Drum Mastery Suite",
    status: "succeeded",
    amount_cents: amountCents,
    net_amount_cents: amountCents,
    currency: (asString(paymentIntent.currency) ?? "usd").toLowerCase() as "usd",
    purchased_at: unixTimestamp(paymentIntent.created),
    stripe_checkout_session_id: asString(checkoutSession?.id),
    stripe_payment_intent_id: asString(paymentIntent.id),
    stripe_charge_id: stringId(paymentIntent.latest_charge),
    payment_method_type: paymentMethodTypeFrom(paymentIntent, charge),
    raw_event: rawJson(paymentIntent),
    synced_at: new Date().toISOString(),
    ...utmFrom(metadata),
  };
}

export function mapPaymentIntentToFailedPayment(
  paymentIntent: StripeRecord,
): FailedPaymentInsert | null {
  if (
    paymentIntent.status === "succeeded" ||
    paymentIntent.status === "processing" ||
    paymentIntent.status === "requires_capture"
  ) {
    return null;
  }

  const failure = objectValue(paymentIntent.last_payment_error);
  const metadata = metadataFrom(paymentIntent);

  return {
    external_id: asString(paymentIntent.id) ?? "unknown_payment_intent",
    source: "stripe",
    transaction_external_id: asString(paymentIntent.id),
    customer_email: customerEmailFrom({ paymentIntent }),
    product_name: metadata.product_name ?? "Drum Mastery Suite",
    amount_cents: asNumber(paymentIntent.amount),
    currency: (asString(paymentIntent.currency) ?? "usd").toLowerCase() as "usd",
    failed_at: unixTimestamp(paymentIntent.created),
    failure_code: (asString(failure?.code) ?? "unknown") as FailedPayment["failure_code"],
    failure_message: asString(failure?.message) ?? "Payment failed",
    stripe_payment_intent_id: asString(paymentIntent.id),
    raw_event: rawJson(paymentIntent),
    synced_at: new Date().toISOString(),
    ...utmFrom(metadata),
  };
}

export function mapChargeToRefundRows(charge: StripeRecord): RefundInsert[] {
  const refunds = objectValue(charge.refunds);
  const refundRows = Array.isArray(refunds?.data) ? refunds.data : [];
  const chargeBilling = objectValue(charge.billing_details);

  return refundRows.flatMap((refund) => {
    const refundRecord = objectValue(refund);

    if (!refundRecord) {
      return [];
    }

    const metadata = metadataFrom(refundRecord, charge);

    return [
      {
        external_id: asString(refundRecord.id) ?? "unknown_refund",
        source: "stripe",
        transaction_external_id:
          stringId(refundRecord.payment_intent) ?? stringId(charge.payment_intent),
        customer_email:
          metadata.customer_email ??
          asString(chargeBilling?.email) ??
          "unknown@soundev.local",
        product_name: metadata.product_name ?? "Drum Mastery Suite",
        amount_cents: asNumber(refundRecord.amount),
        currency: (asString(refundRecord.currency) ?? "usd").toLowerCase() as "usd",
        refunded_at: unixTimestamp(refundRecord.created),
        status: (asString(refundRecord.status) ?? "succeeded") as Refund["status"],
        reason: asString(refundRecord.reason),
        stripe_refund_id: asString(refundRecord.id),
        stripe_charge_id: stringId(refundRecord.charge) ?? asString(charge.id),
        stripe_payment_intent_id:
          stringId(refundRecord.payment_intent) ?? stringId(charge.payment_intent),
        raw_event: rawJson(refundRecord),
        synced_at: new Date().toISOString(),
      },
    ];
  });
}

async function listAll<T>(
  list: StripeListMethod<T> | undefined,
  params: Record<string, unknown>,
) {
  if (!list) {
    return [];
  }

  const rows: T[] = [];
  let startingAfter: string | undefined;

  do {
    const response = await list({
      ...params,
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    const data = Array.isArray(response.data) ? response.data : [];

    rows.push(...data);
    startingAfter = response.has_more
      ? asString((data.at(-1) as StripeRecord | undefined)?.id) ?? undefined
      : undefined;
  } while (startingAfter);

  return rows;
}

async function upsertOrThrow(
  supabase: NonNullable<SupabaseLike>,
  table: string,
  payload: unknown,
) {
  if (Array.isArray(payload) && payload.length === 0) {
    return;
  }

  const { error } = await supabase
    .from(table)
    .upsert(payload, { onConflict: "external_id" });

  if (error) {
    throw error;
  }
}

function syncRunPayload(
  summary: StripeBackfillSummary,
  startedAt: string,
  days: number,
): SyncRunInsert {
  const finishedAt = new Date().toISOString();
  const recordsProcessed =
    summary.transactionsSynced +
    summary.failedPaymentsSynced +
    summary.refundsSynced;
  const countDetail = `Backfill window: ${days} days. Transactions: ${summary.transactionsSynced}. Failed payments: ${summary.failedPaymentsSynced}. Refunds: ${summary.refundsSynced}.`;

  return {
    external_id: `stripe_backfill:${startedAt}`,
    source: "stripe",
    connection_id: null,
    provider: "Stripe",
    status: summary.ok ? "success" : "error",
    started_at: startedAt,
    finished_at: finishedAt,
    records_processed: recordsProcessed,
    error_message: summary.errors.length > 0 ? `${countDetail} ${summary.errors.join(" ")}` : countDetail,
    synced_at: finishedAt,
  };
}

export async function syncStripeHistory({
  stripe,
  supabase,
  days = 90,
}: {
  stripe: unknown;
  supabase: unknown;
  days?: number;
}): Promise<StripeBackfillSummary> {
  const startedAt = new Date().toISOString();
  const summary: StripeBackfillSummary = {
    ok: false,
    transactionsSynced: 0,
    failedPaymentsSynced: 0,
    refundsSynced: 0,
    errors: [],
  };

  if (!stripe || !supabase) {
    summary.errors.push("Set STRIPE_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY.");
    return summary;
  }

  const stripeClient = stripe as NonNullable<StripeLike>;
  const db = supabase as NonNullable<SupabaseLike>;

  try {
    const created = {
      gte: Math.floor(Date.now() / 1000) - Math.max(days, 1) * 24 * 60 * 60,
    };
    const paymentIntentsList = stripeClient.paymentIntents?.list
      ? (params: Record<string, unknown>) =>
          stripeClient.paymentIntents!.list(params)
      : undefined;
    const checkoutSessionsList = stripeClient.checkout?.sessions?.list
      ? (params: Record<string, unknown>) =>
          stripeClient.checkout!.sessions!.list(params)
      : undefined;
    const chargesList = stripeClient.charges?.list
      ? (params: Record<string, unknown>) => stripeClient.charges!.list(params)
      : undefined;
    const refundsList = stripeClient.refunds?.list
      ? (params: Record<string, unknown>) => stripeClient.refunds!.list(params)
      : undefined;

    const [paymentIntents, sessions, charges] = await Promise.all([
      listAll(paymentIntentsList, {
        created,
        expand: ["data.latest_charge"],
      }),
      listAll(checkoutSessionsList, { created }),
      listAll(chargesList, {
        created,
        expand: ["data.refunds"],
      }),
    ]);
    const sessionByPaymentIntent = new Map(
      sessions
        .map((session) => [stringId(session.payment_intent), session] as const)
        .filter(([paymentIntentId]) => Boolean(paymentIntentId)),
    );
    const transactions = paymentIntents
      .map((paymentIntent) =>
        mapPaymentIntentToTransaction(
          paymentIntent,
          sessionByPaymentIntent.get(asString(paymentIntent.id)),
        ),
      )
      .filter(Boolean) as TransactionInsert[];
    const failedPayments = paymentIntents
      .map(mapPaymentIntentToFailedPayment)
      .filter(Boolean) as FailedPaymentInsert[];
    const refundMap = new Map<string, RefundInsert>();

    for (const charge of charges) {
      for (const refund of mapChargeToRefundRows(charge)) {
        if (refund.external_id) {
          refundMap.set(refund.external_id, refund);
        }
      }
    }

    const directRefunds = await listAll(refundsList, {
      created,
      expand: ["data.charge"],
    });

    for (const refund of directRefunds) {
      const charge = objectValue(refund.charge);
      const rows = charge
        ? mapChargeToRefundRows({
            ...charge,
            refunds: { data: [refund] },
          })
        : mapChargeToRefundRows({
            id: stringId(refund.charge),
            payment_intent: refund.payment_intent,
            refunds: { data: [refund] },
          });

      for (const row of rows) {
        if (row.external_id) {
          refundMap.set(row.external_id, row);
        }
      }
    }

    const refunds = [...refundMap.values()];

    await upsertOrThrow(db, "transactions", transactions);
    await upsertOrThrow(db, "failed_payments", failedPayments);
    await upsertOrThrow(db, "refunds", refunds);

    summary.transactionsSynced = transactions.length;
    summary.failedPaymentsSynced = failedPayments.length;
    summary.refundsSynced = refunds.length;
    summary.ok = true;
  } catch (error) {
    summary.errors.push(
      error instanceof Error ? error.message : "Stripe backfill failed.",
    );
  }

  try {
    await upsertOrThrow(db, "sync_runs", syncRunPayload(summary, startedAt, days));
  } catch (error) {
    summary.ok = false;
    summary.errors.push(
      error instanceof Error
        ? `Could not store Stripe backfill sync run: ${error.message}`
        : "Could not store Stripe backfill sync run.",
    );
  }

  return summary;
}
