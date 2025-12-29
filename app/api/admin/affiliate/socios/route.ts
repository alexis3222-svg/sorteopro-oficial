import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
    const expected = process.env.NEXT_PUBLIC_ADMIN_SECRET || "";
    const got = req.headers.get("x-admin-secret") || "";
    return expected && got && expected === got;
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
    try {
        if (!isAuthorized(req)) {
            return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from("affiliates")
            .select("id, username, display_name, code, status, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, socios: data || [] });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
