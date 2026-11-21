import { emptyAdminData, type AdminData } from "@/lib/admin-data";

type Snapshot = { data: AdminData; ready: boolean; error: string | null };
const serverSnapshot: Snapshot = { data: emptyAdminData, ready: false, error: null };
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach(listener => listener());
}

export function subscribeAdmin(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const getAdminSnapshot = () => snapshot;
export const getAdminServerSnapshot = () => serverSnapshot;
export function resetAdminData() {
  publish({ data: emptyAdminData, ready: false, error: null });
}

export async function loadAdminData() {
  const response = await fetch("/api/admin/data", { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(await errorMessage(response));
  const data = await response.json() as AdminData;
  publish({ data, ready: true, error: null });
  return data;
}

export async function updateAdminData(update: (current: AdminData) => AdminData) {
  const previous = snapshot;
  const nextData = update(previous.data);
  publish({ data: nextData, ready: true, error: null });
  try {
    const response = await fetch("/api/admin/data", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextData),
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    const saved = await response.json() as AdminData;
    publish({ data: saved, ready: true, error: null });
    return true;
  } catch (error) {
    publish({ ...previous, error: error instanceof Error ? error.message : "Could not save admin data." });
    return false;
  }
}

async function errorMessage(response: Response) {
  try {
    const body = await response.json() as { error?: string };
    return body.error || `Admin request failed (${response.status}).`;
  } catch {
    return `Admin request failed (${response.status}).`;
  }
}
