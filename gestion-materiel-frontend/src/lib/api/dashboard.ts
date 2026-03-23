import { http } from "@/lib/api/http";

export type DashboardSummaryOut = {
  total_assets: number;
  assigned_assets: number;
  available_assets: number;
  maintenance_assets: number;
  retired_assets: number;

  active_employees: number;
  inactive_employees: number;

  last_7_days_events: number;
};

export async function getDashboardSummary(params?: { site_id?: number }) {
  const res = await http.get<DashboardSummaryOut>("/dashboard/summary", { params });
  return res.data;
}