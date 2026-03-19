"use client";

import { useState } from "react";
import { createEmployee } from "@/lib/api/employees";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail } from "lucide-react";

export function CreateEmployeeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!first.trim() || !last.trim()) {
      setErr("Prénom et nom sont requis.");
      return;
    }
    setSubmitting(true);
    try {
      await createEmployee({
        first_name: first.trim(),
        last_name: last.trim(),
        employee_code: code.trim() ? code.trim() : null,
        email: email.trim() ? email.trim() : null,
      });
      setOpen(false);
      setFirst(""); setLast(""); setCode(""); setEmail("");
      onCreated();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white gap-1.5">
          <UserPlus className="h-4 w-4" />
          Nouvel employé
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Créer un employé</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Prénom *</Label>
              <Input value={first} onChange={(e) => setFirst(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Code employé (optionnel)</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex: EMP-102" />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-[#6C5CE7]" />
              Email (optionnel)
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="employe@exemple.ch"
            />
            <p className="text-xs text-muted-foreground">
              Un compte sera créé et un email avec les identifiants de connexion sera envoyé automatiquement.
            </p>
          </div>

          {err && <div className="text-sm text-red-600">{String(err)}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button className="rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white" onClick={submit} disabled={submitting}>
              {submitting ? "Envoi…" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
