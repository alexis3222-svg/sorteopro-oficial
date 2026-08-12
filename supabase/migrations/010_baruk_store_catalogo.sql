-- ============================================================
-- 007_baruk_store_catalogo.sql
-- CATÁLOGO BARUK STORE
-- ============================================================


-- ============================================================
-- 1. CATEGORÍAS
-- ============================================================

create table if not exists public.store_categories (
    id uuid primary key default gen_random_uuid(),

    nombre text not null,
    slug text not null unique,

    descripcion text,

    activo boolean not null default true,

    orden integer not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- 2. PRODUCTOS
-- ============================================================

create table if not exists public.store_products (
    id uuid primary key default gen_random_uuid(),

    category_id uuid
        references public.store_categories(id)
        on delete set null,

    nombre text not null,

    slug text not null unique,

    descripcion text,

    descripcion_corta text,

    precio numeric(10,2) not null
        check (precio >= 0),

    precio_anterior numeric(10,2)
        check (
            precio_anterior is null
            or precio_anterior >= 0
        ),

    stock integer not null default 0
        check (stock >= 0),

    sku text unique,

    imagen_principal text,

    activo boolean not null default true,

    destacado boolean not null default false,

    tendencia boolean not null default false,

    nuevo boolean not null default false,

    etiqueta text,

    orden integer not null default 0,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- ============================================================
-- 3. IMÁGENES ADICIONALES
-- ============================================================

create table if not exists public.store_product_images (
    id uuid primary key default gen_random_uuid(),

    product_id uuid not null
        references public.store_products(id)
        on delete cascade,

    image_url text not null,

    alt_text text,

    orden integer not null default 0,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 4. ÍNDICES
-- ============================================================

create index if not exists
store_products_category_idx
on public.store_products(category_id);


create index if not exists
store_products_activo_idx
on public.store_products(activo);


create index if not exists
store_products_tendencia_idx
on public.store_products(tendencia);


create index if not exists
store_products_destacado_idx
on public.store_products(destacado);


create index if not exists
store_product_images_product_idx
on public.store_product_images(product_id);


-- ============================================================
-- 5. CATEGORÍAS INICIALES
-- ============================================================

insert into public.store_categories (
    nombre,
    slug,
    descripcion,
    orden
)
values

(
    'Cascos',
    'cascos',
    'Cascos disponibles en Baruk Store.',
    1
),

(
    'Calzado',
    'calzado',
    'Botas y calzado disponible en Baruk Store.',
    2
),

(
    'Accesorios',
    'accesorios',
    'Accesorios y complementos.',
    3
),

(
    'Equipamiento',
    'equipamiento',
    'Equipamiento disponible en Baruk Store.',
    4
),

(
    'Baruk593',
    'baruk593',
    'Productos oficiales Baruk593.',
    5
)

on conflict (slug)
do nothing;


-- ============================================================
-- 6. PRODUCTOS INICIALES
-- ============================================================


-- CASCO
insert into public.store_products (
    category_id,
    nombre,
    slug,
    descripcion_corta,
    precio,
    precio_anterior,
    stock,
    sku,
    imagen_principal,
    activo,
    destacado,
    tendencia,
    nuevo,
    etiqueta,
    orden
)
select
    id,
    'Casco Adventure',
    'casco-adventure',
    'Casco Adventure disponible en Baruk Store.',
    129.00,
    149.00,
    10,
    'BRK-CASCO-001',
    '/productos/casco-adventure.png',
    true,
    true,
    true,
    false,
    'Más vendido',
    1
from public.store_categories
where slug = 'cascos'
on conflict (slug)
do nothing;


-- BOTAS
insert into public.store_products (
    category_id,
    nombre,
    slug,
    descripcion_corta,
    precio,
    stock,
    sku,
    imagen_principal,
    activo,
    destacado,
    tendencia,
    nuevo,
    etiqueta,
    orden
)
select
    id,
    'Botas Adventure',
    'botas-adventure',
    'Botas Adventure disponibles en Baruk Store.',
    89.00,
    10,
    'BRK-BOTAS-001',
    '/productos/botas-adventure.png',
    true,
    true,
    true,
    false,
    'Tendencia',
    2
from public.store_categories
where slug = 'calzado'
on conflict (slug)
do nothing;


-- GUANTES
insert into public.store_products (
    category_id,
    nombre,
    slug,
    descripcion_corta,
    precio,
    stock,
    sku,
    imagen_principal,
    activo,
    destacado,
    tendencia,
    nuevo,
    orden
)
select
    id,
    'Guantes Adventure',
    'guantes-adventure',
    'Guantes Adventure disponibles en Baruk Store.',
    35.00,
    10,
    'BRK-GUANTES-001',
    '/productos/guantes-adventure.png',
    true,
    true,
    true,
    false,
    3
from public.store_categories
where slug = 'accesorios'
on conflict (slug)
do nothing;


-- CHAQUETA
insert into public.store_products (
    category_id,
    nombre,
    slug,
    descripcion_corta,
    precio,
    stock,
    sku,
    imagen_principal,
    activo,
    destacado,
    tendencia,
    nuevo,
    etiqueta,
    orden
)
select
    id,
    'Chaqueta Adventure',
    'chaqueta-adventure',
    'Chaqueta Adventure disponible en Baruk Store.',
    99.00,
    10,
    'BRK-CHAQUETA-001',
    '/productos/chaqueta-adventure.png',
    true,
    true,
    true,
    true,
    'Nuevo',
    4
from public.store_categories
where slug = 'equipamiento'
on conflict (slug)
do nothing;