"use client";

import { useMemo, useState } from "react";
import { returnAsset } from "@/lib/api/assets";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  publicId: string;
  isVehicle: boolean;
  triggerLabel?: string;
  onDone: () => void;
};

export function ReturnAssetDialog({ publicId, isVehicle, triggerLabel = "Retour", onDone }: Props) {
  const [open, setOpen] = useState(false);

  const [km, setKm] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!isVehicle) return true;
    if (!km.trim()) return false;
    const n = Number(km);
    return !Number.isNaN(n) && n >= 0;
  }, [isVehicle, km]);

  const submit = async () => {
    setError(null);

    let kmVal: number | null = null;
    if (km.trim() !== "") {
      kmVal = Number(km);
      if (Number.isNaN(kmVal) || kmVal < 0) {
        setError("KM invalide.");
        return;
      }
    } else if (isVehicle) {
      setError("KM requis pour un véhicule.");
      return;
    }

    setSubmitting(true);
    try {
      await returnAsset({
        public_id: publicId,
        km_value: kmVal,
        notes: notes.trim() ? notes.trim() : null,
      });
      setOpen(false);
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
        <Button variant="outline">{triggerLabel}</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Retour du matériel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 text-sm text-muted-foreground">
            public_id: <span className="font-mono">{publicId}</span>
          </div>

          {isVehicle && (
            <div className="space-y-2">
              <Label>KM au retour *</Label>
              <Input
                type="number"
                min={0}
                placeholder="ex: 152980"
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
              {submitting ? "Envoi…" : "Valider le retour"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}