import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe/client";
import {
  mapStripeEventToFailedPayment,
  mapStripeEventToRefund,
  mapStripeEventToSyncRun,
  mapStripeEventToTransaction,
} from "@/lib/stripe/events";

export const runtime = "nodejs";

const handledEvents = new Set([
  "checkout.session.completed",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.refunded",
  "refund.created",
]);

function json(
  body: Record<string, unknown>,
  init?: ResponseInit,
) {
  return Response.json(body, init);
}

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

async function persistStripeEvent(event: Parameters<typeof mapStripeEventToSyncRun>[0]) {
  const supabase = getSupabaseServiceRoleClient();

  if (!supabase) {
    return { stored: false, reason: "Supabase service role is not configured." };
  }

  const syncRun = mapStripeEventToSyncRun(event);
  const transaction = mapStripeEventToTransaction(event);
  const failedPayment = mapStripeEventToFailedPayment(event);
  const refund = mapStripeEventToRefund(event);

  if (transaction) {
    const { error } = await supabase
      .from("transactions")
      .upsert(transaction, { onConflict: "external_id" });

    if (error) {
      throw error;
    }
  }

  if (failedPayment) {
    const { error } = await supabase
      .from("failed_payments")
      .upsert(failedPayment, { onConflict: "external_id" });

    if (error) {
      throw error;
    }
  }

  if (refund) {
    const { error } = await supabase
      .from("refunds")
      .upsert(refund, { onConflict: "external_id" });

    if (error) {
      throw error;
    }
  }

  const { error } = await supabase
    .from("sync_runs")
    .upsert(syncRun, { onConflict: "external_id" });

  if (error) {
    throw error;
  }

  return { stored: true };
}

export async function POST(request: Request) {
  const stripe = getStripeServerClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return json(
      {
        ok: false,
        error: "Stripe webhook is not configured.",
        detail: isDevelopment()
          ? "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to verify incoming Stripe events."
          : undefined,
      },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return json(
      {
        ok: false,
        error: "Missing Stripe signature header.",
      },
      { status: 400 },
    );
  }

  let event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return json(
      {
        ok: false,
        error: "Stripe signature verification failed.",
        detail:
          isDevelopment() && error instanceof Error ? error.message : undefined,
      },
      { status: 400 },
    );
  }

  if (!handledEvents.has(event.type)) {
    return json({
      ok: true,
      ignored: true,
      eventType: event.type,
    });
  }

  try {
    const persistence = await persistStripeEvent(event);

    return json({
      ok: true,
      eventType: event.type,
      ...persistence,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        eventType: event.type,
        error: "Stripe event verified but could not be stored.",
        detail:
          isDevelopment() && error instanceof Error ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
