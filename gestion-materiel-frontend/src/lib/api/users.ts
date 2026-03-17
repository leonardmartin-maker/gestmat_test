import { http } from "@/lib/api/http";

export type UserOut = {
  id: number;
  email: string;
  role: string;
  created_at: string | null;
};

export type UserList = {
  data: UserOut[];
  meta: { limit: number; offset: number; total: number; has_more?: boolean | null };
};

export async function listUsers(params?: { limit?: number; offset?: number }) {
  const res = await http.get<UserList>("/admin/users", { params });
  return res.data;
}

export async function createUser(payload: { email: string; password: string; role: string }) {
  const res = await http.post<UserOut>("/admin/users", payload);
  return res.data;
}

export async function updateUserRole(userId: number, role: string) {
  const res = await http.patch<UserOut>(`/admin/users/${userId}/role`, { role });
  return res.data;
}

export async function deleteUser(userId: number) {
  const res = await http.delete(`/admin/users/${userId}`);
  return res.data;
}
