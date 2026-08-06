begin;

-- ============================================================
-- BARUK593
-- Trazabilidad para premios que entregan Baruk Cards digitales
-- ============================================================

-- Identifica pedidos creados como entrega de un premio.
alter table public.pedidos
add column if not exists es_pedido_premio boolean
not null
default false;

-- Reclamo que originó el pedido gratuito.
alter table public.pedidos
add column if not exists claim_origen_id uuid
references public.prize_claims(id)
on delete restrict;

-- Tarjeta original que ganó el premio.
alter table public.pedidos
add column if not exists card_origen_premio_id uuid
references public.baruk_cards(id)
on delete restrict;

-- Profundidad para controlar premios encadenados.
-- 0 = compra normal
-- 1 = tarjetas generadas por un premio
-- 2 = segundo nivel, si más adelante se permite
alter table public.pedidos
add column if not exists prize_generation_depth integer
not null
default 0;

alter table public.pedidos
drop constraint if exists pedidos_prize_generation_depth_check;

alter table public.pedidos
add constraint pedidos_prize_generation_depth_check
check (
    prize_generation_depth >= 0
    and prize_generation_depth <= 2
);

-- Un reclamo solo puede generar un pedido gratuito.
create unique index if not exists uq_pedidos_claim_origen
on public.pedidos(claim_origen_id)
where claim_origen_id is not null;

create index if not exists idx_pedidos_es_pedido_premio
on public.pedidos(es_pedido_premio)
where es_pedido_premio = true;

create index if not exists idx_pedidos_card_origen_premio
on public.pedidos(card_origen_premio_id)
where card_origen_premio_id is not null;

-- Pedido y fecha de entrega del reclamo digital.
alter table public.prize_claims
add column if not exists pedido_entrega_id bigint
references public.pedidos(id)
on delete set null;

alter table public.prize_claims
add column if not exists entrega_automatica boolean
not null
default false;

create unique index if not exists uq_prize_claims_pedido_entrega
on public.prize_claims(pedido_entrega_id)
where pedido_entrega_id is not null;

commit;