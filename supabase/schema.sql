-- 24 Creative Studio — Base de dados, autenticação, stock e segurança
-- Execute este ficheiro inteiro no SQL Editor de um NOVO projeto Supabase.

create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  sort_order integer not null default 0, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  description text, hero_image_url text, sort_order integer not null default 0, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(), name text not null unique, hex_code text not null default '#000000',
  sort_order integer not null default 0, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint colors_hex check (hex_code ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.sizes (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  sort_order integer not null default 0, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  collection_id uuid references public.collections(id) on delete set null,
  name text not null, slug text not null unique, sku text unique,
  description text, details text,
  price numeric(12,2) check (price is null or price >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  active boolean not null default true, featured boolean not null default false,
  new_drop boolean not null default false, personalization_available boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint sale_not_above_price check (sale_price is null or price is null or sale_price <= price)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_id uuid not null references public.colors(id) on delete restrict,
  size_id uuid not null references public.sizes(id) on delete restrict,
  sku text unique, stock integer not null default 0 check (stock >= 0), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(product_id, color_id, size_id)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_id uuid references public.colors(id) on delete set null,
  url text not null, alt_text text, sort_order integer not null default 0, is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), order_number text not null unique,
  customer_name text, customer_phone text, delivery_zone text, notes text,
  total numeric(12,2) not null default 0 check (total >= 0), source text not null default 'website',
  status text not null default 'Novo' check (status in ('Novo','Confirmado','Em preparação','Saiu para entrega','Entregue','Cancelado')),
  stock_deducted boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null, color_name text, size_name text,
  quantity integer not null check (quantity between 1 and 20), unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now()
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(), title text, subtitle text, image_url text, link_url text,
  position text not null default 'home', sort_order integer not null default 0, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

do $$ declare t text; begin
  foreach t in array array['categories','collections','colors','sizes','products','product_variants','orders','site_settings','banners'] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', t, t);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

create or replace function public.is_studio24_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_studio24_admin() from public;
grant execute on function public.is_studio24_admin() to authenticated;

create or replace function public.create_public_order(
  p_items jsonb, p_total numeric default null, p_customer_name text default null,
  p_customer_phone text default null, p_delivery_zone text default null,
  p_notes text default null, p_source text default 'website'
) returns table(order_id uuid, order_number text)
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text := '24-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  v_item jsonb; v_product record; v_quantity integer; v_total numeric(12,2) := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then raise exception 'Pedido inválido'; end if;
  insert into public.orders(id, order_number, customer_name, customer_phone, delivery_zone, notes, total, source)
  values(v_order_id, v_order_number, nullif(trim(p_customer_name),''), nullif(trim(p_customer_phone),''), nullif(trim(p_delivery_zone),''), nullif(trim(p_notes),''), 0, coalesce(nullif(trim(p_source),''),'website'));
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_quantity := greatest(1, least(20, coalesce((v_item->>'quantity')::integer, 1)));
    select p.id as product_id, p.name as product_name, coalesce(p.sale_price,p.price,0) as unit_price,
      pv.id as variant_id, pv.stock, c.name as color_name, s.name as size_name
    into v_product from public.products p join public.product_variants pv on pv.product_id=p.id
      join public.colors c on c.id=pv.color_id join public.sizes s on s.id=pv.size_id
    where p.id=(v_item->>'product_id')::uuid and pv.id=(v_item->>'variant_id')::uuid and p.active=true and pv.active=true and p.price is not null;
    if not found then raise exception 'Produto ou variante inválida'; end if;
    if v_product.stock < v_quantity then raise exception 'Stock insuficiente para %', v_product.product_name; end if;
    insert into public.order_items(order_id,product_id,variant_id,product_name,color_name,size_name,quantity,unit_price)
    values(v_order_id,v_product.product_id,v_product.variant_id,v_product.product_name,v_product.color_name,v_product.size_name,v_quantity,v_product.unit_price);
    v_total := v_total + (v_product.unit_price * v_quantity);
  end loop;
  update public.orders set total=v_total where id=v_order_id;
  return query select v_order_id, v_order_number;
end; $$;
revoke all on function public.create_public_order(jsonb,numeric,text,text,text,text,text) from public;
grant execute on function public.create_public_order(jsonb,numeric,text,text,text,text,text) to anon, authenticated;

create or replace function public.manage_order_stock() returns trigger language plpgsql security definer set search_path=public as $$
declare item record; changed integer;
begin
  if new.status='Confirmado' and old.status is distinct from 'Confirmado' and old.stock_deducted=false then
    for item in select variant_id,quantity from public.order_items where order_id=new.id and variant_id is not null loop
      update public.product_variants set stock=stock-item.quantity where id=item.variant_id and stock>=item.quantity;
      get diagnostics changed = row_count; if changed=0 then raise exception 'Stock insuficiente para confirmar o pedido'; end if;
    end loop; new.stock_deducted=true;
  elsif new.status='Cancelado' and old.stock_deducted=true then
    for item in select variant_id,quantity from public.order_items where order_id=new.id and variant_id is not null loop
      update public.product_variants set stock=stock+item.quantity where id=item.variant_id;
    end loop; new.stock_deducted=false;
  end if; return new;
end; $$;
drop trigger if exists orders_manage_stock on public.orders;
create trigger orders_manage_stock before update of status on public.orders for each row execute function public.manage_order_stock();

alter table public.admins enable row level security; alter table public.categories enable row level security;
alter table public.collections enable row level security; alter table public.colors enable row level security;
alter table public.sizes enable row level security; alter table public.products enable row level security;
alter table public.product_variants enable row level security; alter table public.product_images enable row level security;
alter table public.orders enable row level security; alter table public.order_items enable row level security;
alter table public.site_settings enable row level security; alter table public.banners enable row level security;

drop policy if exists "Admins read own role" on public.admins;
create policy "Admins read own role" on public.admins for select to authenticated using(user_id=auth.uid());

do $$ declare t text; begin
  foreach t in array array['categories','collections','colors','sizes','products','product_variants','product_images','site_settings','banners'] loop
    execute format('drop policy if exists "Public reads %s" on public.%I', t, t);
    if t in ('products','product_variants','categories','collections','colors','sizes','banners') then
      execute format('create policy "Public reads %s" on public.%I for select to anon,authenticated using(active=true)', t, t);
    else execute format('create policy "Public reads %s" on public.%I for select to anon,authenticated using(true)', t, t); end if;
    execute format('drop policy if exists "Admins manage %s" on public.%I', t, t);
    execute format('create policy "Admins manage %s" on public.%I for all to authenticated using(public.is_studio24_admin()) with check(public.is_studio24_admin())', t, t);
  end loop;
end $$;

drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders" on public.orders for all to authenticated using(public.is_studio24_admin()) with check(public.is_studio24_admin());
drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items" on public.order_items for all to authenticated using(public.is_studio24_admin()) with check(public.is_studio24_admin());

grant usage on schema public to anon,authenticated;
grant select on public.categories,public.collections,public.colors,public.sizes,public.products,public.product_variants,public.product_images,public.site_settings,public.banners to anon,authenticated;
grant select on public.admins to authenticated;
grant all on public.categories,public.collections,public.colors,public.sizes,public.products,public.product_variants,public.product_images,public.orders,public.order_items,public.site_settings,public.banners to authenticated;

insert into public.categories(name,slug,sort_order) values ('T-Shirts','t-shirts',10),('Hoodies','hoodies',20),('Crewnecks','crewnecks',30),('Caps','caps',40),('Bottoms','bottoms',50),('Accessories','accessories',60) on conflict(slug) do nothing;
insert into public.colors(name,hex_code,sort_order) values ('Black','#000000',10),('White','#FFFFFF',20),('Burgundy','#7D0019',30),('Grey','#7D7C7A',40),('Gold / Beige','#E5C687',50) on conflict do nothing;
insert into public.sizes(name,slug,sort_order) values ('XS','xs',10),('S','s',20),('M','m',30),('L','l',40),('XL','xl',50),('XXL','xxl',60) on conflict(slug) do nothing;
insert into public.site_settings(key,value) values
  ('whatsapp','"258876778476"'::jsonb),('instagram','"24_creativestudio"'::jsonb),('delivery_days','2'::jsonb),('delivery_fee','null'::jsonb),('delivery_zones','""'::jsonb),
  ('delivery_text','"Depois da confirmação do pedido, pode esperar receber as suas peças num prazo máximo de 2 dias."'::jsonb),
  ('hero_eyebrow','"NEW DROP / 2026"'::jsonb),('hero_title','"Creativity\nat its finest."'::jsonb),('hero_copy','"Culture, style and intentional pieces manufactured in Maputo."'::jsonb),('hero_image_url','""'::jsonb),('logo_url','""'::jsonb),
  ('about_title','"Creativity, culture and style."'::jsonb),('about_copy','"A 24 Creative Studio é uma marca de roupa orientada pela criatividade, cultura e estilo. As peças são produzidas em Maputo e pensadas como formas de expressão."'::jsonb)
on conflict(key) do nothing;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('product-images','product-images',true,8388608,array['image/jpeg','image/png','image/webp','image/avif']) on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Public reads Studio24 images" on storage.objects;
create policy "Public reads Studio24 images" on storage.objects for select to public using(bucket_id='product-images');
drop policy if exists "Admins upload Studio24 images" on storage.objects;
create policy "Admins upload Studio24 images" on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.is_studio24_admin());
drop policy if exists "Admins update Studio24 images" on storage.objects;
create policy "Admins update Studio24 images" on storage.objects for update to authenticated using(bucket_id='product-images' and public.is_studio24_admin()) with check(bucket_id='product-images' and public.is_studio24_admin());
drop policy if exists "Admins delete Studio24 images" on storage.objects;
create policy "Admins delete Studio24 images" on storage.objects for delete to authenticated using(bucket_id='product-images' and public.is_studio24_admin());

-- Depois de criar o utilizador em Authentication > Users, execute o ficheiro criar-admin.sql.
