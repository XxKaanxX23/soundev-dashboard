alter table if exists transactions
  add column if not exists stripe_charge_id text;

alter table if exists transactions
  add column if not exists payment_method_type text;
