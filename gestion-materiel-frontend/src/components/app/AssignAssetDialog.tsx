"use client";

import { useEffect, useMemo, useState } from "react";
import { assignAsset } from "@/lib/api/assets";
import { listEmployees, type EmployeeOut } from "@/lib/api/employees";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  publicId: string;
  isVehicle: boolean;
  triggerLabel?: string;
  onDone: () => void;
};

function empLabel(e: EmployeeOut) {
  const name = `${e.first_name} ${e.last_name}`.trim();
  const code = e.employee_code ? ` (${e.employee_code})` : "";
  return name + code;
}

export function AssignAssetDialog({ publicId, isVehicle, triggerLabel = "Attribuer", onDone }: Props) {
  const [open, setOpen] = useState(false);

  const [loadingEmps, setLoadingEmps] = useState(false);
  const [emps, setEmps] = useState<EmployeeOut[]>([]);
  const [empId, setEmpId] = useState<string>(""); // string for Select
  const [km, setKm] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoadingEmps(true);
    listEmployees({ active: true })
      .then((r) => setEmps(r.data))
      .catch((e: any) => setError(e?.response?.data?.detail || e?.message || "Erreur chargement employés"))
      .finally(() => setLoadingEmps(false));
  }, [open]);

  const selected = useMemo(() => {
    const id = Number(empId);
    return emps.find((e) => e.id === id) || null;
  }, [empId, emps]);

  const canSubmit = useMemo(() => {
    if (!empId) return false;
    if (isVehicle && km.trim() && Number.isNaN(Number(km))) return false;
    return true;
  }, [empId, isVehicle, km]);

  const submit = async () => {
    setError(null);

    if (!empId) {
      setError("Choisis un employé.");
      return;
    }

    const kmVal = km.trim() === "" ? null : Number(km);
    if (kmVal !== null && (Number.isNaN(kmVal) || kmVal < 0)) {
      setError("KM invalide.");
      return;
    }

    setSubmitting(true);
    try {
      await assignAsset({
        public_id: publicId,
        employee_id: Number(empId),
        km_value: kmVal,
        notes: notes.trim() ? notes.trim() : null,
      });
      setOpen(false);
      setEmpId("");
      setKm("");
      setNotes("");
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{triggerLabel}</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Attribuer le matériel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            public_id: <span className="font-mono">{publicId}</span>
          </div>

          <div className="space-y-2">
            <Label>Employé *</Label>
            <Select value={empId} onValueChange={setEmpId} disabled={loadingEmps}>
              <SelectTrigger>
                <SelectValue placeholder={loadingEmps ? "Chargement…" : "Choisir un employé"} />
              </SelectTrigger>
              <SelectContent>
                {emps.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {empLabel(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <div className="text-xs text-muted-foreground">
                ID: {selected.id} {selected.employee_code ? `• Code: ${selected.employee_code}` : ""}
              </div>
            )}
          </div>

          {isVehicle && (
            <div className="space-y-2">
              <Label>KM (optionnel à l’attribution)</Label>
              <Input
                type="number"
                min={0}
                placeholder="ex: 152340"
                value={km}
                onChange={(e) => setKm(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <div className="text-sm text-red-600">{String(error)}</div>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={!canSubmit || submitting}>
              {submitting ? "Envoi…" : "Attribuer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}