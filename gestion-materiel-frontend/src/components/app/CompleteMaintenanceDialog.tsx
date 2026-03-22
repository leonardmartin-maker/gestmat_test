"use client";

import { useState } from "react";
import { completeTask, type MaintenanceTaskOut } from "@/lib/api/maintenance-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CompleteMaintenanceDialog({
  task,
  onCompleted,
}: {
  task: MaintenanceTaskOut;
  onCompleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [performedAt, setPerformedAt] = useState(today);
  const [kmAt, setKmAt] = useState(task.asset_km?.toString() || "");
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPerformedAt(today);
    setKmAt(task.asset_km?.toString() || "");
    setNotes("");
    setCost("");
    setDocument(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!performedAt) {
      setError("La date est obligatoire.");
      return;
    }

    setSubmitting(true);
    try {
      await completeTask(task.id, {
        performed_at: performedAt,
        km_at: kmAt ? parseInt(kmAt) : null,
        notes: notes.trim() || null,
        cost: cost ? parseFloat(cost) : null,
        document: document,
      });
      setOpen(false);
      onCompleted();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs shrink-0"
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1" />
          Effectuer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Maintenance effectuée
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-muted/50 p-3 text-sm">
          <div className="font-medium">{task.task_name}</div>
          <div className="text-xs text-muted-foreground">
            {task.asset_name} {task.asset_plate ? `• ${task.asset_plate}` : ""}
          </div>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Date *</Label>
              <Input
                type="date"
                required
                className="rounded-xl text-sm"
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kilométrage</Label>
              <Input
                type="number"
                className="rounded-xl text-sm"
                placeholder={task.asset_km?.toLocaleString("fr-CH") || "km"}
                value={kmAt}
                onChange={(e) => setKmAt(e.target.value)}
                min={0}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Input
              className="rounded-xl text-sm"
              placeholder="Remarques éventuelles…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Coût (CHF)</Label>
            <Input
              type="number"
              className="rounded-xl text-sm"
              placeholder="0.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              min={0}
              step={0.01}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Facture / fiche mecano</Label>
            <Input
              type="file"
              className="rounded-xl text-sm"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setDocument(e.target.files?.[0] || null)}
            />
          </div>

          {error && <div className="text-xs text-red-600">{String(error)}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
            >
              {submitting ? "Enregistrement…" : "Confirmer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
