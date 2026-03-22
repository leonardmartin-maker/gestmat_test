import { http } from "./http";

export type TokenOut = {
  access_token: string;
  token_type: string;
};

export async function login(email: string, password: string) {
  const res = await http.post<TokenOut>("/auth/login", { email, password });
  return res.data;
}

export async function register(data: {
  email: string;
  password: string;
  company_name: string;
  full_name?: string;
}) {
  const res = await http.post<TokenOut>("/auth/register", data);
  return res.data;
}

export async function startDemo() {
  const res = await http.post<TokenOut>("/auth/demo");
  return res.data;
}

export async function me() {
  const res = await http.get("/me");
  return res.data;
}
