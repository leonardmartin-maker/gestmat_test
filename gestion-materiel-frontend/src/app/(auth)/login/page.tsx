"use client";

import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { login } from "@/lib/api/auth";
import { tokenStorage } from "@/lib/auth/token";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@swissworktogether.ch", password: "admin123" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const data = await login(values.email, values.password);
      tokenStorage.set(data.access_token);
      router.push("/");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Erreur de connexion";
      form.setError("password", { message: String(msg) });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" {...form.register("password")} />
            </div>

            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              Se connecter
            </Button>

            {(form.formState.errors.email || form.formState.errors.password) && (
              <p className="text-sm text-red-600">
                {form.formState.errors.email?.message || form.formState.errors.password?.message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}