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
    // cookie admin
    const c = req.cookies.get("admin_session")?.value;
    if (c === "1") return true;

    // header opcional (por compatibilidad)
    const sent = (req.headers.get("x-admin-secret") || "").trim();
    const expected = (
        process.env.ADMIN_SECRET ||
        process.env.NEXT_PUBLIC_ADMIN_SECRET ||
        ""
    ).trim();

    if (expected && sent && sent === expected) return true;
    return false;
}

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
    const notes = body?.notes === undefined ? undefined : String(body.notes ?? "");

    if (!["paid", "rejected"].includes(nextStatus)) {
        return NextResponse.json(
            { ok: false, error: "status inválido (paid|rejected)" },
            { status: 400 }
        );
    }

    // 🔒 Solo permitir transición desde pending
    // (evita tocar pagados/rechazados por error)
    const updatePayload: any = { status: nextStatus };
    if (notes !== undefined) updatePayload.notes = notes;

    const { data, error } = await supabaseAdmin
        .from("affiliate_withdrawals")
        .update(updatePayload)
        .eq("id", id)
        .eq("status", "pending")
        .select("id, status, notes, updated_at")
        .maybeSingle();

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
        // no encontró o no estaba pending
        return NextResponse.json(
            { ok: false, error: "No se pudo actualizar (quizá ya no está pendiente)" },
            { status: 409 }
        );
    }

    return NextResponse.json({ ok: true, withdrawal: data });
}
