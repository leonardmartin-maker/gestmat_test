import { http } from "@/lib/api/http";

export type MaintenanceTaskOut = {
  id: number;
  company_id: number;
  asset_id: number;
  template_id: number | null;
  task_name: string;
  interval_km: number | null;
  interval_days: number | null;
  due_date: string | null;
  due_km: number | null;
  last_done_date: string | null;
  last_done_km: number | null;
  status: string;
  created_at: string | null;
  asset_name: string | null;
  asset_plate: string | null;
  asset_km: number | null;
};

export type MaintenanceTaskList = {
  data: MaintenanceTaskOut[];
  meta: { limit: number; offset: number; total: number; has_more?: boolean | null };
};

export type MaintenanceTasksOverview = {
  overdue: MaintenanceTaskOut[];
  due_soon_7d: MaintenanceTaskOut[];
  due_soon_30d: MaintenanceTaskOut[];
  total_tasks: number;
  total_overdue: number;
  total_due: number;
};

export type MaintenanceTaskComplete = {
  performed_at: string; // YYYY-MM-DD
  km_at?: number | null;
  notes?: string | null;
  cost?: number | null;
};

/** Liste des tâches */
export async function listTasks(params?: { asset_id?: number; status?: string; limit?: number }) {
  const res = await http.get<MaintenanceTaskList>("/maintenance/tasks", { params });
  return res.data;
}

/** Vue d'ensemble des tâches */
export async function getTasksOverview() {
  const res = await http.get<MaintenanceTasksOverview>("/maintenance/tasks/overview");
  return res.data;
}

/** Générer les tâches pour un véhicule depuis les templates */
export async function generateTasks(assetId: number) {
  const res = await http.post<{ created: number; total_templates: number }>(`/maintenance/tasks/generate/${assetId}`);
  return res.data;
}

/** Marquer une tâche comme effectuée */
export async function completeTask(taskId: number, payload: MaintenanceTaskComplete) {
  const res = await http.post(`/maintenance/tasks/${taskId}/complete`, payload);
  return res.data;
}

/** Supprimer une tâche */
export async function deleteTask(taskId: number) {
  const res = await http.delete(`/maintenance/tasks/${taskId}`);
  return res.data;
}

/** Mettre à jour le km d'un véhicule */
export async function updateKm(assetId: number, km: number) {
  const res = await http.patch<{ ok: boolean; km: number }>(`/maintenance/km/${assetId}`, { km });
  return res.data;
}
