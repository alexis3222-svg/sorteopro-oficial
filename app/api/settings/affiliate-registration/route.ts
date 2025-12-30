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
    // 1) cookie estable
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
const DEFAULT_VALUE = { open: true };

async function readSetting() {
    const { data, error } = await supabaseAdmin
        .from("app_settings")
        .select("key, value")
        .eq("key", KEY)
        .maybeSingle();

    if (error) throw new Error(error.message);

    const value = (data?.value as any) ?? DEFAULT_VALUE;
    const open = Boolean(value?.open);

    return { key: KEY, value: { ...DEFAULT_VALUE, ...(value || {}) }, open };
}

export async function GET(req: NextRequest) {
    if (!isAdmin(req)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const s = await readSetting();
        return NextResponse.json({ ok: true, ...s });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    if (!isAdmin(req)) {
        return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => ({}));
        const open = Boolean(body?.open);

        const value = { open };

        const { error } = await supabaseAdmin
            .from("app_settings")
            .upsert({ key: KEY, value }, { onConflict: "key" });

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, open, value });
    } catch {
        return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
    }
}
