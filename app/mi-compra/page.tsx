import { Suspense } from "react";
import MiCompraClient from "./MiCompraClient";

export default function MiCompraPage() {
    return (
        <main className="min-h-screen bg-[#f3f4f6]">
            {/* El header gris / naranja te lo da el layout general */}
            <Suspense
                fallback={
                    <div className="flex items-center justify-center px-4 pt-32 pb-12">
                        <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
                            <p className="text-gray-700 text-sm">Cargando compra...</p>
                        </div>
                    </div>
                }
            >
                <MiCompraClient />
            </Suspense>
        </main>
    );
}
