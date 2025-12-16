// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Creamos el cliente SOLO si hay variables.
 * Si faltan, lanzamos un error claro en consola (y evitas fallos silenciosos).
 */
function createSupabaseBrowserClient(): SupabaseClient {
    if (!supabaseUrl || !supabaseAnonKey) {
        // En producción y dev queremos verlo claro
        // (No tirar el build, pero sí avisar fuerte)
        console.error(
            "[Supabase] Faltan variables NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    });
}

// ✅ Nombre clásico que ya usas en todo el proyecto
export const supabase = createSupabaseBrowserClient();

// ✅ Alias explícito
export const supabaseBrowser = supabase;
