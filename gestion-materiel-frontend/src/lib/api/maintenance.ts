import { http } from "@/lib/api/http";
import type { AssetOut } from "@/lib/api/assets";

export type MaintenanceOverview = {
  overdue: AssetOut[];
  upcoming_7d: AssetOut[];
  upcoming_30d: AssetOut[];
  in_maintenance: AssetOut[];
  insurance_expiring: AssetOut[];
};

export async function getMaintenanceOverview() {
  const res = await http.get<MaintenanceOverview>("/maintenance/overview");
  return res.data;
}
