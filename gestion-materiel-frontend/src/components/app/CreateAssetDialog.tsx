"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createAsset, type AssetCreate } from "@/lib/api/assets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  category: z.enum(["VEHICLE", "EPI"]),
  name: z.string().min(1),
  ref: z.string().optional().nullable(),
  plate: z.string().optional().nullable(),
  km_current: z.coerce.number().int().nonnegative().optional().nullable(),
  insurance_date: z.string().optional().nullable(), // YYYY-MM-DD
  inspection_date: z.string().optional().nullable(),
  next_inspection_date: z.string().optional().nullable(),
  epi_type: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

export function CreateAssetDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { category: "VEHICLE", name: "" },
  });

  const category = form.watch("category");

  const submit = async (values: FormValues) => {
    setApiError(null);
    try {
      const payload: AssetCreate = {
        ...values,
        ref: values.ref ?? null,
        plate: values.plate ?? null,
        epi_type: values.epi_type ?? null,
        serial_number: values.serial_number ?? null,
        notes: values.notes ?? null,
      };
      await createAsset(payload);
      setOpen(false);
      form.reset({ category: "VEHICLE", name: "" });
      onCreated();
    } catch (e: any) {
      setApiError(e?.response?.data?.detail || e?.message || "Erreur");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Créer</Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau matériel</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={category} onValueChange={(v) => form.setValue("category", v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VEHICLE">Véhicule</SelectItem>
                  <SelectItem value="EPI">EPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input {...form.register("name")} />
            </div>

            <div className="space-y-2">
              <Label>Ref</Label>
              <Input {...form.register("ref")} />
            </div>

            <div className="space-y-2">
              <Label>Numéro de série</Label>
              <Input {...form.register("serial_number")} />
            </div>

            {category === "VEHICLE" ? (
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
                  <Label>Date assurance (YYYY-MM-DD)</Label>
                  <Input placeholder="2026-02-25" {...form.register("insurance_date")} />
                </div>
                <div className="space-y-2">
                  <Label>Date expertise (YYYY-MM-DD)</Label>
                  <Input placeholder="2026-02-25" {...form.register("inspection_date")} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Prochaine expertise (YYYY-MM-DD)</Label>
                  <Input placeholder="2027-02-25" {...form.register("next_inspection_date")} />
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