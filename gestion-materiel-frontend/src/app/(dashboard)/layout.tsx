import { AuthGuard } from "@/lib/auth/guard";
import { CurrentUserProvider } from "@/lib/auth/current-user";
import { AppShell } from "@/components/app/AppShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <CurrentUserProvider>
        <AppShell>{children}</AppShell>
      </CurrentUserProvider>
    </AuthGuard>
  );
}