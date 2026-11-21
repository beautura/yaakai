import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/admin-panel";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin Preview",
  description: "Yaakai store operations preview.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}