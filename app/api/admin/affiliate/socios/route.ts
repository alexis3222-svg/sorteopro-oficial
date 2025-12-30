// app/api/admin/affiliate/socios/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(req: NextRequest) {
    const secret = req.headers.get("x-admin-secret");
    return !!secret && secret === process.env.NEXT_PUBLIC_ADMIN_SECRET;
}

// ✅ Service Role SOLO en server (API routes)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
    try {
        if (!isAdmin(req)) {
            return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
        }

        const url = new URL(req.url);
        const q = (url.searchParams.get("q") || "").trim(); // busqueda opcional
        const status = (url.searchParams.get("status") || "all").toLowerCase(); // all | active | suspended

        let query = supabaseAdmin
            .from("affiliates")
            .select("id, username, display_name, code, status, created_at")
            .order("created_at", { ascending: false });

        if (status !== "all") query = query.eq("status", status);

        // búsqueda simple por username/code/id (contiene, case-insensitive)
        if (q) {
            // OR: username ilike, code ilike, id eq (si coincide)
            // Nota: supabase OR requiere string:
            // username.ilike.%q%,code.ilike.%q%,id.eq.q
            const safe = q.replace(/,/g, ""); // evitar romper el OR
            query = query.or(
                `username.ilike.%${safe}%,code.ilike.%${safe}%,id.eq.${safe}`
            );
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, socios: data || [] });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e?.message || "Error interno" }, { status: 500 });
    }
}
