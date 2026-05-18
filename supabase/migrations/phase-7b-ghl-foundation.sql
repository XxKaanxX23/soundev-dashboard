alter table if exists ghl_contacts
  add column if not exists name text,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb,
  add column if not exists raw_event jsonb not null default '{}'::jsonb;

alter table if exists ghl_opportunities
  add column if not exists pipeline_id text,
  add column if not exists pipeline_stage_id text,
  add column if not exists pipeline_stage_name text,
  add column if not exists lead_source text,
  add column if not exists last_activity_at timestamptz,
  add column if not exists raw_event jsonb not null default '{}'::jsonb;
