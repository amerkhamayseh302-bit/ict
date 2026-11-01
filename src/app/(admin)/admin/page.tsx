import { AdminDashboard } from "./admin-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة إدارة مجتمع ICT",
  robots: "noindex",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
