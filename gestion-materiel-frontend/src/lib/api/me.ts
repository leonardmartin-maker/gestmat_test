import { http } from "@/lib/api/http";

export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

export type MeOut = {
  id: number;
  email: string;
  role: Role;
  company_id?: number;
  full_name?: string | null;
  employee_code?: string | null;
};

export async function getMe() {
  const res = await http.get<MeOut>("/me");
  return res.data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await http.patch("/me/password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return res.data;
}