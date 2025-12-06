// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Nombre "clásico" que ya usabas en varios archivos (como admin/numeros)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Alias más explícito para el navegador (login, layout admin, etc.)
export const supabaseBrowser = supabase;
