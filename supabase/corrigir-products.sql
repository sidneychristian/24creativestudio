-- 24 Creative Studio — correção segura da tabela products
-- Execute este ficheiro UMA VEZ no SQL Editor do Supabase.
-- Não apaga produtos nem outras informações existentes.

begin;

alter table public.products
  add column if not exists category_id uuid,
  add column if not exists collection_id uuid,
  add column if not exists sku text,
  add column if not exists description text,
  add column if not exists details text,
  add column if not exists price numeric(12,2),
  add column if not exists sale_price numeric(12,2),
  add column if not exists active boolean default true,
  add column if not exists featured boolean default false,
  add column if not exists new_drop boolean default false,
  add column if not exists personalization_available boolean default false,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.products set active = true where active is null;
update public.products set featured = false where featured is null;
update public.products set new_drop = false where new_drop is null;
update public.products set personalization_available = false where personalization_available is null;

alter table public.products alter column active set default true;
alter table public.products alter column featured set default false;
alter table public.products alter column new_drop set default false;
alter table public.products alter column personalization_available set default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_category_id_fkey'
  ) then
    alter table public.products
      add constraint products_category_id_fkey
      foreign key (category_id) references public.categories(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'products_collection_id_fkey'
  ) then
    alter table public.products
      add constraint products_collection_id_fkey
      foreign key (collection_id) references public.collections(id) on delete set null;
  end if;
end $$;

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_collection_id_idx on public.products(collection_id);

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

commit;

-- Atualiza a cache usada pela API do Supabase.
notify pgrst, 'reload schema';

-- Deve mostrar category_id e collection_id no resultado.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'products'
  and column_name in ('category_id', 'collection_id')
order by column_name;
