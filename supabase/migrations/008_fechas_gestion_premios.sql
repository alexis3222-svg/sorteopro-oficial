-- ============================================================
-- 008_fechas_gestion_premios.sql
-- Historial de gestión de premios instantáneos
-- ============================================================


alter table public.prize_claims
add column if not exists verified_at timestamptz;


alter table public.prize_claims
add column if not exists scheduled_at timestamptz;


alter table public.prize_claims
add column if not exists delivered_at timestamptz;


-- Campo opcional para observaciones administrativas.
alter table public.prize_claims
add column if not exists notas text;


-- Índices útiles para administración.

create index if not exists
    prize_claims_estado_idx
on public.prize_claims (
    estado
);


create index if not exists
    prize_claims_verified_at_idx
on public.prize_claims (
    verified_at
);


create index if not exists
    prize_claims_scheduled_at_idx
on public.prize_claims (
    scheduled_at
);


create index if not exists
    prize_claims_delivered_at_idx
on public.prize_claims (
    delivered_at
);