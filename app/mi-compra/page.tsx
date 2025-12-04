// app/mi-compra/page.tsx

type MiCompraPageProps = {
    searchParams: {
        tx?: string;
        clientTransactionId?: string;
        id?: string;
    };
};

export default async function MiCompraPage({ searchParams }: MiCompraPageProps) {
    const tx =
        searchParams.tx ||
        searchParams.clientTransactionId ||
        searchParams.id ||
        "";

    if (!tx) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                    <h1 className="text-xl font-bold mb-2 text-red-600">
                        Falta el identificador de compra
                    </h1>
                    <p className="text-gray-700 text-sm">
                        No se encontró el parámetro <code>tx</code> en la URL.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                <h1 className="text-2xl font-bold mb-2 text-orange-500">
                    Detalle de tu compra
                </h1>
                <p className="text-gray-700 mb-2 text-sm">
                    Aquí luego cargaremos los datos desde Supabase usando este código:
                </p>
                <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {tx}
                </p>
            </div>
        </main>
    );
}
