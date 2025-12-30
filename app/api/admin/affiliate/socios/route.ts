import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

function debugUnauthorized(req: NextRequest) {
    const cookieVal = req.cookies.get("admin_session")?.value || "";
    const headerSecret = req.headers.get("x-admin-secret") || "";
    const expected =
        process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "";

    return NextResponse.json(
        {
            ok: false,
            error: "No autorizado",
            debug: {
                has_cookie_admin_session: cookieVal.length > 0,
                cookie_admin_session_value: cookieVal ? "(present)" : "(missing)",
                has_header_x_admin_secret: headerSecret.length > 0,
                expected_configured: expected.length > 0,
                sent_len: headerSecret.length,
                expected_len: expected.length,
            },
        },
        { status: 401 }
    );
}

function isAdmin(req: NextRequest) {
    // 1) cookie
    const c = req.cookies.get("admin_session")?.value;
    if (c === "1") return true;

    // 2) header
    const headerSecret = req.headers.get("x-admin-secret") || "";
    const expected =
        process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_SECRET || "";
    if (expected && headerSecret === expected) return true;

    return false;
}

export async function GET(req: NextRequest) {
    if (!isAdmin(req)) {
        return debugUnauthorized(req);
    }

    const url = new URL(req.url);
    const status = (url.searchParams.get("status") || "all").toLowerCase();

    let q = supabaseAdmin
        .from("affiliates")
        .select("id, username, display_name, code, status, created_at")
        .order("created_at", { ascending: false });

    if (status !== "all") q = q.eq("status", status);

    const { data, error } = await q;

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, affiliates: data || [] });
}
