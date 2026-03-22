import { http } from "@/lib/api/http";

export type IncidentPhotoOut = {
  id: number;
  url: string;
  category: string; // DAMAGE | THIRD_PARTY_ID | THIRD_PARTY_VEHICLE
};

export type IncidentOut = {
  id: number;
  company_id: number;
  employee_id: number;
  asset_id: number;
  incident_type: string; // ACCIDENT | BREAKDOWN
  description: string;
  location: string | null;
  status: string; // PENDING | IN_PROGRESS | RESOLVED
  has_third_party: boolean;
  third_party_name: string | null;
  third_party_plate: string | null;
  third_party_insurance: string | null;
  third_party_phone: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  employee_name: string | null;
  asset_name: string | null;
  asset_plate: string | null;
  photos: IncidentPhotoOut[];
};

export async function createIncident(data: FormData): Promise<IncidentOut> {
  const res = await http.post<IncidentOut>("/incidents", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function listMyIncidents(limit = 20): Promise<{ data: IncidentOut[] }> {
  const res = await http.get<{ data: IncidentOut[] }>("/incidents/my", { params: { limit } });
  return res.data;
}

export async function listIncidents(params: {
  status?: string;
  incident_type?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ data: IncidentOut[]; meta: { total: number } }> {
  const res = await http.get("/incidents", { params });
  return res.data;
}

export async function updateIncidentStatus(
  id: number,
  status: string,
  resolution_notes?: string,
): Promise<void> {
  await http.patch(`/incidents/${id}/status`, { status, resolution_notes });
}
