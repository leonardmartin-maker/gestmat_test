import { http } from "@/lib/api/http";

export type AssetAssignee = {
  employee_id: number;
  first_name?: string | null;
  last_name?: string | null;
  employee_code?: string | null;
};

export type AssetOut = {
  id: number;
  category: string;
  name: string;
  ref: string | null;
  status: string;
  public_id: string;
  plate: string | null;
  model_name: string | null;
  km_current: number | null;
  insurance_date: string | null;
  inspection_date: string | null;
  epi_type: string | null;
  epi_category_id: number | null;
  epi_attributes: Record<string, string> | null;
  serial_number: string | null;
  next_inspection_date: string | null;
  notes: string | null;
  purchase_invoice_path: string | null;
  site_id: number | null;
  site_name?: string | null;
};

export type AssetOutWithAssignee = AssetOut & {
  assigned_to?: AssetAssignee | null;
  last_event_type?: string | null;
  last_event_at?: string | null;
};

export type Meta = {
  limit: number;
  offset: number;
  total: number;
  has_more?: boolean | null;
};

export type AssetListWithAssignee = { data: AssetOutWithAssignee[]; meta: Meta };

export type ListAssetsParams = {
  search?: string;
  status?: string;
  category?: string;
  assigned_to_employee_id?: number;
  site_id?: number;
  limit?: number;
  offset?: number;
};

export async function listAssetsWithAssignee(params: ListAssetsParams) {
  const res = await http.get<AssetListWithAssignee>("/assets/with-assignee", { params });
  return res.data;
}

export async function getAsset(assetId: number) {
  const res = await http.get<AssetOut>(`/assets/${assetId}`);
  return res.data;
}

export type EventPhotoOut = {
  id: number;
  category: string; // STATE | DAMAGE
  url: string;
};

export type EventOut = {
  id: number;
  event_type: string;
  occurred_at: string;
  created_at: string;
  km_value: number | null;
  notes: string | null;
  employee_id: number | null;
  user_id: number | null;
  damage_description: string | null;
  photos: EventPhotoOut[];
  employee_name: string | null;
  employee_code: string | null;
};

export type EventGroup = { date: string; events: EventOut[] };
export type AssetHistoryOut = { asset_id: number; groups: EventGroup[] };

export async function getAssetHistory(assetId: number) {
  const res = await http.get<AssetHistoryOut>(`/assets/${assetId}/history`);
  return res.data;
}

export type AssetCreate = {
  category: "VEHICLE" | "EPI";
  name: string;
  ref?: string | null;
  plate?: string | null;
  model_name?: string | null;
  km_current?: number | null;
  insurance_date?: string | null; // YYYY-MM-DD
  inspection_date?: string | null; // YYYY-MM-DD
  epi_type?: string | null;
  epi_category_id?: number | null;
  epi_attributes?: Record<string, string> | null;
  serial_number?: string | null;
  next_inspection_date?: string | null; // YYYY-MM-DD
  notes?: string | null;
  site_id?: number | null;
};

export async function createAsset(payload: AssetCreate) {
  const res = await http.post("/assets", payload);
  return res.data;
}

export type AssetUpdate = {
  category?: "VEHICLE" | "EPI";
  name?: string;
  ref?: string | null;
  status?: "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "RETIRED" | "DESTROYED" | "STOLEN";
  plate?: string | null;
  model_name?: string | null;
  km_current?: number | null;
  insurance_date?: string | null;
  inspection_date?: string | null;
  epi_type?: string | null;
  epi_category_id?: number | null;
  epi_attributes?: Record<string, string> | null;
  serial_number?: string | null;
  next_inspection_date?: string | null;
  notes?: string | null;
  site_id?: number | null;
};

export async function updateAsset(assetId: number, payload: AssetUpdate) {
  const res = await http.patch<AssetOut>(`/assets/${assetId}`, payload);
  return res.data;
}

export type AssignIn = {
  public_id: string;
  employee_id?: number | null;
  employee_code?: string | null;
  km_value?: number | null;
  notes?: string | null;
};

export async function assignAsset(payload: AssignIn) {
  const res = await http.post("/scan/assign", payload);
  return res.data;
}

export type ReturnIn = {
  public_id: string;
  km_value?: number | null;
  notes?: string | null;
};

export async function returnAsset(payload: ReturnIn) {
  const res = await http.post("/scan/return", payload);
  return res.data;
}

export async function scanAsset(publicId: string) {
  const res = await http.get<AssetOut>(`/scan/${publicId}`);
  return res.data;
}

export async function fetchQrCodeBlob(publicId: string): Promise<string> {
  const res = await http.get(`/scan/${publicId}/qr`, { responseType: "blob" });
  return URL.createObjectURL(res.data);
}

export async function uploadPurchaseInvoice(assetId: number, file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await http.post<{ ok: boolean; url: string }>(`/assets/${assetId}/purchase-invoice`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}