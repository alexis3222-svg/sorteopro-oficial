// lib/adminSession.ts

const ADMIN_COOKIE = "admin_session";

const SESSION_DURATION_SECONDS =
    60 * 60 * 24 * 30; // 30 días

type AdminSessionPayload = {
    role: "admin";
    exp: number;
};

/* ============================================================
   HELPERS
============================================================ */

function getAdminSecret(): string {
    const secret =
        process.env.ADMIN_SECRET?.trim();

    if (!secret) {
        throw new Error(
            "ADMIN_SECRET no está configurado."
        );
    }

    return secret;
}

function bytesToBase64Url(
    bytes: Uint8Array
): string {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function stringToBase64Url(
    value: string
): string {
    const bytes =
        new TextEncoder().encode(value);

    return bytesToBase64Url(bytes);
}

function base64UrlToString(
    value: string
): string {
    const base64 =
        value
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    const padded =
        base64.padEnd(
            Math.ceil(base64.length / 4) * 4,
            "="
        );

    const binary =
        atob(padded);

    const bytes =
        Uint8Array.from(
            binary,
            (char) =>
                char.charCodeAt(0)
        );

    return new TextDecoder().decode(
        bytes
    );
}

async function createSignature(
    payload: string
): Promise<string> {
    const secret =
        getAdminSecret();

    const encoder =
        new TextEncoder();

    const key =
        await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            {
                name: "HMAC",
                hash: "SHA-256",
            },
            false,
            ["sign"]
        );

    const signature =
        await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(payload)
        );

    return bytesToBase64Url(
        new Uint8Array(signature)
    );
}

/* ============================================================
   COMPARACIÓN SEGURA
============================================================ */

function safeCompare(
    a: string,
    b: string
): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;

    for (
        let i = 0;
        i < a.length;
        i++
    ) {
        result |=
            a.charCodeAt(i) ^
            b.charCodeAt(i);
    }

    return result === 0;
}

/* ============================================================
   CREAR SESIÓN
============================================================ */

export async function createAdminSessionToken(): Promise<string> {
    const payload: AdminSessionPayload = {
        role: "admin",

        exp:
            Math.floor(
                Date.now() / 1000
            ) +
            SESSION_DURATION_SECONDS,
    };

    const encodedPayload =
        stringToBase64Url(
            JSON.stringify(payload)
        );

    const signature =
        await createSignature(
            encodedPayload
        );

    return `${encodedPayload}.${signature}`;
}

/* ============================================================
   VALIDAR SESIÓN
============================================================ */

export async function verifyAdminSessionToken(
    token:
        | string
        | null
        | undefined
): Promise<boolean> {
    try {
        if (!token) {
            return false;
        }

        const parts =
            token.split(".");

        if (parts.length !== 2) {
            return false;
        }

        const [
            encodedPayload,
            providedSignature,
        ] = parts;

        const expectedSignature =
            await createSignature(
                encodedPayload
            );

        if (
            !safeCompare(
                providedSignature,
                expectedSignature
            )
        ) {
            return false;
        }

        const decoded =
            base64UrlToString(
                encodedPayload
            );

        const payload =
            JSON.parse(
                decoded
            ) as AdminSessionPayload;

        if (
            payload.role !== "admin"
        ) {
            return false;
        }

        const now =
            Math.floor(
                Date.now() / 1000
            );

        if (
            !payload.exp ||
            payload.exp <= now
        ) {
            return false;
        }

        return true;

    } catch {
        return false;
    }
}

export {
    ADMIN_COOKIE,
    SESSION_DURATION_SECONDS,
};