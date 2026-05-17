import type Stripe from "stripe";
import type {
  FailedPayment,
  Json,
  Refund,
  SourceConnectionHealth,
  SourceConnectionStatus,
  SyncRun,
  Transaction,
} from "@/lib/types";

type StripeLikeEvent = {
  id: string;
  type: string;
  created: number;
  data: {
    object: Record<string, unknown>;
  };
};

type StripeMetadata = Record<string, string | undefined>;

type SupabaseInsert<T extends { source: unknown }> = Partial<
  Omit<T, "id" | "created_at" | "updated_at">
> &
  Pick<T, "source">;

export type TransactionInsert = SupabaseInsert<Transaction>;
export type FailedPaymentInsert = SupabaseInsert<FailedPayment>;
export type RefundInsert = SupabaseInsert<Refund>;
export type SyncRunInsert = SupabaseInsert<SyncRun>;

export type StripeConnectionState = {
  status: SourceConnectionStatus | "ready";
  health: SourceConnectionHealth;
  detail: string;
};

const fallbackProductName = "Drum Mastery Suite";

function fromUnixSeconds(value: unknown) {
  const seconds = typeof value === "number" ? value : Math.floor(Date.now() / 1000);
  return new Date(seconds * 1000).toISOString();
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function metadataFrom(object: Record<string, unknown>): StripeMetadata {
  const metadata = object.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata as StripeMetadata;
}

function stringId(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "id" in value) {
    return asString((value as { id?: unknown }).id);
  }

  return null;
}

function customerEmailFrom(object: Record<string, unknown>, metadata: StripeMetadata) {
  const customerDetails = object.customer_details;
  const receiptEmail = asString(object.receipt_email);

  if (
    customerDetails &&
    typeof customerDetails === "object" &&
    "email" in customerDetails
  ) {
    return (
      asString((customerDetails as { email?: unknown }).email) ??
      receiptEmail ??
      metadata.customer_email ??
      "unknown@soundev.local"
    );
  }

  return (
    receiptEmail ??
    asString(object.customer_email) ??
    metadata.customer_email ??
    "unknown@soundev.local"
  );
}

function utmFrom(metadata: StripeMetadata) {
  return {
    utm_source: metadata.utm_source ?? null,
    utm_medium: metadata.utm_medium ?? null,
    utm_campaign: metadata.utm_campaign ?? null,
    utm_content: metadata.utm_content ?? null,
    utm_term: metadata.utm_term ?? null,
  };
}

function rawEvent(event: unknown) {
  return event as unknown as Json;
}

export function mapStripeEventToTransaction(
  event: Stripe.Event | StripeLikeEvent,
): TransactionInsert | null {
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "payment_intent.succeeded"
  ) {
    return null;
  }

  const object = event.data.object as Record<string, unknown>;
  const metadata = metadataFrom(object);
  const isCheckoutSession = object.object === "checkout.session";
  const paymentIntentId = stringId(object.payment_intent) ?? asString(object.id);
  const checkoutSessionId = isCheckoutSession ? asString(object.id) : null;
  const amountCents = asNumber(object.amount_total) || asNumber(object.amount);

  return {
    external_id: checkoutSessionId ?? paymentIntentId ?? event.id,
    source: "stripe",
    customer_email: customerEmailFrom(object, metadata),
    product_name: metadata.product_name ?? fallbackProductName,
    status: "succeeded",
    amount_cents: amountCents,
    net_amount_cents: amountCents,
    currency: (asString(object.currency) ?? "usd").toLowerCase() as "usd",
    purchased_at: fromUnixSeconds(object.created ?? event.created),
    stripe_checkout_session_id: checkoutSessionId,
    stripe_payment_intent_id: paymentIntentId,
    raw_event: rawEvent(event),
    synced_at: new Date().toISOString(),
    ...utmFrom(metadata),
  };
}

export function mapStripeEventToFailedPayment(
  event: Stripe.Event | StripeLikeEvent,
): FailedPaymentInsert | null {
  if (event.type !== "payment_intent.payment_failed") {
    return null;
  }

  const object = event.data.object as Record<string, unknown>;
  const metadata = metadataFrom(object);
  const paymentIntentId = asString(object.id) ?? event.id;
  const lastPaymentError = object.last_payment_error;
  const failure =
    lastPaymentError && typeof lastPaymentError === "object"
      ? (lastPaymentError as { code?: unknown; message?: unknown })
      : {};

  return {
    external_id: paymentIntentId,
    source: "stripe",
    transaction_external_id: paymentIntentId,
    customer_email: customerEmailFrom(object, metadata),
    product_name: metadata.product_name ?? fallbackProductName,
    amount_cents: asNumber(object.amount),
    currency: (asString(object.currency) ?? "usd").toLowerCase() as "usd",
    failed_at: fromUnixSeconds(object.created ?? event.created),
    failure_code: (asString(failure.code) ?? "unknown") as FailedPayment["failure_code"],
    failure_message: asString(failure.message) ?? "Payment failed",
    stripe_payment_intent_id: paymentIntentId,
    raw_event: rawEvent(event),
    synced_at: new Date().toISOString(),
    ...utmFrom(metadata),
  };
}

export function mapStripeEventToRefund(
  event: Stripe.Event | StripeLikeEvent,
): RefundInsert | null {
  if (event.type !== "refund.created" && event.type !== "charge.refunded") {
    return null;
  }

  const object = event.data.object as Record<string, unknown>;
  const refundLike =
    event.type === "charge.refunded"
      ? ((object.refunds as { data?: Record<string, unknown>[] } | undefined)
          ?.data?.[0] ?? object)
      : object;
  const metadata = metadataFrom(refundLike);
  const refundId = asString(refundLike.id) ?? event.id;
  const chargeId = stringId(refundLike.charge) ?? asString(object.id);
  const paymentIntentId =
    stringId(refundLike.payment_intent) ?? stringId(object.payment_intent);

  return {
    external_id: refundId,
    source: "stripe",
    transaction_external_id: paymentIntentId ?? chargeId,
    customer_email:
      metadata.customer_email ?? asString(object.billing_details) ?? "unknown@soundev.local",
    product_name: metadata.product_name ?? fallbackProductName,
    amount_cents: asNumber(refundLike.amount) || asNumber(object.amount_refunded),
    currency: (asString(refundLike.currency) ?? asString(object.currency) ?? "usd").toLowerCase() as "usd",
    refunded_at: fromUnixSeconds(refundLike.created ?? object.created ?? event.created),
    status: (asString(refundLike.status) ?? "succeeded") as Refund["status"],
    reason: asString(refundLike.reason),
    stripe_refund_id: refundId,
    stripe_charge_id: chargeId,
    stripe_payment_intent_id: paymentIntentId,
    raw_event: rawEvent(event),
    synced_at: new Date().toISOString(),
  };
}

export function mapStripeEventToSyncRun(
  event: Stripe.Event | StripeLikeEvent,
): SyncRunInsert {
  const timestamp = new Date().toISOString();

  return {
    external_id: event.id,
    source: "stripe",
    connection_id: null,
    provider: "Stripe",
    status: "success",
    started_at: fromUnixSeconds(event.created),
    finished_at: timestamp,
    records_processed: 1,
    error_message: null,
    synced_at: timestamp,
  };
}

export function stripeIntegrationState(
  env: Pick<NodeJS.ProcessEnv, "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET">,
): { status: "disconnected" | "ready" | "error"; detail: string } {
  if (!env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) {
    return {
      status: "disconnected",
      detail: "Stripe keys are not configured. Mock revenue data is being used.",
    };
  }

  if (env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) {
    return {
      status: "error",
      detail: "Stripe secret key exists, but the webhook secret is missing.",
    };
  }

  if (!env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET) {
    return {
      status: "error",
      detail: "Stripe webhook secret exists, but the server secret key is missing.",
    };
  }

  return {
    status: "ready",
    detail: "Stripe server credentials are present. Webhooks can be verified.",
  };
}
