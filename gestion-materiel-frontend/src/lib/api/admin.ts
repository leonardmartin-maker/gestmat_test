import { http } from "@/lib/api/http";
import type { AssetOutWithAssignee, Meta } from "@/lib/api/assets";
import type { EmployeeOut } from "@/lib/api/employees";

export type AdminAssetList = { data: AssetOutWithAssignee[]; meta: Meta };
export type AdminEmployeeList = { data: EmployeeOut[]; meta: Meta };

export async function listDeletedAssets(params: { limit?: number; offset?: number } = {}) {
  const res = await http.get<AdminAssetList>("/admin/assets/with-assignee", { params });
  return res.data;
}

export async function restoreAsset(id: number) {
  const res = await http.post(`/admin/assets/${id}/restore`);
  return res.data;
}

export async function deleteAsset(id: number) {
  const res = await http.delete(`/admin/assets/${id}`);
  return res.data;
}

export async function listAllEmployees(params: { limit?: number; offset?: number } = {}) {
  const res = await http.get<AdminEmployeeList>("/admin/employees", { params });
  return res.data;
}

export async function restoreEmployee(id: number) {
  const res = await http.post(`/admin/employees/${id}/restore`);
  return res.data;
}

export async function deleteEmployee(id: number) {
  const res = await http.delete(`/admin/employees/${id}`);
  return res.data;
}
