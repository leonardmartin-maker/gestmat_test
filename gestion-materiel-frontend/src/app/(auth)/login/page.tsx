"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { login } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Box, Mail, Lock, Smartphone, Share, MoreVertical } from "lucide-react";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { loginWithToken } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const data = await login(values.email, values.password);
      await loginWithToken(data.access_token);
      // Fetch role to redirect accordingly
      const me = await import("@/lib/api/me").then((m) => m.getMe());
      // Use window.location for full reload — ensures auth context + PWA work
      window.location.href = me.role === "EMPLOYEE" ? "/e" : "/dashboard";
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Erreur de connexion";
      form.setError("password", { message: String(msg) });
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #6C5CE7 0%, #a29bfe 50%, #6C5CE7 100%)" }}
    >
      <div className="w-full max-w-sm space-y-4">
        <Card className="rounded-2xl shadow-2xl border-0">
          <CardContent className="pt-8 pb-8 px-8">
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-[#6C5CE7]/10 mb-4">
                <Box className="h-8 w-8 text-[#6C5CE7]" />
              </div>
              <h1 className="text-2xl font-bold text-[#6C5CE7]">GestMat</h1>
              <p className="text-sm text-muted-foreground mt-1">Gestion de matériel simplifiée</p>
            </div>

            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10 rounded-xl"
                    placeholder="vous@entreprise.ch"
                    {...form.register("email")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-10 rounded-xl"
                    placeholder="••••••••"
                    {...form.register("password")}
                  />
                </div>
              </div>

              <Button
                className="w-full rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white"
                type="submit"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Connexion..." : "Se connecter"}
              </Button>

              {(form.formState.errors.email || form.formState.errors.password) && (
                <p className="text-sm text-red-600 text-center">
                  {form.formState.errors.email?.message || form.formState.errors.password?.message}
                </p>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <a href="/register" className="text-[#6C5CE7] font-medium hover:underline">
                  Essai gratuit 14 jours
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section installer l'application */}
        <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="h-5 w-5 text-white" />
            <h2 className="text-sm font-semibold text-white">Installer l&apos;application</h2>
          </div>
          <div className="space-y-2.5 text-xs text-white/80 leading-relaxed">
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center h-5 w-5 rounded-md bg-white/15 shrink-0 mt-0.5">
                <Share className="h-3 w-3 text-white" />
              </div>
              <p>
                <span className="font-medium text-white">iPhone / iPad :</span>{" "}
                Ouvrez cette page dans Safari, appuyez sur{" "}
                <span className="font-medium text-white">Partager</span> puis{" "}
                <span className="font-medium text-white">« Sur l&apos;écran d&apos;accueil »</span>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center h-5 w-5 rounded-md bg-white/15 shrink-0 mt-0.5">
                <MoreVertical className="h-3 w-3 text-white" />
              </div>
              <p>
                <span className="font-medium text-white">Android :</span>{" "}
                Ouvrez dans Chrome, appuyez sur le menu{" "}
                <span className="font-medium text-white">⋮</span> puis{" "}
                <span className="font-medium text-white">« Installer l&apos;application »</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
