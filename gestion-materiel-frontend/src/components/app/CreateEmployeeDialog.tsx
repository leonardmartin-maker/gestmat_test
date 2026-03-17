"use client";

import { useState } from "react";
import { createEmployee } from "@/lib/api/employees";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateEmployeeDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [code, setCode] = useState("");

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
      });
      setOpen(false);
      setFirst(""); setLast(""); setCode("");
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
        <Button>Nouvel employé</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
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

          {err && <div className="text-sm text-red-600">{String(err)}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Envoi…" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}