begin;

-- ============================================================
-- BARUK593
-- Extensión de pedidos para Tarjetas de la Suerte
--
-- No elimina ni cambia las columnas actuales.
-- Conserva compatibilidad con el flujo existente.
-- ============================================================

alter table public.pedidos
add column if not exists tipo_compra text
not null
default 'self';

alter table public.pedidos
drop constraint if exists pedidos_tipo_compra_check;

alter table public.pedidos
add constraint pedidos_tipo_compra_check
check (
    tipo_compra in (
        'self',
        'gift'
    )
);

alter table public.pedidos
add column if not exists card_design_id uuid
references public.card_designs(id)
on delete set null;

alter table public.pedidos
add column if not exists cards_processing_status text
not null
default 'pending';

alter table public.pedidos
drop constraint if exists pedidos_cards_processing_status_check;

alter table public.pedidos
add constraint pedidos_cards_processing_status_check
check (
    cards_processing_status in (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled'
    )
);

alter table public.pedidos
add column if not exists cards_processed_at timestamptz;

alter table public.pedidos
add column if not exists cards_processing_error text;

create index if not exists idx_pedidos_tipo_compra
on public.pedidos(tipo_compra);

create index if not exists idx_pedidos_cards_processing_status
on public.pedidos(cards_processing_status);

create index if not exists idx_pedidos_card_design
on public.pedidos(card_design_id);

commit;