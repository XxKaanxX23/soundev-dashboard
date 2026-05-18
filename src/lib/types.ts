export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SourceName =
  | "stripe"
  | "meta_ads"
  | "gohighlevel"
  | "notion"
  | "instagram"
  | "manual"
  | "mock";

export type PurchaseStatus = "succeeded" | "failed" | "refunded";
export type FailedPaymentStatus =
  | "declined"
  | "blocked"
  | "expired"
  | "insufficient_funds"
  | "card_declined"
  | "unknown";
export type RefundStatus = "pending" | "succeeded" | "failed";
export type AdStatus = "active" | "paused" | "learning" | "winner" | "loser";
export type CreativeFormat =
  | "static"
  | "reel"
  | "UGC"
  | "carousel"
  | "product demo";
export type CreativeStatus =
  | "idea"
  | "scripted"
  | "filmed"
  | "edited"
  | "launched"
  | "paused"
  | "winner"
  | "loser";
export type SourceConnectionStatus =
  | "connected"
  | "ready"
  | "disconnected"
  | "loading"
  | "error"
  | "empty";
export type SourceConnectionHealth =
  | "healthy"
  | "setup-needed"
  | "loading"
  | "attention"
  | "empty";
export type SyncRunStatus = "queued" | "running" | "success" | "error";

export interface SyncedTableRow {
  id: string;
  external_id: string | null;
  source: SourceName;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export interface UtmFields {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

export interface Transaction extends SyncedTableRow, UtmFields {
  customer_email: string;
  product_name: string;
  status: PurchaseStatus;
  amount_cents: number;
  net_amount_cents: number;
  currency: "usd";
  purchased_at: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id?: string | null;
  payment_method_type?: string | null;
  raw_event: Json;
}

export interface FailedPayment extends SyncedTableRow, UtmFields {
  transaction_external_id: string | null;
  customer_email: string;
  product_name: string;
  amount_cents: number;
  currency: "usd";
  failed_at: string;
  failure_code: FailedPaymentStatus;
  failure_message: string;
  stripe_payment_intent_id: string | null;
  raw_event: Json;
}

export interface Refund extends SyncedTableRow {
  transaction_external_id: string | null;
  customer_email: string;
  product_name: string;
  amount_cents: number;
  currency: "usd";
  refunded_at: string;
  status: RefundStatus;
  reason: string | null;
  stripe_refund_id: string | null;
  stripe_charge_id: string | null;
  stripe_payment_intent_id: string | null;
  raw_event: Json;
}

export interface AdCampaign extends SyncedTableRow {
  name: string;
  status: AdStatus;
  objective: string | null;
}

export interface AdSet extends SyncedTableRow {
  campaign_id: string;
  name: string;
  status: AdStatus;
  audience: string | null;
}

export interface Ad extends SyncedTableRow, UtmFields {
  campaign_id: string;
  ad_set_id: string;
  name: string;
  status: AdStatus;
  creative_angle: string;
}

export interface AdDailyMetric extends SyncedTableRow {
  ad_id: string;
  metric_date: string;
  spend_cents: number;
  impressions: number;
  clicks: number;
  purchases: number;
  revenue_cents: number;
}

export interface GhlContact extends SyncedTableRow, UtmFields {
  email: string;
  first_name: string | null;
  last_name: string | null;
  name?: string | null;
  phone: string | null;
  lead_source: string | null;
  first_seen_at: string;
  tags?: Json;
  custom_fields?: Json;
  raw_event?: Json;
}

export interface GhlOpportunity extends SyncedTableRow, UtmFields {
  contact_id: string | null;
  pipeline_id?: string | null;
  pipeline_stage_id?: string | null;
  pipeline_stage_name?: string | null;
  pipeline_name: string;
  stage_name: string;
  status: string;
  value_cents: number;
  lead_source?: string | null;
  opened_at: string;
  closed_at: string | null;
  last_activity_at?: string | null;
  raw_event?: Json;
}

export interface FunnelEvent extends SyncedTableRow, UtmFields {
  contact_id: string | null;
  customer_email: string | null;
  event_name: string;
  event_stage: string;
  occurred_at: string;
  value_cents: number | null;
  metadata: Json;
}

export interface NotionCreative extends SyncedTableRow {
  idea_title: string;
  hook: string;
  angle: string;
  format: CreativeFormat;
  status: CreativeStatus;
  linked_campaign_name: string | null;
  linked_ad_name: string | null;
  spend_cents: number;
  purchases: number;
  revenue_cents: number;
  notes: string | null;
}

export interface InstagramDailyMetric extends SyncedTableRow {
  metric_date: string;
  followers: number;
  reach: number;
  profile_visits: number;
  link_clicks: number;
  content_title: string | null;
  content_format: "reel" | "carousel" | "static" | null;
  publish_date: string | null;
  engagement_rate: number | null;
}

export interface SourceConnection extends SyncedTableRow {
  provider: "Stripe" | "GoHighLevel" | "Meta Ads" | "Instagram" | "Notion";
  description: string;
  status: SourceConnectionStatus;
  health: SourceConnectionHealth;
  detail: string;
  last_sync_at: string | null;
}

export interface SyncRun extends SyncedTableRow {
  connection_id: string | null;
  provider: SourceConnection["provider"];
  status: SyncRunStatus;
  started_at: string;
  finished_at: string | null;
  records_processed: number;
  error_message: string | null;
}

export type StripeTransaction = {
  id: string;
  status: PurchaseStatus;
  customerEmail: string;
  productName: string;
  purchaseTimestamp: string;
  eventTimestamp?: string;
  amount: number;
  netAmount: number;
  utmSource: string;
  utmCampaign: string;
  utmContent: string;
  paymentIntentId?: string;
  chargeId?: string;
  refundId?: string;
};

export type MetaAd = {
  id?: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  dateStart?: string;
  dateStop?: string;
  campaign: string;
  adSet: string;
  adName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  cpa: number;
  revenue: number;
  roas: number;
  status: AdStatus;
  creativeAngle: string;
  signal?: "Winner" | "Promising" | "Watch" | "Needs More Spend" | "Losing" | "No Signal Yet";
};

export type FunnelStage = {
  stage: string;
  count: number;
  conversionRate: number;
  dropOff: number;
};

export type CreativeIdea = {
  ideaTitle: string;
  hook: string;
  angle: string;
  format: CreativeFormat;
  status: CreativeStatus;
  linkedCampaign: string;
  spend: number;
  purchases: number;
  cpa: number;
  roas: number;
  notes: string;
};

export type InstagramPost = {
  title: string;
  format: "reel" | "carousel" | "static";
  publishDate: string;
  reach: number;
  engagementRate: number;
  linkClicks: number;
};

export type DataHealthItem = {
  source: string;
  status: SourceConnectionHealth;
  detail: string;
  freshness: string;
};

type Table<Row extends SyncedTableRow> = {
  Row: Row;
  Insert: Partial<Omit<Row, "id" | "created_at" | "updated_at">> &
    Pick<Row, "source">;
  Update: Partial<Omit<Row, "id" | "created_at">>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      transactions: Table<Transaction>;
      failed_payments: Table<FailedPayment>;
      refunds: Table<Refund>;
      ad_campaigns: Table<AdCampaign>;
      ad_sets: Table<AdSet>;
      ads: Table<Ad>;
      ad_daily_metrics: Table<AdDailyMetric>;
      ghl_contacts: Table<GhlContact>;
      ghl_opportunities: Table<GhlOpportunity>;
      funnel_events: Table<FunnelEvent>;
      notion_creatives: Table<NotionCreative>;
      instagram_daily_metrics: Table<InstagramDailyMetric>;
      source_connections: Table<SourceConnection>;
      sync_runs: Table<SyncRun>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
