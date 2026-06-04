-- Multi-tenant schema for shop-bot. Run ONCE in Supabase SQL editor.
-- Two-table design:
--   products            = source of truth (name, description, price, stock).
--   product_embeddings  = derived vector store.
-- Both tables have user_id to scope products per shop owner.

create extension if not exists vector;

-- 1. Source of truth.
drop table if exists product_embeddings cascade;
drop table if exists products cascade;

create table products (
  id          serial primary key,
  user_id     text    not null,  -- matches users.id UUID from may_core_db
  name        text    not null,
  description text    not null,
  price       numeric not null,
  stock       int     not null default 0,
  updated_at  timestamptz not null default now()
);

create index products_user_id_idx on products(user_id);

-- 2. Derived embeddings — one row per product.
create table product_embeddings (
  product_id   int primary key references products(id) on delete cascade,
  content      text        not null,
  embedding    vector(384) not null,
  embedded_at  timestamptz not null default now()
);

-- 3. HNSW index for fast cosine similarity.
create index product_embeddings_idx
  on product_embeddings using hnsw (embedding vector_cosine_ops);

-- 4. Hybrid search function — scoped by user_id, one SQL round-trip.
--    p_user_id = null → returns all (single-tenant / dev mode).
create or replace function match_products (
  query_embedding vector(384),
  match_count     int     default 5,
  max_price       numeric default 1e9,
  in_stock_only   boolean default false,
  p_user_id       text    default null
) returns table (
  id          int,
  name        text,
  description text,
  price       numeric,
  stock       int,
  similarity  float
)
language sql stable as $$
  select
    p.id,
    p.name,
    p.description,
    p.price,
    p.stock,
    1 - (e.embedding <=> query_embedding) as similarity
  from product_embeddings e
  join products p on p.id = e.product_id
  where p.price <= max_price
    and (not in_stock_only or p.stock > 0)
    and (p_user_id is null or p.user_id = p_user_id)
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
