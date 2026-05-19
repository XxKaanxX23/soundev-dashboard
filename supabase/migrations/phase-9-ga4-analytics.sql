create table if not exists ga4_event_metrics (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  source text not null default 'ga4',
  metric_date date not null,
  event_name text not null,
  page_path text,
  page_location text,
  source_name text,
  medium text,
  campaign text,
  event_count integer not null default 0,
  active_users integer not null default 0,
  sessions integer not null default 0,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  synced_at timestamptz
);

create index if not exists ga4_event_metrics_metric_date_idx
  on ga4_event_metrics(metric_date);

create index if not exists ga4_event_metrics_event_name_idx
  on ga4_event_metrics(event_name);

drop trigger if exists set_ga4_event_metrics_updated_at on ga4_event_metrics;
create trigger set_ga4_event_metrics_updated_at before update on ga4_event_metrics
for each row execute function set_updated_at();
