
create table if not exists public.brand_woocommerce_settings (
  id                      uuid primary key default gen_random_uuid(),
  brand_id                uuid not null references brand_accounts(id) on delete cascade,
  woocommerce_site_url    text not null,
  woocommerce_webhook_url text not null,
  woocommerce_api_key     text not null,
  is_verified             boolean not null default false,
  last_verified_at        timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now(),
  unique(brand_id)
);

alter table public.discount_codes
  add column if not exists woocommerce_synced        boolean     not null default false,
  add column if not exists woocommerce_synced_at     timestamptz,
  add column if not exists woocommerce_sync_error    text;

alter table public.brand_woocommerce_settings enable row level security;

create policy "Brand can view own woocommerce settings"
  on public.brand_woocommerce_settings for select
  using (brand_id in (select id from brand_accounts where owner_user_id = auth.uid()));

create policy "Brand can insert own woocommerce settings"
  on public.brand_woocommerce_settings for insert
  with check (brand_id in (select id from brand_accounts where owner_user_id = auth.uid()));

create policy "Brand can update own woocommerce settings"
  on public.brand_woocommerce_settings for update
  using (brand_id in (select id from brand_accounts where owner_user_id = auth.uid()));

create policy "Brand can delete own woocommerce settings"
  on public.brand_woocommerce_settings for delete
  using (brand_id in (select id from brand_accounts where owner_user_id = auth.uid()));
