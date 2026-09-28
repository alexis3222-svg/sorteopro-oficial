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

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function PUT(
    req: NextRequest,
    context: RouteContext
) {
    try {
        const autorizado = await requireAdminSession();

        if (!autorizado) {
            return NextResponse.json(
                { ok: false, error: "No autorizado." },
                { status: 401 }
            );
        }

        const { id } = await context.params;
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
                .neq("id", id)
                .maybeSingle();

        if (existenteError) {
            throw existenteError;
        }

        if (existente) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "Ya existe otra categoría con ese slug.",
                },
                { status: 409 }
            );
        }

        const { data: categoria, error } = await supabaseAdmin
            .from("store_categories")
            .update({
                nombre,
                slug,
                descripcion: descripcion || null,
                activo,
                orden,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
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

        return NextResponse.json({
            ok: true,
            categoria,
        });
    } catch (error) {
        console.error("Error actualizando categoría Baruk Shop:", error);

        return NextResponse.json(
            {
                ok: false,
                error: "No se pudo actualizar la categoría.",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _req: NextRequest,
    context: RouteContext
) {
    try {
        const autorizado = await requireAdminSession();

        if (!autorizado) {
            return NextResponse.json(
                { ok: false, error: "No autorizado." },
                { status: 401 }
            );
        }

        const { id } = await context.params;

        const { count, error: countError } = await supabaseAdmin
            .from("store_products")
            .select("id", {
                count: "exact",
                head: true,
            })
            .eq("category_id", id);

        if (countError) {
            throw countError;
        }

        if ((count ?? 0) > 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        `No se puede eliminar esta categoría porque tiene ` +
                        `${count} producto${count === 1 ? "" : "s"} asociado${count === 1 ? "" : "s"}. ` +
                        `Reasigna primero los productos a otra categoría.`,
                },
                { status: 409 }
            );
        }

        const { error } = await supabaseAdmin
            .from("store_categories")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }

        return NextResponse.json({
            ok: true,
        });
    } catch (error) {
        console.error("Error eliminando categoría Baruk Shop:", error);

        return NextResponse.json(
            {
                ok: false,
                error: "No se pudo eliminar la categoría.",
            },
            { status: 500 }
        );
    }
}