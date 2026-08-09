-- ============================================================
-- 009_vincular_pedidos_con_usuarios.sql
-- Vinculación de pedidos con usuarios autenticados
-- ============================================================


-- ============================================================
-- 1. AGREGAR USUARIO COMPRADOR AL PEDIDO
-- ============================================================

alter table public.pedidos
add column if not exists buyer_user_id uuid
references auth.users(id)
on delete set null;


-- ============================================================
-- 2. ÍNDICE
-- ============================================================

create index if not exists
    pedidos_buyer_user_id_idx
on public.pedidos (
    buyer_user_id
);


-- ============================================================
-- 3. ÍNDICE POR CORREO
-- ============================================================
--
-- Será útil para vincular pedidos históricos cuando
-- el cliente entre por primera vez mediante magic link.
-- ============================================================

create index if not exists
    pedidos_correo_lower_idx
on public.pedidos (
    lower(correo)
);