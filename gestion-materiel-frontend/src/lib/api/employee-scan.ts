/**
 * Authenticated employee self-service scan API.
 * Uses the main http instance with JWT token.
 * Take/Return use FormData (multipart) for photo uploads.
 */
import { http } from "@/lib/api/http";

// ---------- Types ----------

export interface EmployeeAssetOut {
  public_id: string;
  name: string;
  category: string;
  status: string;
  plate: string | null;
  km_current: number | null;
  epi_type: string | null;
}

export interface PhotoOut {
  id: number;
  category: string;
  url: string;
}

export interface EmployeeActionResult {
  success: boolean;
  message: string;
  asset: EmployeeAssetOut;
  photos: PhotoOut[];
}

// ---------- API calls ----------

export async function scanAsset(publicId: string): Promise<EmployeeAssetOut> {
  const { data } = await http.get<EmployeeAssetOut>(`/employee-scan/${publicId}`);
  return data;
}

export interface TakeReturnPayload {
  public_id: string;
  employee_code: string;
  km_value?: number | null;
  notes?: string | null;
  damage_description?: string | null;
  state_photos: File[];
  damage_photos?: File[];
  km_photo?: File[];
}

function buildFormData(payload: TakeReturnPayload): FormData {
  const fd = new FormData();
  fd.append("public_id", payload.public_id);
  fd.append("employee_code", payload.employee_code);
  if (payload.km_value != null) fd.append("km_value", String(payload.km_value));
  if (payload.notes) fd.append("notes", payload.notes);
  if (payload.damage_description) fd.append("damage_description", payload.damage_description);

  for (const file of payload.state_photos) {
    fd.append("state_photos", file);
  }
  if (payload.damage_photos) {
    for (const file of payload.damage_photos) {
      fd.append("damage_photos", file);
    }
  }
  if (payload.km_photo) {
    for (const file of payload.km_photo) {
      fd.append("km_photo", file);
    }
  }

  return fd;
}

export async function takeAsset(payload: TakeReturnPayload): Promise<EmployeeActionResult> {
  const fd = buildFormData(payload);
  const { data } = await http.post<EmployeeActionResult>("/employee-scan/take", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function returnAsset(payload: TakeReturnPayload): Promise<EmployeeActionResult> {
  const fd = buildFormData(payload);
  const { data } = await http.post<EmployeeActionResult>("/employee-scan/return", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ---------- My Events (employee history) ----------

export interface MyEventOut {
  id: number;
  event_type: string;
  occurred_at: string;
  asset_id: number;
  asset_name: string;
  km_value: number | null;
  notes: string | null;
  damage_description: string | null;
  photos: PhotoOut[];
}

export async function listMyEvents(limit = 20): Promise<MyEventOut[]> {
  const { data } = await http.get<{ data: MyEventOut[] }>("/employee-scan/my-events", {
    params: { limit },
  });
  return data.data;
}

// ---------- Maintenance Alerts ----------

export interface MaintenanceAlert {
  id: number;
  asset_name: string;
  task_name: string;
  due_type: "date" | "km";
  due_value: string;
  urgency: "warning" | "critical";
}

export async function getMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
  const { data } = await http.get<{ data: MaintenanceAlert[] }>("/employee-scan/maintenance-alerts");
  return data.data;
}
