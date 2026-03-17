import { http } from "@/lib/api/http";

export type EmployeeOut = {
  id: number;
  first_name: string;
  last_name: string;
  employee_code: string | null;
  active: boolean;
};

export type Meta = { limit: number; offset: number; total: number; has_more?: boolean | null };
export type EmployeeList = { data: EmployeeOut[]; meta: Meta };

export type EmployeeCreate = {
  first_name: string;
  last_name: string;
  employee_code?: string | null;
};

export type EmployeeUpdate = {
  first_name?: string | null;
  last_name?: string | null;
  employee_code?: string | null;
  active?: boolean | null;
};

export async function listEmployees(params?: { search?: string; active?: boolean; limit?: number; offset?: number }) {
  const res = await http.get<EmployeeList>("/employees", { params: { limit: 50, offset: 0, ...params } });
  return res.data;
}

export async function createEmployee(payload: EmployeeCreate) {
  const res = await http.post<EmployeeOut>("/employees", payload);
  return res.data;
}

export async function updateEmployee(id: number, payload: EmployeeUpdate) {
  const res = await http.patch<EmployeeOut>(`/employees/${id}`, payload);
  return res.data;
}

export async function getEmployee(id: number) {
  const res = await http.get<EmployeeOut>(`/employees/${id}`);
  return res.data;
}