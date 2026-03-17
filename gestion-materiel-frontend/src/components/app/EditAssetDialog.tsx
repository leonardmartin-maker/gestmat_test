"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { updateAsset, type AssetOut, type AssetUpdate } from "@/lib/api/assets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(1),
  ref: z.string().optional().nullable(),
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]),
  plate: z.string().optional().nullable(),
  km_current: z.coerce.number().int().nonnegative().optional().nullable(),
  insurance_date: z.string().optional().nullable(),
  inspection_date: z.string().optional().nullable(),
  next_inspection_date: z.string().optional().nullable(),
  epi_type: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

export function EditAssetDialog({
  asset,
  onUpdated,
}: {
  asset: AssetOut;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: assetToDefaults(asset),
  });

  useEffect(() => {
    if (open) {
      form.reset(assetToDefaults(asset));
      setApiError(null);
    }
  }, [open, asset]);

  const isVehicle = asset.category === "VEHICLE";

  const submit = async (values: FormValues) => {
    setApiError(null);
    try {
      const payload: AssetUpdate = {
        name: values.name,
        ref: values.ref || null,
        status: values.status,
        plate: values.plate || null,
        km_current: values.km_current ?? null,
        insurance_date: values.insurance_date || null,
        inspection_date: values.inspection_date || null,
        next_inspection_date: values.next_inspection_date || null,
        epi_type: values.epi_type || null,
        serial_number: values.serial_number || null,
        notes: values.notes || null,
      };
      await updateAsset(asset.id, payload);
      setOpen(false);
      onUpdated();
    } catch (e: any) {
      setApiError(e?.response?.data?.detail || e?.message || "Erreur");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Modifier</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier — {asset.name}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input {...form.register("name")} />
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(v) => form.setValue("status", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Disponible</SelectItem>
                  <SelectItem value="ASSIGNED">Attribué</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="RETIRED">Retiré</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ref</Label>
              <Input {...form.register("ref")} />
            </div>

            <div className="space-y-2">
              <Label>Numéro de série</Label>
              <Input {...form.register("serial_number")} />
            </div>

            {isVehicle ? (
              <>
                <div className="space-y-2">
                  <Label>Plaque</Label>
                  <Input {...form.register("plate")} />
                </div>
                <div className="space-y-2">
                  <Label>KM actuel</Label>
                  <Input type="number" {...form.register("km_current")} />
                </div>
                <div className="space-y-2">
                  <Label>Date assurance</Label>
                  <Input type="date" {...form.register("insurance_date")} />
                </div>
                <div className="space-y-2">
                  <Label>Date expertise</Label>
                  <Input type="date" {...form.register("inspection_date")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Prochaine expertise</Label>
                  <Input type="date" {...form.register("next_inspection_date")} />
                </div>
              </>
            ) : (
              <div className="space-y-2 md:col-span-2">
                <Label>Type EPI</Label>
                <Input {...form.register("epi_type")} />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} {...form.register("notes")} />
            </div>
          </div>

          {apiError && <div className="text-sm text-red-600">{String(apiError)}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function assetToDefaults(asset: AssetOut): FormValues {
  return {
    name: asset.name,
    ref: asset.ref ?? "",
    status: (asset.status as FormValues["status"]) ?? "AVAILABLE",
    plate: asset.plate ?? "",
    km_current: asset.km_current ?? null,
    insurance_date: (asset as any).insurance_date ?? "",
    inspection_date: (asset as any).inspection_date ?? "",
    next_inspection_date: (asset as any).next_inspection_date ?? "",
    epi_type: asset.epi_type ?? "",
    serial_number: asset.serial_number ?? "",
    notes: (asset as any).notes ?? "",
  };
}
