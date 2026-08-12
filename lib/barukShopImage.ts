import { supabase } from "@/lib/supabaseClient";

const BARUK_SHOP_BUCKET = "baruk-shop";

/**
 * Convierte una ruta interna de Supabase Storage
 * en una URL pública.
 *
 * Ejemplo:
 *
 * productos/casco-adventure/principal.webp
 *
 * ↓
 *
 * https://xxxxx.supabase.co/storage/v1/object/public/
 * baruk-shop/productos/casco-adventure/principal.webp
 *
 * También acepta URLs completas por compatibilidad.
 */
export function getBarukShopImageUrl(
    path: string | null | undefined
): string | null {
    if (!path) {
        return null;
    }

    const value = path.trim();

    if (!value) {
        return null;
    }

    // Si ya es una URL completa, la dejamos tal como está.
    if (
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {
        return value;
    }

    // Quitamos "/" iniciales por seguridad.
    const cleanPath = value.replace(/^\/+/, "");

    const { data } = supabase.storage
        .from(BARUK_SHOP_BUCKET)
        .getPublicUrl(cleanPath);

    return data.publicUrl || null;
}