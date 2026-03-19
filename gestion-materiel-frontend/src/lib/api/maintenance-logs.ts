import { http } from "@/lib/api/http";

export type MaintenanceLogOut = {
  id: number;
  company_id: number;
  asset_id: number;
  task_id: number | null;
  task_name: string;
  performed_at: string;
  km_at: number | null;
  performed_by: number | null;
  performer_name: string | null;
  notes: string | null;
  cost: number | null;
  created_at: string | null;
};

export type MaintenanceLogList = {
  data: MaintenanceLogOut[];
  meta: { limit: number; offset: number; total: number; has_more?: boolean | null };
};

/** Historique maintenance d'un véhicule */
export async function getAssetMaintenanceLogs(assetId: number) {
  const res = await http.get<MaintenanceLogList>(`/maintenance/logs/asset/${assetId}`);
  return res.data;
}
