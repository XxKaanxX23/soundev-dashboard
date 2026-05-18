create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'stripe',
  customer_email text not null,
  product_name text not null,
  status text not null check (status in ('succeeded', 'failed', 'refunded')),
  amount_cents integer not null default 0,
  net_amount_cents integer not null default 0,
  currency text not null default 'usd',
  purchased_at timestamptz not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  payment_method_type text,
  raw_event jsonb not null default '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists failed_payments (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'stripe',
  transaction_external_id text,
  customer_email text not null,
  product_name text not null,
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  failed_at timestamptz not null,
  failure_code text not null,
  failure_message text not null,
  stripe_payment_intent_id text,
  raw_event jsonb not null default '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'stripe',
  transaction_external_id text,
  customer_email text not null,
  product_name text not null,
  amount_cents integer not null default 0,
  currency text not null default 'usd',
  refunded_at timestamptz not null,
  status text not null default 'succeeded',
  reason text,
  stripe_refund_id text,
  stripe_charge_id text,
  stripe_payment_intent_id text,
  raw_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'meta_ads',
  name text not null,
  status text not null,
  objective text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists ad_sets (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'meta_ads',
  campaign_id uuid not null references ad_campaigns(id) on delete cascade,
  name text not null,
  status text not null,
  audience text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'meta_ads',
  campaign_id uuid not null references ad_campaigns(id) on delete cascade,
  ad_set_id uuid not null references ad_sets(id) on delete cascade,
  name text not null,
  status text not null,
  creative_angle text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists ad_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'meta_ads',
  ad_id uuid not null references ads(id) on delete cascade,
  metric_date date not null,
  spend_cents integer not null default 0,
  impressions integer not null default 0,
  clicks integer not null default 0,
  purchases integer not null default 0,
  revenue_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz,
  unique(ad_id, metric_date)
);

create table if not exists ghl_contacts (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'gohighlevel',
  email text not null,
  first_name text,
  last_name text,
  name text,
  phone text,
  lead_source text,
  first_seen_at timestamptz not null,
  tags jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  raw_event jsonb not null default '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists ghl_opportunities (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'gohighlevel',
  contact_id uuid references ghl_contacts(id) on delete set null,
  pipeline_id text,
  pipeline_stage_id text,
  pipeline_stage_name text,
  pipeline_name text not null,
  stage_name text not null,
  status text not null,
  value_cents integer not null default 0,
  lead_source text,
  opened_at timestamptz not null,
  closed_at timestamptz,
  last_activity_at timestamptz,
  raw_event jsonb not null default '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists funnel_events (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'gohighlevel',
  contact_id uuid references ghl_contacts(id) on delete set null,
  customer_email text,
  event_name text not null,
  event_stage text not null,
  occurred_at timestamptz not null,
  value_cents integer,
  metadata jsonb not null default '{}'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists notion_creatives (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'notion',
  idea_title text not null,
  hook text not null,
  angle text not null,
  format text not null,
  status text not null,
  linked_campaign_name text,
  linked_ad_name text,
  spend_cents integer not null default 0,
  purchases integer not null default 0,
  revenue_cents integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists instagram_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'instagram',
  metric_date date not null,
  followers integer not null default 0,
  reach integer not null default 0,
  profile_visits integer not null default 0,
  link_clicks integer not null default 0,
  content_title text,
  content_format text,
  publish_date date,
  engagement_rate numeric(8, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists source_connections (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'manual',
  provider text not null,
  description text not null,
  status text not null,
  health text not null,
  detail text not null,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'manual',
  connection_id uuid references source_connections(id) on delete set null,
  provider text not null,
  status text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  records_processed integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create index if not exists transactions_purchased_at_idx on transactions(purchased_at);
create index if not exists transactions_utm_campaign_idx on transactions(utm_campaign);
create index if not exists failed_payments_failed_at_idx on failed_payments(failed_at);
create index if not exists refunds_refunded_at_idx on refunds(refunded_at);
create index if not exists ad_daily_metrics_metric_date_idx on ad_daily_metrics(metric_date);
create index if not exists funnel_events_occurred_at_idx on funnel_events(occurred_at);
create index if not exists notion_creatives_status_idx on notion_creatives(status);
create index if not exists instagram_daily_metrics_metric_date_idx on instagram_daily_metrics(metric_date);
create index if not exists sync_runs_started_at_idx on sync_runs(started_at);

drop trigger if exists set_transactions_updated_at on transactions;
create trigger set_transactions_updated_at before update on transactions
for each row execute function set_updated_at();

drop trigger if exists set_failed_payments_updated_at on failed_payments;
create trigger set_failed_payments_updated_at before update on failed_payments
for each row execute function set_updated_at();

drop trigger if exists set_refunds_updated_at on refunds;
create trigger set_refunds_updated_at before update on refunds
for each row execute function set_updated_at();

drop trigger if exists set_ad_campaigns_updated_at on ad_campaigns;
create trigger set_ad_campaigns_updated_at before update on ad_campaigns
for each row execute function set_updated_at();

drop trigger if exists set_ad_sets_updated_at on ad_sets;
create trigger set_ad_sets_updated_at before update on ad_sets
for each row execute function set_updated_at();

drop trigger if exists set_ads_updated_at on ads;
create trigger set_ads_updated_at before update on ads
for each row execute function set_updated_at();

drop trigger if exists set_ad_daily_metrics_updated_at on ad_daily_metrics;
create trigger set_ad_daily_metrics_updated_at before update on ad_daily_metrics
for each row execute function set_updated_at();

drop trigger if exists set_ghl_contacts_updated_at on ghl_contacts;
create trigger set_ghl_contacts_updated_at before update on ghl_contacts
for each row execute function set_updated_at();

drop trigger if exists set_ghl_opportunities_updated_at on ghl_opportunities;
create trigger set_ghl_opportunities_updated_at before update on ghl_opportunities
for each row execute function set_updated_at();

drop trigger if exists set_funnel_events_updated_at on funnel_events;
create trigger set_funnel_events_updated_at before update on funnel_events
for each row execute function set_updated_at();

drop trigger if exists set_notion_creatives_updated_at on notion_creatives;
create trigger set_notion_creatives_updated_at before update on notion_creatives
for each row execute function set_updated_at();

drop trigger if exists set_instagram_daily_metrics_updated_at on instagram_daily_metrics;
create trigger set_instagram_daily_metrics_updated_at before update on instagram_daily_metrics
for each row execute function set_updated_at();

drop trigger if exists set_source_connections_updated_at on source_connections;
create trigger set_source_connections_updated_at before update on source_connections
for each row execute function set_updated_at();

drop trigger if exists set_sync_runs_updated_at on sync_runs;
create trigger set_sync_runs_updated_at before update on sync_runs
for each row execute function set_updated_at();
