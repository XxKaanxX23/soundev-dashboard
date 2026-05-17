import {
  calculateBusinessMetrics,
  calculateMetricAlerts,
  calculateUtmCoverage,
} from "./metrics";
import { stripeIntegrationState } from "./stripe/events";
import type {
  Ad,
  AdCampaign,
  AdDailyMetric,
  AdSet,
  CreativeIdea,
  DataHealthItem,
  FailedPayment,
  FunnelEvent,
  FunnelStage,
  GhlContact,
  GhlOpportunity,
  InstagramDailyMetric,
  InstagramPost,
  MetaAd,
  NotionCreative,
  Refund,
  SourceConnection,
  StripeTransaction,
  SyncRun,
  Transaction,
} from "./types";

export type {
  CreativeIdea,
  DataHealthItem,
  FunnelStage,
  InstagramPost,
  MetaAd,
  SourceConnection,
  StripeTransaction,
};

export const product = {
  name: "Drum Mastery Suite",
  price: 67,
};

const now = "2026-05-15T23:45:00.000Z";

const baseRow = {
  created_at: now,
  updated_at: now,
  synced_at: "2026-05-15T23:40:00.000Z",
};

const stripeState = stripeIntegrationState({
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
});

const emptyUtm = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
};

const dollars = (cents: number) => cents / 100;
const rate = (value: number, denominator: number) =>
  denominator === 0 ? 0 : value / denominator;

export const transactions: Transaction[] = [
  {
    ...baseRow,
    id: "11111111-1111-4111-8111-111111111042",
    external_id: "ch_1042",
    source: "stripe",
    customer_email: "mara@beatlab.co",
    product_name: product.name,
    status: "succeeded",
    amount_cents: 6700,
    net_amount_cents: 6475,
    currency: "usd",
    purchased_at: "2026-05-15T21:44:00.000Z",
    stripe_checkout_session_id: "cs_1042",
    stripe_payment_intent_id: "pi_1042",
    raw_event: {},
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "cold_producers_drum_workflow",
    utm_content: "before_after_groove",
    utm_term: null,
  },
  {
    ...baseRow,
    id: "11111111-1111-4111-8111-111111111043",
    external_id: "ch_1043",
    source: "stripe",
    customer_email: "malik@drumpack.io",
    product_name: product.name,
    status: "succeeded",
    amount_cents: 6700,
    net_amount_cents: 6475,
    currency: "usd",
    purchased_at: "2026-05-15T22:16:00.000Z",
    stripe_checkout_session_id: "cs_1043",
    stripe_payment_intent_id: "pi_1043",
    raw_event: {},
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "checkout_recovery_weekend",
    utm_content: "discount_deadline_static",
    utm_term: null,
  },
  {
    ...baseRow,
    id: "11111111-1111-4111-8111-111111111044",
    external_id: "ch_1044",
    source: "stripe",
    customer_email: "sofia@hitroom.la",
    product_name: product.name,
    status: "succeeded",
    amount_cents: 6700,
    net_amount_cents: 6475,
    currency: "usd",
    purchased_at: "2026-05-15T23:02:00.000Z",
    stripe_checkout_session_id: "cs_1044",
    stripe_payment_intent_id: "pi_1044",
    raw_event: {},
    utm_source: "direct",
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
  },
  {
    ...baseRow,
    id: "11111111-1111-4111-8111-111111111041",
    external_id: "ch_1041",
    source: "stripe",
    customer_email: "jordan@loopcrate.com",
    product_name: product.name,
    status: "succeeded",
    amount_cents: 6700,
    net_amount_cents: 6475,
    currency: "usd",
    purchased_at: "2026-05-15T18:12:00.000Z",
    stripe_checkout_session_id: "cs_1041",
    stripe_payment_intent_id: "pi_1041",
    raw_event: {},
    utm_source: "instagram",
    utm_medium: "organic_social",
    utm_campaign: "organic_reels",
    utm_content: "5_minute_bounce",
    utm_term: null,
  },
  {
    ...baseRow,
    id: "11111111-1111-4111-8111-111111111040",
    external_id: "ch_1040",
    source: "stripe",
    customer_email: "ty@808camp.net",
    product_name: product.name,
    status: "failed",
    amount_cents: 6700,
    net_amount_cents: 0,
    currency: "usd",
    purchased_at: "2026-05-15T17:39:00.000Z",
    stripe_checkout_session_id: "cs_1040",
    stripe_payment_intent_id: "pi_1040",
    raw_event: {},
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "retargeting_checkout",
    utm_content: "producer_testimonial",
    utm_term: null,
  },
  {
    ...baseRow,
    id: "11111111-1111-4111-8111-111111111039",
    external_id: "ch_1039",
    source: "stripe",
    customer_email: "devon@sounddesk.io",
    product_name: product.name,
    status: "refunded",
    amount_cents: 6700,
    net_amount_cents: 0,
    currency: "usd",
    purchased_at: "2026-05-14T13:05:00.000Z",
    stripe_checkout_session_id: "cs_1039",
    stripe_payment_intent_id: "pi_1039",
    raw_event: {},
    utm_source: "email",
    utm_medium: "email",
    utm_campaign: "drum_mastery_waitlist",
    utm_content: "launch_day_offer",
    utm_term: null,
  },
  {
    ...baseRow,
    id: "11111111-1111-4111-8111-111111111038",
    external_id: "ch_1038",
    source: "stripe",
    customer_email: "nina@samplehouse.com",
    product_name: product.name,
    status: "succeeded",
    amount_cents: 6700,
    net_amount_cents: 6475,
    currency: "usd",
    purchased_at: "2026-05-14T09:21:00.000Z",
    stripe_checkout_session_id: "cs_1038",
    stripe_payment_intent_id: "pi_1038",
    raw_event: {},
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "cold_producers_drum_workflow",
    utm_content: "problem_solution_static",
    utm_term: null,
  },
  {
    ...baseRow,
    id: "11111111-1111-4111-8111-111111111037",
    external_id: "ch_1037",
    source: "stripe",
    customer_email: "eli@clubroom.studio",
    product_name: product.name,
    status: "succeeded",
    amount_cents: 6700,
    net_amount_cents: 6475,
    currency: "usd",
    purchased_at: "2026-05-13T22:11:00.000Z",
    stripe_checkout_session_id: "cs_1037",
    stripe_payment_intent_id: "pi_1037",
    raw_event: {},
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "lookalike_buyers",
    utm_content: "workflow_screen_recording",
    utm_term: null,
  },
];

export const failedPayments: FailedPayment[] = [
  {
    ...baseRow,
    id: "22222222-2222-4222-8222-222222221040",
    external_id: "pi_1040_failed",
    source: "stripe",
    transaction_external_id: "ch_1040",
    customer_email: "ty@808camp.net",
    product_name: product.name,
    amount_cents: 6700,
    currency: "usd",
    failed_at: "2026-05-15T17:39:00.000Z",
    failure_code: "declined",
    failure_message: "Card declined by issuer",
    stripe_payment_intent_id: "pi_1040",
    raw_event: {},
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "retargeting_checkout",
    utm_content: "producer_testimonial",
    utm_term: null,
  },
];

export const refunds: Refund[] = [
  {
    ...baseRow,
    id: "33333333-3333-4333-8333-333333331039",
    external_id: "re_1039",
    source: "stripe",
    transaction_external_id: "ch_1039",
    customer_email: "devon@sounddesk.io",
    product_name: product.name,
    amount_cents: 6700,
    currency: "usd",
    refunded_at: "2026-05-14T18:22:00.000Z",
    status: "succeeded",
    reason: "Duplicate purchase",
    stripe_refund_id: "re_1039",
    stripe_charge_id: "ch_1039",
    stripe_payment_intent_id: "pi_1039",
    raw_event: {},
  },
];

export const adCampaigns: AdCampaign[] = [
  {
    ...baseRow,
    id: "44444444-4444-4444-8444-444444440001",
    external_id: "cmp_cold_workflow",
    source: "meta_ads",
    name: "Cold Producers - Drum Workflow",
    status: "active",
    objective: "sales",
  },
  {
    ...baseRow,
    id: "44444444-4444-4444-8444-444444440002",
    external_id: "cmp_lal_buyers",
    source: "meta_ads",
    name: "Lookalike Buyers",
    status: "winner",
    objective: "sales",
  },
  {
    ...baseRow,
    id: "44444444-4444-4444-8444-444444440003",
    external_id: "cmp_checkout_retargeting",
    source: "meta_ads",
    name: "Checkout Retargeting",
    status: "active",
    objective: "sales",
  },
];

export const adSets: AdSet[] = [
  {
    ...baseRow,
    id: "55555555-5555-4555-8555-555555550001",
    external_id: "set_us_18_34",
    source: "meta_ads",
    campaign_id: adCampaigns[0].id,
    name: "US 18-34 beat makers",
    status: "active",
    audience: "US producers, beat makers, drum kit buyers",
  },
  {
    ...baseRow,
    id: "55555555-5555-4555-8555-555555550002",
    external_id: "set_lal_1p",
    source: "meta_ads",
    campaign_id: adCampaigns[1].id,
    name: "1% purchaser LAL",
    status: "winner",
    audience: "1% lookalike of purchasers",
  },
  {
    ...baseRow,
    id: "55555555-5555-4555-8555-555555550003",
    external_id: "set_checkout_7d",
    source: "meta_ads",
    campaign_id: adCampaigns[2].id,
    name: "7 day checkout abandoners",
    status: "active",
    audience: "Checkout starts, 7 day window",
  },
  {
    ...baseRow,
    id: "55555555-5555-4555-8555-555555550004",
    external_id: "set_can_uk",
    source: "meta_ads",
    campaign_id: adCampaigns[0].id,
    name: "Canada + UK producers",
    status: "learning",
    audience: "Canada and UK producers",
  },
  {
    ...baseRow,
    id: "55555555-5555-4555-8555-555555550005",
    external_id: "set_us_25_44",
    source: "meta_ads",
    campaign_id: adCampaigns[0].id,
    name: "US 25-44 sample buyers",
    status: "loser",
    audience: "US sample pack and drum kit buyers",
  },
];

export const ads: Ad[] = [
  {
    ...baseRow,
    ...emptyUtm,
    id: "66666666-6666-4666-8666-666666660001",
    external_id: "ad_before_after",
    source: "meta_ads",
    campaign_id: adCampaigns[0].id,
    ad_set_id: adSets[0].id,
    name: "Before/After Groove Reel",
    status: "active",
    creative_angle: "Boring drums to finished bounce",
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "cold_producers_drum_workflow",
    utm_content: "before_after_groove",
  },
  {
    ...baseRow,
    ...emptyUtm,
    id: "66666666-6666-4666-8666-666666660002",
    external_id: "ad_workflow_screen",
    source: "meta_ads",
    campaign_id: adCampaigns[1].id,
    ad_set_id: adSets[1].id,
    name: "Workflow Screen Recording",
    status: "winner",
    creative_angle: "Fast workflow proof",
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "lookalike_buyers",
    utm_content: "workflow_screen_recording",
  },
  {
    ...baseRow,
    ...emptyUtm,
    id: "66666666-6666-4666-8666-666666660003",
    external_id: "ad_testimonial",
    source: "meta_ads",
    campaign_id: adCampaigns[2].id,
    ad_set_id: adSets[2].id,
    name: "Producer Testimonial",
    status: "active",
    creative_angle: "Social proof",
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "retargeting_checkout",
    utm_content: "producer_testimonial",
  },
  {
    ...baseRow,
    ...emptyUtm,
    id: "66666666-6666-4666-8666-666666660004",
    external_id: "ad_problem_solution",
    source: "meta_ads",
    campaign_id: adCampaigns[0].id,
    ad_set_id: adSets[3].id,
    name: "Problem/Solution Static",
    status: "learning",
    creative_angle: "Fix weak drum loops",
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "cold_producers_drum_workflow",
    utm_content: "problem_solution_static",
  },
  {
    ...baseRow,
    ...emptyUtm,
    id: "66666666-6666-4666-8666-666666660005",
    external_id: "ad_overpriced_kits",
    source: "meta_ads",
    campaign_id: adCampaigns[0].id,
    ad_set_id: adSets[4].id,
    name: "Overpriced Drum Kits Static",
    status: "loser",
    creative_angle: "Stop buying more kits",
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "cold_producers_drum_workflow",
    utm_content: "overpriced_drum_kits_static",
  },
];

export const adDailyMetrics: AdDailyMetric[] = [
  {
    ...baseRow,
    id: "77777777-7777-4777-8777-777777770001",
    external_id: "metric_before_after_2026_05_15",
    source: "meta_ads",
    ad_id: ads[0].id,
    metric_date: "2026-05-15",
    spend_cents: 68400,
    impressions: 54320,
    clicks: 1510,
    purchases: 31,
    revenue_cents: 207700,
  },
  {
    ...baseRow,
    id: "77777777-7777-4777-8777-777777770002",
    external_id: "metric_workflow_2026_05_15",
    source: "meta_ads",
    ad_id: ads[1].id,
    metric_date: "2026-05-15",
    spend_cents: 51600,
    impressions: 38240,
    clicks: 1128,
    purchases: 28,
    revenue_cents: 187600,
  },
  {
    ...baseRow,
    id: "77777777-7777-4777-8777-777777770003",
    external_id: "metric_testimonial_2026_05_15",
    source: "meta_ads",
    ad_id: ads[2].id,
    metric_date: "2026-05-15",
    spend_cents: 24800,
    impressions: 11890,
    clicks: 406,
    purchases: 18,
    revenue_cents: 120600,
  },
  {
    ...baseRow,
    id: "77777777-7777-4777-8777-777777770004",
    external_id: "metric_problem_solution_2026_05_15",
    source: "meta_ads",
    ad_id: ads[3].id,
    metric_date: "2026-05-15",
    spend_cents: 39200,
    impressions: 30670,
    clicks: 684,
    purchases: 10,
    revenue_cents: 67000,
  },
  {
    ...baseRow,
    id: "77777777-7777-4777-8777-777777770005",
    external_id: "metric_overpriced_2026_05_15",
    source: "meta_ads",
    ad_id: ads[4].id,
    metric_date: "2026-05-15",
    spend_cents: 161000,
    impressions: 74500,
    clicks: 1548,
    purchases: 4,
    revenue_cents: 26800,
  },
];

export const ghlContacts: GhlContact[] = [
  {
    ...baseRow,
    id: "88888888-8888-4888-8888-888888880001",
    external_id: "ghl_contact_001",
    source: "gohighlevel",
    email: "mara@beatlab.co",
    first_name: "Mara",
    last_name: null,
    phone: null,
    lead_source: "Meta Ads",
    first_seen_at: "2026-05-09T15:18:00.000Z",
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "cold_producers_drum_workflow",
    utm_content: "before_after_groove",
    utm_term: null,
  },
];

export const ghlOpportunities: GhlOpportunity[] = [
  {
    ...baseRow,
    id: "99999999-9999-4999-8999-999999990001",
    external_id: "ghl_opp_001",
    source: "gohighlevel",
    contact_id: ghlContacts[0].id,
    pipeline_name: "Drum Mastery Suite",
    stage_name: "Purchased",
    status: "won",
    value_cents: 6700,
    opened_at: "2026-05-09T15:20:00.000Z",
    closed_at: "2026-05-15T21:44:00.000Z",
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "cold_producers_drum_workflow",
    utm_content: "before_after_groove",
    utm_term: null,
  },
];

export const funnelEvents: FunnelEvent[] = [
  {
    ...baseRow,
    ...emptyUtm,
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001",
    external_id: "funnel_leads",
    source: "gohighlevel",
    contact_id: null,
    customer_email: null,
    event_name: "Lead created",
    event_stage: "Leads",
    occurred_at: "2026-05-15T09:00:00.000Z",
    value_cents: null,
    metadata: { count: 860, drop_off: 0 },
  },
  {
    ...baseRow,
    ...emptyUtm,
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002",
    external_id: "funnel_checkout_starts",
    source: "gohighlevel",
    contact_id: null,
    customer_email: null,
    event_name: "Checkout started",
    event_stage: "Checkout starts",
    occurred_at: "2026-05-15T10:00:00.000Z",
    value_cents: null,
    metadata: { count: 146, drop_off: 714 },
  },
  {
    ...baseRow,
    ...emptyUtm,
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003",
    external_id: "funnel_purchases",
    source: "gohighlevel",
    contact_id: null,
    customer_email: null,
    event_name: "Purchased",
    event_stage: "Purchases",
    occurred_at: "2026-05-15T11:00:00.000Z",
    value_cents: 616400,
    metadata: { count: 92, drop_off: 54 },
  },
  {
    ...baseRow,
    ...emptyUtm,
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0004",
    external_id: "funnel_failed_payments",
    source: "gohighlevel",
    contact_id: null,
    customer_email: null,
    event_name: "Payment failed",
    event_stage: "Failed payments",
    occurred_at: "2026-05-15T12:00:00.000Z",
    value_cents: null,
    metadata: { count: 12, drop_off: 0 },
  },
  {
    ...baseRow,
    ...emptyUtm,
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0005",
    external_id: "funnel_refunds",
    source: "gohighlevel",
    contact_id: null,
    customer_email: null,
    event_name: "Refunded",
    event_stage: "Refunds",
    occurred_at: "2026-05-15T13:00:00.000Z",
    value_cents: 40200,
    metadata: { count: 6, drop_off: 0 },
  },
];

export const notionCreatives: NotionCreative[] = [
  {
    ...baseRow,
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001",
    external_id: "notion_creative_001",
    source: "notion",
    idea_title: "Turn dead loops into drums that move",
    hook: "Your drums are not bad, they are unfinished.",
    angle: "Workflow transformation",
    format: "reel",
    status: "winner",
    linked_campaign_name: "Cold Producers - Drum Workflow",
    linked_ad_name: "Before/After Groove Reel",
    spend_cents: 68400,
    purchases: 31,
    revenue_cents: 207700,
    notes: "Keep first 3 seconds. Test slower voiceover.",
  },
  {
    ...baseRow,
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002",
    external_id: "notion_creative_002",
    source: "notion",
    idea_title: "Five-minute bounce build",
    hook: "Build the pocket before you pick another sample.",
    angle: "Speed and clarity",
    format: "product demo",
    status: "launched",
    linked_campaign_name: "Lookalike Buyers",
    linked_ad_name: "Workflow Screen Recording",
    spend_cents: 51600,
    purchases: 28,
    revenue_cents: 187600,
    notes: "Strong for warm audiences and organic reposts.",
  },
  {
    ...baseRow,
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003",
    external_id: "notion_creative_003",
    source: "notion",
    idea_title: "Producer testimonial cutdown",
    hook: "I stopped fighting my drums after this system.",
    angle: "Social proof",
    format: "UGC",
    status: "edited",
    linked_campaign_name: "Checkout Retargeting",
    linked_ad_name: "Producer Testimonial",
    spend_cents: 24800,
    purchases: 18,
    revenue_cents: 120600,
    notes: "Needs captions tightened before scaling.",
  },
  {
    ...baseRow,
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0004",
    external_id: "notion_creative_004",
    source: "notion",
    idea_title: "Weak drum loop checklist",
    hook: "If your drums feel flat, check these four things.",
    angle: "Education",
    format: "carousel",
    status: "scripted",
    linked_campaign_name: null,
    linked_ad_name: null,
    spend_cents: 0,
    purchases: 0,
    revenue_cents: 0,
    notes: "Use as Instagram lead-in to demo reel.",
  },
];

export const instagramDailyMetrics: InstagramDailyMetric[] = [
  {
    ...baseRow,
    id: "cccccccc-cccc-4ccc-8ccc-cccccccc0001",
    external_id: "ig_2026_05_15",
    source: "instagram",
    metric_date: "2026-05-15",
    followers: 18420,
    reach: 128600,
    profile_visits: 6240,
    link_clicks: 1184,
    content_title: null,
    content_format: null,
    publish_date: null,
    engagement_rate: null,
  },
  {
    ...baseRow,
    id: "cccccccc-cccc-4ccc-8ccc-cccccccc0002",
    external_id: "ig_post_001",
    source: "instagram",
    metric_date: "2026-05-14",
    followers: 18420,
    reach: 42600,
    profile_visits: 0,
    link_clicks: 486,
    content_title: "5 minute drum pocket build",
    content_format: "reel",
    publish_date: "2026-05-14",
    engagement_rate: 0.074,
  },
  {
    ...baseRow,
    id: "cccccccc-cccc-4ccc-8ccc-cccccccc0003",
    external_id: "ig_post_002",
    source: "instagram",
    metric_date: "2026-05-12",
    followers: 18380,
    reach: 28400,
    profile_visits: 0,
    link_clicks: 214,
    content_title: "Weak loops checklist",
    content_format: "carousel",
    publish_date: "2026-05-12",
    engagement_rate: 0.061,
  },
  {
    ...baseRow,
    id: "cccccccc-cccc-4ccc-8ccc-cccccccc0004",
    external_id: "ig_post_003",
    source: "instagram",
    metric_date: "2026-05-09",
    followers: 18290,
    reach: 51200,
    profile_visits: 0,
    link_clicks: 392,
    content_title: "Before and after bounce",
    content_format: "reel",
    publish_date: "2026-05-09",
    engagement_rate: 0.083,
  },
  {
    ...baseRow,
    id: "cccccccc-cccc-4ccc-8ccc-cccccccc0005",
    external_id: "ig_post_004",
    source: "instagram",
    metric_date: "2026-05-07",
    followers: 18240,
    reach: 6400,
    profile_visits: 0,
    link_clicks: 92,
    content_title: "Drum bus cleanup tip",
    content_format: "static",
    publish_date: "2026-05-07",
    engagement_rate: 0.038,
  },
];

export const sourceConnections: SourceConnection[] = [
  {
    ...baseRow,
    id: "dddddddd-dddd-4ddd-8ddd-dddddddd0001",
    external_id: "stripe",
    source: "manual",
    provider: "Stripe",
    description: "Purchases, refunds, failed payments, customer records",
    status: stripeState.status,
    health:
      stripeState.status === "ready"
        ? "healthy"
        : stripeState.status === "error"
          ? "attention"
          : "setup-needed",
    detail: stripeState.detail,
    last_sync_at: null,
  },
  {
    ...baseRow,
    id: "dddddddd-dddd-4ddd-8ddd-dddddddd0002",
    external_id: "gohighlevel",
    source: "manual",
    provider: "GoHighLevel",
    description: "Leads, funnel events, checkout starts, pipeline context",
    status: "loading",
    health: "loading",
    detail: "Future import state shown with mock funnel stages.",
    last_sync_at: null,
  },
  {
    ...baseRow,
    id: "dddddddd-dddd-4ddd-8ddd-dddddddd0003",
    external_id: "meta_ads",
    source: "manual",
    provider: "Meta Ads",
    description: "Campaign spend, performance, ad-level creative metrics",
    status: "connected",
    health: "healthy",
    detail:
      "Mock campaign data is complete for spend, clicks, purchases, CPA, and ROAS.",
    last_sync_at: "2026-05-15T23:40:00.000Z",
  },
  {
    ...baseRow,
    id: "dddddddd-dddd-4ddd-8ddd-dddddddd0004",
    external_id: "instagram",
    source: "manual",
    provider: "Instagram",
    description: "Reach, profile visits, link clicks, top content",
    status: "empty",
    health: "empty",
    detail: "No real account connected. Organic analytics are sample values.",
    last_sync_at: null,
  },
  {
    ...baseRow,
    id: "dddddddd-dddd-4ddd-8ddd-dddddddd0005",
    external_id: "notion",
    source: "manual",
    provider: "Notion",
    description: "Ad ideas, scripts, hooks, creative production status",
    status: "error",
    health: "attention",
    detail: "Mock error state for future API failures and permissions issues.",
    last_sync_at: null,
  },
];

export const syncRuns: SyncRun[] = [
  {
    ...baseRow,
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeee0001",
    external_id: "mock_meta_sync_2026_05_15",
    source: "manual",
    connection_id: sourceConnections[2].id,
    provider: "Meta Ads",
    status: "success",
    started_at: "2026-05-15T23:38:00.000Z",
    finished_at: "2026-05-15T23:40:00.000Z",
    records_processed: 15,
    error_message: null,
  },
];

export const stripeTransactions: StripeTransaction[] = transactions.map(
  (transaction) => ({
    id: transaction.external_id ?? transaction.id,
    status: transaction.status,
    customerEmail: transaction.customer_email,
    productName: transaction.product_name,
    purchaseTimestamp: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(transaction.purchased_at)),
    amount: dollars(transaction.amount_cents),
    netAmount: dollars(transaction.net_amount_cents),
    utmSource: transaction.utm_source ?? "",
    utmCampaign: transaction.utm_campaign ?? "",
    utmContent: transaction.utm_content ?? "",
  }),
);

export const metaAds: MetaAd[] = adDailyMetrics.map((metric) => {
  const ad = ads.find((item) => item.id === metric.ad_id);
  const adSet = adSets.find((item) => item.id === ad?.ad_set_id);
  const campaign = adCampaigns.find((item) => item.id === ad?.campaign_id);
  const spend = dollars(metric.spend_cents);
  const revenue = dollars(metric.revenue_cents);

  return {
    campaign: campaign?.name ?? "Unknown campaign",
    adSet: adSet?.name ?? "Unknown ad set",
    adName: ad?.name ?? "Unknown ad",
    spend,
    impressions: metric.impressions,
    clicks: metric.clicks,
    ctr: rate(metric.clicks, metric.impressions),
    cpc: rate(spend, metric.clicks),
    cpm: rate(spend * 1000, metric.impressions),
    purchases: metric.purchases,
    cpa: rate(spend, metric.purchases),
    revenue,
    roas: rate(revenue, spend),
    status: ad?.status ?? "paused",
    creativeAngle: ad?.creative_angle ?? "Unknown",
  };
});

export const funnelStages: FunnelStage[] = funnelEvents.map((event, index) => {
  const count =
    typeof event.metadata === "object" &&
    event.metadata !== null &&
    !Array.isArray(event.metadata) &&
    typeof event.metadata.count === "number"
      ? event.metadata.count
      : 0;
  const previousCount =
    index === 0
      ? count
      : Number(
          (funnelEvents[index - 1].metadata as { count?: number }).count ?? 0,
        );
  const dropOff =
    typeof event.metadata === "object" &&
    event.metadata !== null &&
    !Array.isArray(event.metadata) &&
    typeof event.metadata.drop_off === "number"
      ? event.metadata.drop_off
      : 0;

  return {
    stage: event.event_stage,
    count,
    conversionRate: index === 0 ? 1 : rate(count, previousCount),
    dropOff,
  };
});

export const creativeIdeas: CreativeIdea[] = notionCreatives.map((creative) => {
  const spend = dollars(creative.spend_cents);
  const revenue = dollars(creative.revenue_cents);

  return {
    ideaTitle: creative.idea_title,
    hook: creative.hook,
    angle: creative.angle,
    format: creative.format,
    status: creative.status,
    linkedCampaign: creative.linked_ad_name ?? creative.linked_campaign_name ?? "Unassigned",
    spend,
    purchases: creative.purchases,
    cpa: rate(spend, creative.purchases),
    roas: rate(revenue, spend),
    notes: creative.notes ?? "",
  };
});

export const instagramSummary = {
  followers: instagramDailyMetrics[0].followers,
  reach: instagramDailyMetrics[0].reach,
  profileVisits: instagramDailyMetrics[0].profile_visits,
  linkClicks: instagramDailyMetrics[0].link_clicks,
};

export const instagramPosts: InstagramPost[] = instagramDailyMetrics
  .filter((metric) => metric.content_title && metric.content_format && metric.publish_date)
  .map((metric) => ({
    title: metric.content_title ?? "",
    format: metric.content_format ?? "static",
    publishDate: metric.publish_date ?? metric.metric_date,
    reach: metric.reach,
    engagementRate: metric.engagement_rate ?? 0,
    linkClicks: metric.link_clicks,
  }));

export const revenueTrend = [
  { date: "May 9", grossRevenue: 536, netRevenue: 469, purchases: 8 },
  { date: "May 10", grossRevenue: 737, netRevenue: 670, purchases: 11 },
  { date: "May 11", grossRevenue: 670, netRevenue: 603, purchases: 10 },
  { date: "May 12", grossRevenue: 1005, netRevenue: 938, purchases: 15 },
  { date: "May 13", grossRevenue: 804, netRevenue: 737, purchases: 12 },
  { date: "May 14", grossRevenue: 1273, netRevenue: 1139, purchases: 19 },
  { date: "May 15", grossRevenue: 1139, netRevenue: 1072, purchases: 17 },
];

export const channelRevenue = [
  { channel: "Meta Ads", revenue: 6097, purchases: 91 },
  { channel: "Direct", revenue: 67, purchases: 1 },
  { channel: "Instagram", revenue: 0, purchases: 0 },
  { channel: "Email", revenue: 0, purchases: 0 },
];

export const overviewMetrics = calculateBusinessMetrics({
  grossRevenue: 6164,
  refunds: 6,
  adSpend: 3450,
  purchases: 92,
  leads: 860,
  failedPayments: 12,
  checkoutStarts: 146,
  productPrice: product.price,
});

export const dashboardSnapshot = {
  successfulPurchases: 92,
  failedPayments: 12,
  refunds: 6,
  checkoutStarts: 146,
  leads: 860,
  appointments: 0,
  averageOrderValue: product.price,
};

export const utmCoverage = calculateUtmCoverage(stripeTransactions);

export const metricAlerts = calculateMetricAlerts({
  cpa: overviewMetrics.cpa,
  roas: overviewMetrics.roas,
  failedPaymentRate: overviewMetrics.failedPaymentRate,
  refundRate: overviewMetrics.refundRate,
  hasCreativeWinner: creativeIdeas.some((idea) => idea.status === "winner"),
});

export const nextActions = [
  {
    title: "Scale the current winner carefully",
    body: "The workflow screen recording and testimonial angles are carrying the account. Duplicate the winning structure into 2-3 new hooks before increasing budget aggressively.",
  },
  {
    title: "Fix failed payments before judging the funnel",
    body: "Failed payments are above the watch line, so some checkout demand is being lost after the buyer has already raised their hand.",
  },
  {
    title: "Pause or rewrite the weak static angle",
    body: "The overpriced drum kits static has low CTR and weak ROAS. Keep the learning, but avoid putting more budget behind that exact message.",
  },
  {
    title: "Clean up UTM tracking",
    body: "A few purchases are missing complete source, campaign, and content tags. Better tracking will make creative and channel decisions clearer.",
  },
];

export const dataHealthItems: DataHealthItem[] = sourceConnections.map(
  (connection) => ({
    source: `${connection.provider} data status`,
    status: connection.health,
    detail: connection.detail,
    freshness: connection.last_sync_at
      ? `Mock sync: ${new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(new Date(connection.last_sync_at))}`
      : "Mock-only, no live sync",
  }),
);
