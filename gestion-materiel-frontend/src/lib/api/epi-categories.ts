import { http } from "@/lib/api/http";

export type EpiCategoryOut = {
  id: number;
  company_id: number;
  name: string;
  icon: string | null;
  enabled_attributes: string[];
  created_at: string | null;
};

export type EpiCategoryList = {
  data: EpiCategoryOut[];
  meta: { limit: number; offset: number; total: number; has_more?: boolean | null };
};

export type EpiCategoryCreate = {
  name: string;
  icon?: string | null;
  enabled_attributes: string[];
};

export type EpiCategoryUpdate = {
  name?: string;
  icon?: string | null;
  enabled_attributes?: string[];
};

/** Liste des catégories EPI (tous les users auth) */
export async function listEpiCategories() {
  const res = await http.get<EpiCategoryList>("/epi-categories", { params: { limit: 200 } });
  return res.data;
}

/** Liste admin des catégories EPI */
export async function listEpiCategoriesAdmin() {
  const res = await http.get<EpiCategoryList>("/admin/epi-categories", { params: { limit: 200 } });
  return res.data;
}

/** Créer une catégorie EPI */
export async function createEpiCategory(payload: EpiCategoryCreate) {
  const res = await http.post<EpiCategoryOut>("/admin/epi-categories", payload);
  return res.data;
}

/** Modifier une catégorie EPI */
export async function updateEpiCategory(id: number, payload: EpiCategoryUpdate) {
  const res = await http.patch<EpiCategoryOut>(`/admin/epi-categories/${id}`, payload);
  return res.data;
}

/** Supprimer une catégorie EPI (soft delete) */
export async function deleteEpiCategory(id: number) {
  const res = await http.delete<EpiCategoryOut>(`/admin/epi-categories/${id}`);
  return res.data;
}
