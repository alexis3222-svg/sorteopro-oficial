// app/api/admin/sorteos/upload-image/route.ts

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    supabaseAdmin,
} from "@/lib/supabaseAdmin";

import {
    requireAdminSession,
} from "@/lib/requireAdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "sorteos";

const MAX_IMAGE_SIZE =
    5 * 1024 * 1024; // 5 MB

const ALLOWED_IMAGE_TYPES =
    new Set([
        "image/webp",
        "image/png",
        "image/jpeg",
    ]);

function getExtension(
    file: File
): string | null {
    switch (file.type) {
        case "image/webp":
            return "webp";

        case "image/png":
            return "png";

        case "image/jpeg":
            return "jpg";

        default:
            return null;
    }
}

export async function POST(
    req: NextRequest
) {
    let uploadedPath:
        | string
        | null = null;

    try {
        const autorizado =
            await requireAdminSession();

        if (!autorizado) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "No autorizado.",
                },
                {
                    status: 401,
                }
            );
        }

        const formData =
            await req.formData();

        const sorteoId =
            String(
                formData.get("sorteoId") ??
                ""
            ).trim();

        const imagen =
            formData.get("imagen");

        if (!sorteoId) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Falta identificar el sorteo.",
                },
                {
                    status: 400,
                }
            );
        }

        const {
            data: sorteo,
            error: sorteoError,
        } =
            await supabaseAdmin
                .from("sorteos")
                .select("id")
                .eq("id", sorteoId)
                .maybeSingle();

        if (
            sorteoError ||
            !sorteo
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "El sorteo no existe.",
                },
                {
                    status: 404,
                }
            );
        }

        if (
            !(imagen instanceof File) ||
            imagen.size <= 0
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Selecciona una imagen.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !ALLOWED_IMAGE_TYPES.has(
                imagen.type
            )
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "La imagen debe ser WEBP, PNG o JPG.",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            imagen.size >
            MAX_IMAGE_SIZE
        ) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "La imagen no puede superar los 5 MB.",
                },
                {
                    status: 400,
                }
            );
        }

        const extension =
            getExtension(imagen);

        if (!extension) {
            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "Formato de imagen no permitido.",
                },
                {
                    status: 400,
                }
            );
        }

        const fileName =
            `${sorteoId}-${Date.now()}.${extension}`;

        uploadedPath =
            `sorteos/${fileName}`;

        const buffer =
            Buffer.from(
                await imagen.arrayBuffer()
            );

        const {
            error: uploadError,
        } =
            await supabaseAdmin
                .storage
                .from(STORAGE_BUCKET)
                .upload(
                    uploadedPath,
                    buffer,
                    {
                        contentType:
                            imagen.type,
                        cacheControl:
                            "3600",
                        upsert:
                            false,
                    }
                );

        if (uploadError) {
            console.error(
                "Error subiendo imagen del sorteo:",
                uploadError
            );

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        uploadError.message ??
                        "No se pudo subir la imagen del sorteo.",
                },
                {
                    status: 500,
                }
            );
        }

        const {
            data: publicUrlData,
        } =
            supabaseAdmin
                .storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(
                    uploadedPath
                );

        const publicUrl =
            String(
                publicUrlData.publicUrl ??
                ""
            ).trim();

        if (!publicUrl) {
            await supabaseAdmin
                .storage
                .from(STORAGE_BUCKET)
                .remove([
                    uploadedPath,
                ]);

            return NextResponse.json(
                {
                    ok: false,
                    error:
                        "La imagen se subió, pero no se pudo obtener su URL pública.",
                },
                {
                    status: 500,
                }
            );
        }

        return NextResponse.json({
            ok: true,
            publicUrl,
            path:
                uploadedPath,
        });
    } catch (
    error: unknown
    ) {
        console.error(
            "Error en upload-image de sorteo:",
            error
        );

        if (uploadedPath) {
            try {
                await supabaseAdmin
                    .storage
                    .from(STORAGE_BUCKET)
                    .remove([
                        uploadedPath,
                    ]);
            } catch {
                // Conservamos el error original.
            }
        }

        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Error interno.",
            },
            {
                status: 500,
            }
        );
    }
}
