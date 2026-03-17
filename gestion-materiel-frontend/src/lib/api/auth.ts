import { http } from "./http";

export type TokenOut = {
  access_token: string;
  token_type: string; // "bearer"
};

export async function login(email: string, password: string) {
  const res = await http.post<TokenOut>("/auth/login", { email, password });
  return res.data;
}

export async function me() {
  const res = await http.get("/me");
  return res.data;
}