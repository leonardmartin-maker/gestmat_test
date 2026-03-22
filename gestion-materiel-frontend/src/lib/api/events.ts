import { http } from "@/lib/api/http";

export type EventPhotoOut = {
  id: number;
  category: string; // STATE | KM | DAMAGE
  url: string;
};

export type EventOut = {
  id: number;
  company_id: number;
  asset_id: number;
  employee_id: number | null;
  user_id: number | null;
  event_type: string;
  occurred_at: string; // ISO
  created_at: string; // ISO
  km_value: number | null;
  notes: string | null;
  damage_description: string | null;
  employee_name: string | null;
  employee_code: string | null;
  asset_name: string | null;
  photos: EventPhotoOut[];
};

export type Meta = {
  limit: number;
  offset: number;
  total: number;
  has_more?: boolean | null;
};

export type EventList = {
  data: EventOut[];
  meta: Meta;
};

export type ListEventsQuery = {
  asset_id?: number;
  employee_id?: number;
  user_id?: number;
  event_type?: string;
  from?: string; // ISO datetime
  to?: string;   // ISO datetime
  limit?: number;
  offset?: number;
};

export async function listEvents(q: ListEventsQuery = {}): Promise<EventList> {
  const params: Record<string, string | number | boolean> = {};

  if (q.asset_id !== undefined) params.asset_id = q.asset_id;
  if (q.employee_id !== undefined) params.employee_id = q.employee_id;
  if (q.user_id !== undefined) params.user_id = q.user_id;
  if (q.event_type) params.event_type = q.event_type;

  // ✅ IMPORTANT: on lit depuis q.from / q.to (pas "from" variable globale)
  if (q.from) params.from = q.from;
  if (q.to) params.to = q.to;

  if (q.limit !== undefined) params.limit = q.limit;
  if (q.offset !== undefined) params.offset = q.offset;

  const { data } = await http.get<EventList>("/events", { params });
  return data;
}