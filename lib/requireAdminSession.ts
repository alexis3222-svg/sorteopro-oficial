// lib/requireAdminSession.ts

import { cookies } from "next/headers";

import {
    ADMIN_COOKIE,
    verifyAdminSessionToken,
} from "@/lib/adminSession";

export async function requireAdminSession(): Promise<boolean> {
    const cookieStore = await cookies();

    const token =
        cookieStore.get(ADMIN_COOKIE)?.value;

    return verifyAdminSessionToken(token);
}