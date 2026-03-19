import { http } from "@/lib/api/http";

export type MaintenanceTemplateOut = {
  id: number;
  company_id: number;
  model_name: string;
  task_name: string;
  interval_km: number | null;
  interval_days: number | null;
  created_at: string | null;
};

export type MaintenanceTemplateList = {
  data: MaintenanceTemplateOut[];
  meta: { limit: number; offset: number; total: number; has_more?: boolean | null };
};

export type MaintenanceTemplateCreate = {
  model_name: string;
  task_name: string;
  interval_km?: number | null;
  interval_days?: number | null;
};

export type MaintenanceTemplateUpdate = {
  model_name?: string;
  task_name?: string;
  interval_km?: number | null;
  interval_days?: number | null;
};

/** Liste des modèles connus (constructeur) */
export async function listKnownModels() {
  const res = await http.get<string[]>("/admin/maintenance-templates/models");
  return res.data;
}

/** Liste de tous les templates */
export async function listTemplates(modelName?: string) {
  const params: Record<string, unknown> = { limit: 500 };
  if (modelName) params.model_name = modelName;
  const res = await http.get<MaintenanceTemplateList>("/admin/maintenance-templates", { params });
  return res.data;
}

/** Initialiser les plans constructeur */
export async function seedTemplates() {
  const res = await http.post<{ created: number; total: number }>("/admin/maintenance-templates/seed");
  return res.data;
}

/** Créer un template */
export async function createTemplate(payload: MaintenanceTemplateCreate) {
  const res = await http.post<MaintenanceTemplateOut>("/admin/maintenance-templates", payload);
  return res.data;
}

/** Modifier un template */
export async function updateTemplate(id: number, payload: MaintenanceTemplateUpdate) {
  const res = await http.patch<MaintenanceTemplateOut>(`/admin/maintenance-templates/${id}`, payload);
  return res.data;
}

/** Supprimer un template */
export async function deleteTemplate(id: number) {
  const res = await http.delete(`/admin/maintenance-templates/${id}`);
  return res.data;
}
