import { http } from "@/lib/api/http";

export async function downloadCsv(path: string, filename: string) {
  const res = await http.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAssetsCsv(params?: { status?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.category) qs.set("category", params.category);
  const q = qs.toString();
  return downloadCsv(`/export/assets.csv${q ? `?${q}` : ""}`, "assets.csv");
}

export function exportEmployeesCsv(params?: { active?: boolean }) {
  const qs = new URLSearchParams();
  if (params?.active !== undefined) qs.set("active", String(params.active));
  const q = qs.toString();
  return downloadCsv(`/export/employees.csv${q ? `?${q}` : ""}`, "employees.csv");
}
