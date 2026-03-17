import axios from "axios";
import { config } from "@/lib/config";
import { tokenStorage } from "@/lib/auth/token";

export const http = axios.create({
  baseURL: config.apiBaseUrl,
});

http.interceptors.request.use((req) => {
  const token = tokenStorage.get();
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      tokenStorage.clear();
      // redirect soft côté client
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);