// app/api/admin/settings/affiliate-registration/route.ts
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
    // 1) cookie admin_session
    const c = req.cookies.get("admin_session")?.value;
    if (c === "1") return true;

    // 2) header opcional (compatibilidad)
    const sent = (req.headers.get("x-admin-secret") || "").trim();
    const expected = (
        process.env.ADMIN_SECRET ||
        process.env.NEXT_PUBLIC_ADMIN_SECRET ||
        ""
    ).trim();

    if (expected && sent && sent === expected) return true;

    return false;
}

const KEY = "affiliate_registration";

function parseOpen(v: any): boolean {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v.toLowerCase() === "true";
    if (typeof v === "number") return v === 1;
    if (v && typeof v === "object" && typeof v.open === "boolean") return v.open;
    return true; // default seguro: abierto
}

async function ensureRow(): Promise<boolean> {
    const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("key, value")
        .eq("key", KEY)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        const { error: insErr } = await supabaseAdmin
            .from("app_settings")
            .insert({ key: KEY, value: { open: true } });

        if (insErr) throw insErr;
        return true;
    }

    return parseOpen(data.value);
}

export async function GET(req: NextRequest) {
    if (!isAdmin(req)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const open = await ensureRow();

        // leer de nuevo para devolver lo real
        const { data, error } = await supabaseAdmin
            .from("app_settings")
            .select("value")
            .eq("key", KEY)
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, open: parseOpen(data?.value) });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message || "Error leyendo setting" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    if (!isAdmin(req)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const open = Boolean(body?.open);

        // asegura fila
        await ensureRow();

        const { data, error } = await supabaseAdmin
            .from("app_settings")
            .update({ value: { open } })
            .eq("key", KEY)
            .select("value")
            .single();

        if (error) throw error;

        return NextResponse.json({ ok: true, open: parseOpen(data?.value) });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message || "Error guardando setting" },
            { status: 500 }
        );
    }
}
