/**
 * Public (unauthenticated) API for employee self-service scan.
 * Uses a separate axios instance — NO JWT, NO 401 redirect.
 */
import axios from "axios";
import { config } from "@/lib/config";

const publicHttp = axios.create({ baseURL: config.apiBaseUrl });

// ---------- Types ----------

export interface PublicAssetOut {
  public_id: string;
  name: string;
  category: string;
  status: string;
  plate: string | null;
  km_current: number | null;
  epi_type: string | null;
}

export interface PublicActionResult {
  success: boolean;
  message: string;
  asset: PublicAssetOut;
}

// ---------- API calls ----------

export async function publicScanAsset(publicId: string): Promise<PublicAssetOut> {
  const { data } = await publicHttp.get<PublicAssetOut>(`/public/scan/${publicId}`);
  return data;
}

export async function publicTakeAsset(payload: {
  public_id: string;
  employee_code: string;
  km_value?: number | null;
  notes?: string | null;
}): Promise<PublicActionResult> {
  const { data } = await publicHttp.post<PublicActionResult>("/public/scan/take", payload);
  return data;
}

export async function publicReturnAsset(payload: {
  public_id: string;
  employee_code: string;
  km_value?: number | null;
  notes?: string | null;
}): Promise<PublicActionResult> {
  const { data } = await publicHttp.post<PublicActionResult>("/public/scan/return", payload);
  return data;
}
