-- 地域資源のゆずりあい・貸し借り（シェア掲示板）機能のためのテーブル追加。
-- Supabase MCP が有効化されていない環境で書かれたため、まだ自動実行されていません。
-- 本番のSupabaseプロジェクトに対して、SQL Editor（またはSupabase MCPのexecute_sql）で
-- 一度だけ実行してください。IF NOT EXISTS 付きなので再実行しても安全です。

create table if not exists public.share_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('貸します', '借りたい', '譲ります', '探してます')),
  price_type text not null default '無償' check (price_type in ('無償', '有償・要相談')),
  title text not null,
  municipality text,
  image_url text,
  description text,
  contact_email text not null,
  status text not null default '受付中' check (status in ('受付中', '解決済み・終了')),
  created_at timestamptz not null default now()
);

create index if not exists share_items_status_idx on public.share_items (status);
create index if not exists share_items_type_idx on public.share_items (type);
create index if not exists share_items_user_id_idx on public.share_items (user_id);

alter table public.share_items enable row level security;

-- 「受付中」の投稿は誰でも閲覧できる（掲示板として一般公開）。投稿者本人は自分の
-- 「解決済み・終了」の投稿もマイページで確認できるよう、本人分は状態に関わらず見える。
drop policy if exists "share_items_select_public" on public.share_items;
create policy "share_items_select_public" on public.share_items
  for select using (status = '受付中' or auth.uid() = user_id);

drop policy if exists "share_items_insert_own" on public.share_items;
create policy "share_items_insert_own" on public.share_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "share_items_update_own" on public.share_items;
create policy "share_items_update_own" on public.share_items
  for update using (auth.uid() = user_id);

drop policy if exists "share_items_delete_own" on public.share_items;
create policy "share_items_delete_own" on public.share_items
  for delete using (auth.uid() = user_id);

-- 投稿フォームの「画像ファイルアップロード」は、activities.image_url と全く同じ方式
-- （クライアント側でリサイズ・再エンコードした base64 データURLをそのままカラムに保存）
-- に統一したため、Supabase Storage のバケットは不要（以前のバージョンではここで
-- share-items バケットを作成していたが、未作成環境でアップロードが失敗する原因に
-- なっていたため廃止した）。
