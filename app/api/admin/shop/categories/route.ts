import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdminSession } from "@/lib/requireAdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export async function GET() {
    try {
        const autorizado = await requireAdminSession();

        if (!autorizado) {
            return NextResponse.json(
                { ok: false, error: "No autorizado." },
                { status: 401 }
            );
        }

        const { data: categorias, error } = await supabaseAdmin
            .from("store_categories")
            .select(`
                id,
                nombre,
                slug,
                descripcion,
                activo,
                orden,
                created_at,
                updated_at
            `)
            .order("orden", { ascending: true })
            .order("nombre", { ascending: true });

        if (error) {
            throw error;
        }

        const { data: productos, error: productosError } =
            await supabaseAdmin
                .from("store_products")
                .select("id, category_id");

        if (productosError) {
            throw productosError;
        }

        const conteo = new Map<string, number>();

        for (const producto of productos ?? []) {
            if (!producto.category_id) continue;

            conteo.set(
                producto.category_id,
                (conteo.get(producto.category_id) ?? 0) + 1
            );
        }

        const resultado = (categorias ?? []).map((categoria) => ({
            ...categoria,
            productos_count: conteo.get(categoria.id) ?? 0,
        }));

        return NextResponse.json({
            ok: true,
            categorias: resultado,
        });
    } catch (error) {
        console.error("Error cargando categorías Baruk Shop:", error);

        return NextResponse.json(
            {
                ok: false,
                error: "No se pudieron cargar las categorías.",
            },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const autorizado = await requireAdminSession();

        if (!autorizado) {
            return NextResponse.json(
                { ok: false, error: "No autorizado." },
                { status: 401 }
            );
        }

        const body = await req.json();

        const nombre =
            typeof body?.nombre === "string"
                ? body.nombre.trim()
                : "";

        const descripcion =
            typeof body?.descripcion === "string"
                ? body.descripcion.trim()
                : "";

        const slugSolicitado =
            typeof body?.slug === "string"
                ? body.slug.trim()
                : "";

        const activo =
            typeof body?.activo === "boolean"
                ? body.activo
                : true;

        const orden = Number(body?.orden ?? 0);

        if (!nombre) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "El nombre de la categoría es obligatorio.",
                },
                { status: 400 }
            );
        }

        if (!Number.isInteger(orden) || orden < 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "El orden no es válido.",
                },
                { status: 400 }
            );
        }

        const slug = slugify(slugSolicitado || nombre);

        if (!slug) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "No se pudo generar un slug válido.",
                },
                { status: 400 }
            );
        }

        const { data: existente, error: existenteError } =
            await supabaseAdmin
                .from("store_categories")
                .select("id")
                .eq("slug", slug)
                .maybeSingle();

        if (existenteError) {
            throw existenteError;
        }

        if (existente) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Ya existe una categoría con ese slug.",
                },
                { status: 409 }
            );
        }

        const { data: categoria, error } = await supabaseAdmin
            .from("store_categories")
            .insert({
                nombre,
                slug,
                descripcion: descripcion || null,
                activo,
                orden,
            })
            .select(`
                id,
                nombre,
                slug,
                descripcion,
                activo,
                orden,
                created_at,
                updated_at
            `)
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json(
            {
                ok: true,
                categoria: {
                    ...categoria,
                    productos_count: 0,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creando categoría Baruk Shop:", error);

        return NextResponse.json(
            {
                ok: false,
                error: "No se pudo crear la categoría.",
            },
            { status: 500 }
        );
    }
}