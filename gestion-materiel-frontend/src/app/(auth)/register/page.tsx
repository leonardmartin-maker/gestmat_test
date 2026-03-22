"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { register } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Box,
  Mail,
  Lock,
  Building2,
  User,
  CheckCircle,
  ArrowRight,
  Truck,
  Shield,
  Users,
} from "lucide-react";

const schema = z
  .object({
    company_name: z.string().min(2, "Minimum 2 caracteres"),
    email: z.string().email("Email invalide"),
    password: z.string().min(8, "Minimum 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { company_name: "", email: "", password: "", confirm: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const data = await register({
        email: values.email,
        password: values.password,
        company_name: values.company_name,
      });
      await loginWithToken(data.access_token);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail || e?.message || "Erreur lors de l'inscription";
      form.setError("email", { message: String(msg) });
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #6C5CE7 0%, #a29bfe 50%, #6C5CE7 100%)",
      }}
    >
      <div className="w-full max-w-md space-y-4">
        {success ? (
          <Card className="rounded-2xl shadow-2xl border-0">
            <CardContent className="pt-10 pb-10 px-8 text-center space-y-4">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Compte cree avec succes !</h2>
              <p className="text-sm text-muted-foreground">
                Votre essai gratuit de 14 jours commence maintenant.
                <br />
                Redirection vers votre dashboard...
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="rounded-2xl shadow-2xl border-0">
              <CardContent className="pt-8 pb-8 px-8">
                <div className="flex flex-col items-center mb-6">
                  <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-[#6C5CE7]/10 mb-4">
                    <Box className="h-8 w-8 text-[#6C5CE7]" />
                  </div>
                  <h1 className="text-2xl font-bold text-[#6C5CE7]">GestMat</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Creez votre compte gratuitement
                  </p>
                </div>

                {/* Trial badge */}
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 mb-6 text-center">
                  <div className="text-sm font-semibold text-green-700">
                    14 jours d&apos;essai gratuit
                  </div>
                  <div className="text-xs text-green-600 mt-0.5">
                    Aucune carte bancaire requise
                  </div>
                </div>

                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nom de l&apos;entreprise</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company_name"
                        className="pl-10 rounded-xl"
                        placeholder="Ma Societe SA"
                        {...form.register("company_name")}
                      />
                    </div>
                    {form.formState.errors.company_name && (
                      <p className="text-xs text-red-600">{form.formState.errors.company_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-10 rounded-xl"
                        placeholder="admin@entreprise.ch"
                        {...form.register("email")}
                      />
                    </div>
                    {form.formState.errors.email && (
                      <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        className="pl-10 rounded-xl"
                        placeholder="Minimum 8 caracteres"
                        {...form.register("password")}
                      />
                    </div>
                    {form.formState.errors.password && (
                      <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm"
                        type="password"
                        className="pl-10 rounded-xl"
                        placeholder="Retapez votre mot de passe"
                        {...form.register("confirm")}
                      />
                    </div>
                    {form.formState.errors.confirm && (
                      <p className="text-xs text-red-600">{form.formState.errors.confirm.message}</p>
                    )}
                  </div>

                  <Button
                    className="w-full rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white gap-2"
                    type="submit"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      "Creation en cours..."
                    ) : (
                      <>
                        Commencer l&apos;essai gratuit
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Deja un compte ?{" "}
                    <Link href="/login" className="text-[#6C5CE7] font-medium hover:underline">
                      Se connecter
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Features preview */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-5">
              <div className="text-sm font-semibold text-white mb-3">
                Inclus dans l&apos;essai gratuit :
              </div>
              <div className="space-y-2">
                {[
                  { icon: Truck, text: "Gestion de 3 vehicules" },
                  { icon: Shield, text: "Gestion de 3 equipements (EPI)" },
                  { icon: Users, text: "Jusqu'a 3 employes" },
                  { icon: CheckCircle, text: "QR codes, incidents, carburant" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white/90">
                    <item.icon className="h-3.5 w-3.5 text-white/70" />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
