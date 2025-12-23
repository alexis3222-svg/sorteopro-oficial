// app/admin/layout.tsx
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-[#050609] text-slate-100">
            {children}
        </div>
    );
}
