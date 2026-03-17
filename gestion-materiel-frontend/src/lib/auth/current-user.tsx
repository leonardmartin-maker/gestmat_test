"use client";

/**
 * CurrentUserProvider is a no-op wrapper.
 * User data is already provided by AuthProvider in the root layout.
 */
export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
