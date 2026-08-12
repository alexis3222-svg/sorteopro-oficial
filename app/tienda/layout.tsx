import { ReactNode } from "react";
import { BarukCartProvider } from "@/components/baruk/shop/BarukCartProvider";

export default function TiendaLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <BarukCartProvider>
            {children}
        </BarukCartProvider>
    );
}