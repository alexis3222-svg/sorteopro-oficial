// app/pago-exitoso/page.tsx

import PagoExitosoClient from "./PagoExitosoClient";

type PageProps = {
    searchParams?: {
        [key: string]: string | string[] | undefined;
    };
};

export default function PagoExitosoPage({ searchParams = {} }: PageProps) {
    const rawTx =
        searchParams.clientTransactionId ||
        searchParams.tx ||
        searchParams.id;

    const tx = Array.isArray(rawTx) ? rawTx[0] : rawTx || null;

    return <PagoExitosoClient tx={tx} />;
}
