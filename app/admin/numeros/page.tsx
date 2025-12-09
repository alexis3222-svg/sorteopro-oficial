import AdminNumerosClient from "./AdminNumerosClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type PageProps = {
    searchParams?: {
        [key: string]: string | string[] | undefined;
    };
};

export default function AdminNumerosPage({ searchParams = {} }: PageProps) {
    const pedidoParam = searchParams.pedido;

    if (!pedidoParam) {
        return (
            <main className="p-4">
                <h1 className="text-xl font-bold">Números del pedido</h1>
                <p className="mt-2 text-red-600">
                    Falta el parámetro <code>?pedido=ID</code> en la URL.
                </p>
            </main>
        );
    }

    const pedidoIdStr = Array.isArray(pedidoParam)
        ? pedidoParam[0]
        : pedidoParam;

    const pedidoId = Number(pedidoIdStr);

    if (Number.isNaN(pedidoId)) {
        return (
            <main className="p-4">
                <h1 className="text-xl font-bold">Números del pedido</h1>
                <p className="mt-2 text-red-600">
                    El parámetro <code>?pedido=</code> no es un número válido.
                </p>
            </main>
        );
    }

    // 👉 Pasamos el ID ya limpio a un componente cliente
    return <AdminNumerosClient pedidoId={pedidoId} />;
}
