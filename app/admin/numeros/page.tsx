// app/admin/numeros/page.tsx

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function AdminNumerosPage() {
    return (
        <main className="p-4">
            <h1 className="text-xl font-bold">Admin Números</h1>
            <p className="text-sm text-gray-600">
                Vista temporal de /admin/numeros mientras corregimos el build.
            </p>
        </main>
    );
}
