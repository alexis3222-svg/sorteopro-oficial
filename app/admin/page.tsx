// app/admin/page.tsx (SERVER)
export const dynamic = "force-dynamic";
export const revalidate = 0;

import AdminHomeClient from "./AdminHomeClient";

export default function AdminPage() {
    return <AdminHomeClient />;
}
