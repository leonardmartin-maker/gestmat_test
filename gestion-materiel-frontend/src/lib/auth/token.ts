const KEY = "gm_token";

export const tokenStorage = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(KEY);
  },
  set(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY, token);
  },
  clear() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(KEY);
  },
};