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
