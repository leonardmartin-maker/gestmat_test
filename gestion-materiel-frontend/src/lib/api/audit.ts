import { http } from "@/lib/api/http";
import type { Meta } from "@/lib/api/assets";

export type AuditLogOut = {
  id: number;
  company_id: number;
  user_id: number | null;
  entity_type: string;
  entity_id: number;
  action: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  request_id: string | null;
  ip: string | null;
  created_at: string;
};

export type AuditLogList = {
  data: AuditLogOut[];
  meta: Meta;
};

export type ListAuditLogsParams = {
  entity_type?: string;
  entity_id?: number;
  user_id?: number;
  action?: string;
  limit?: number;
  offset?: number;
};

export async function listAuditLogs(params: ListAuditLogsParams = {}) {
  const res = await http.get<AuditLogList>("/admin/audit-logs", { params });
  return res.data;
}
