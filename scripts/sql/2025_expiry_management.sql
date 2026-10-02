-- 掲載期間管理（活動・応援企業・SHOP）機能のためのスキーマ追加。
-- Supabase MCP が有効化されていない環境で書かれたため、まだ自動実行されていません。
-- 本番のSupabaseプロジェクトに対して、SQL Editor（またはSupabase MCPのexecute_sql）で
-- 一度だけ実行してください。すべて IF NOT EXISTS 付きなので再実行しても安全です。

-- 1. activities: 定例活動（最長1年）の掲載期限と通知フラグ
alter table public.activities
  add column if not exists expires_at timestamptz,
  add column if not exists expiry_notified_30d boolean not null default false,
  add column if not exists expiry_notified_7d boolean not null default false,
  add column if not exists expiry_notified_end boolean not null default false;

-- 2. partners（応援企業・協賛パートナー）: 掲載期限・連絡先メール・通知フラグ
alter table public.partners
  add column if not exists expires_at timestamptz,
  add column if not exists contact_email text,
  add column if not exists expiry_notified_30d boolean not null default false;

-- 3. shop_products（応援SHOP）: 掲載期限・連絡先メール・通知フラグ
alter table public.shop_products
  add column if not exists expires_at timestamptz,
  add column if not exists contact_email text,
  add column if not exists expiry_notified_30d boolean not null default false;

-- 期限切れ判定・通知バッチのクエリを高速化するための索引。
create index if not exists activities_expires_at_idx on public.activities (expires_at);
create index if not exists partners_expires_at_idx on public.partners (expires_at);
create index if not exists shop_products_expires_at_idx on public.shop_products (expires_at);
