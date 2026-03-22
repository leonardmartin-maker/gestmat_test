import { http } from "@/lib/api/http";

// ---------- Types ----------

export interface FuelReceiptOut {
  id: number;
  employee_id: number;
  employee_name: string;
  asset_id: number;
  asset_name: string;
  photo_url: string;
  amount: number | null;
  liters: number | null;
  receipt_date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  notes: string | null;
  created_at: string;
}

export interface FuelReceiptUploadResult {
  success: boolean;
  receipt: FuelReceiptOut;
  ocr_amount: number | null;
  ocr_liters: number | null;
}

export interface FuelSummaryEntry {
  employee_id: number;
  employee_name: string;
  total_amount: number;
  total_liters: number;
  receipt_count: number;
}

// ---------- Employee endpoints ----------

export interface OcrPreview {
  photo_path: string;
  photo_url: string;
  amount: number | null;
  liters: number | null;
  date: string | null;
  error: string | null;
}

export async function analyzeFuelReceipt(photo: File): Promise<OcrPreview> {
  const fd = new FormData();
  fd.append("photo", photo);
  const { data } = await http.post<OcrPreview>("/fuel-receipts/analyze", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function uploadFuelReceipt(payload: {
  asset_id: number;
  receipt_date: string;
  amount?: number | null;
  liters?: number | null;
  notes?: string | null;
  photo?: File;
  photo_path?: string;
}): Promise<FuelReceiptUploadResult> {
  const fd = new FormData();
  fd.append("asset_id", String(payload.asset_id));
  fd.append("receipt_date", payload.receipt_date);
  if (payload.amount != null) fd.append("amount", String(payload.amount));
  if (payload.liters != null) fd.append("liters", String(payload.liters));
  if (payload.notes) fd.append("notes", payload.notes);
  if (payload.photo_path) fd.append("photo_path", payload.photo_path);
  if (payload.photo) fd.append("photo", payload.photo);

  const { data } = await http.post<FuelReceiptUploadResult>("/fuel-receipts/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function listMyFuelReceipts(limit = 50, offset = 0) {
  const { data } = await http.get<{ data: FuelReceiptOut[]; total: number }>("/fuel-receipts/my", {
    params: { limit, offset },
  });
  return data;
}

export interface MyFuelSummary {
  month: number;
  year: number;
  total_amount: number;
  total_liters: number;
  approved_count: number;
  pending_count: number;
}

export async function getMyFuelSummary(month: number, year: number): Promise<MyFuelSummary> {
  const { data } = await http.get<MyFuelSummary>("/fuel-receipts/my/summary", {
    params: { month, year },
  });
  return data;
}

// ---------- Manager/Admin endpoints ----------

export async function listFuelReceipts(params: {
  status?: string;
  employee_id?: number;
  month?: number;
  year?: number;
  limit?: number;
  offset?: number;
}) {
  const { data } = await http.get<{ data: FuelReceiptOut[]; total: number }>("/fuel-receipts", {
    params,
  });
  return data;
}

export async function reviewFuelReceipt(id: number, status: "APPROVED" | "REJECTED", notes?: string) {
  const fd = new FormData();
  fd.append("status", status);
  if (notes) fd.append("notes", notes);
  const { data } = await http.patch(`/fuel-receipts/${id}/review`, fd);
  return data;
}

export async function getFuelSummary(month: number, year: number) {
  const { data } = await http.get<{ month: number; year: number; data: FuelSummaryEntry[] }>(
    "/fuel-receipts/summary",
    { params: { month, year } },
  );
  return data;
}
