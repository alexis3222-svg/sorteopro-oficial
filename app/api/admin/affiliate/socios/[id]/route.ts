import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

function isAdmin(req: NextRequest) {
    // ✅ cookie (estable)
    const c = req.cookies.get("admin_session")?.value;
    if (c === "1") return true;

    // ✅ header opcional (por compatibilidad)
    const sent = (req.headers.get("x-admin-secret") || "").trim();
    const expected = (
        process.env.ADMIN_SECRET ||
        process.env.NEXT_PUBLIC_ADMIN_SECRET ||
        ""
    ).trim();

    if (expected && sent && sent === expected) return true;

    return false;
}

// ✅ GET: detalle socio + pedidos (ventas)
export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    if (!isAdmin(req)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!id) {
        return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
    }

    // 1) socio (solo kind = socio)
    const { data: socio, error: e1 } = await supabaseAdmin
        .from("affiliates")
        .select("id, username, display_name, code, whatsapp, status, is_active, created_at, kind")
        .eq("id", id)
        .eq("kind", "socio")
        .single();

    if (e1) {
        return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });
    }
    if (!socio) {
        return NextResponse.json({ ok: false, error: "Socio no encontrado" }, { status: 404 });
    }

    // 2) pedidos del socio
    // ⚠️ Si tu campo total tiene otro nombre, cámbialo aquí (pero por tus capturas es "total")
    const { data: pedidos, error: e2 } = await supabaseAdmin
        .from("pedidos")
        .select("id, created_at, aprobado_modo, aprobado_at, total, affiliate_code")
        .eq("affiliate_id", id)
        .order("created_at", { ascending: false });

    if (e2) {
        return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, socio, pedidos: pedidos ?? [] });
}

// ✅ PATCH: activar/suspender
export async function PATCH(
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    if (!isAdmin(req)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const { id } = await ctx.params;
    if (!id) {
        return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const nextStatus = String(body?.status || "").toLowerCase();

    if (nextStatus !== "active" && nextStatus !== "suspended") {
        return NextResponse.json(
            { ok: false, error: "status inválido (active|suspended)" },
            { status: 400 }
        );
    }

    // ✅ Actualiza SOLO socios
    const { data, error } = await supabaseAdmin
        .from("affiliates")
        .update({ status: nextStatus })
        .eq("id", id)
        .eq("kind", "socio")
        .select("id, status")
        .single();

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, affiliate: data });
}