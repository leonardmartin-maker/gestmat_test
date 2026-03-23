import { http } from "@/lib/api/http";

// ---------- Types ----------

export interface SiteOut {
  id: number;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SiteCreate {
  name: string;
  address?: string | null;
}

export interface SiteUpdate {
  name?: string;
  address?: string | null;
  is_active?: boolean;
}

// ---------- API ----------

export async function listSites(params?: { active?: boolean; limit?: number; offset?: number }) {
  const { data } = await http.get<{ data: SiteOut[]; meta: any }>("/sites", {
    params: { limit: 200, offset: 0, ...params },
  });
  return data;
}

export async function getSite(id: number) {
  const { data } = await http.get<SiteOut>(`/sites/${id}`);
  return data;
}

export async function createSite(payload: SiteCreate) {
  const { data } = await http.post<SiteOut>("/admin/sites", payload);
  return data;
}

export async function updateSite(id: number, payload: SiteUpdate) {
  const { data } = await http.patch<SiteOut>(`/admin/sites/${id}`, payload);
  return data;
}

export async function deleteSite(id: number) {
  const { data } = await http.delete<SiteOut>(`/admin/sites/${id}`);
  return data;
}
