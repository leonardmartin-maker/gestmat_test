"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { updateAsset, type AssetOut, type AssetUpdate } from "@/lib/api/assets";
import { listEpiCategories, type EpiCategoryOut } from "@/lib/api/epi-categories";
import { listKnownModels } from "@/lib/api/maintenance-templates";
import { EPI_PREDEFINED_ATTRIBUTES } from "@/lib/constants/epi-attributes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";

const schema = z.object({
  name: z.string().min(1),
  ref: z.string().optional().nullable(),
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED", "DESTROYED", "STOLEN"]),
  plate: z.string().optional().nullable(),
  km_current: z.coerce.number().int().nonnegative().optional().nullable(),
  insurance_date: z.string().optional().nullable(),
  inspection_date: z.string().optional().nullable(),
  next_inspection_date: z.string().optional().nullable(),
  epi_type: z.string().optional().nullable(),
  epi_category_id: z.coerce.number().optional().nullable(),
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
  const [epiCategories, setEpiCategories] = useState<EpiCategoryOut[]>([]);
  const [epiAttrs, setEpiAttrs] = useState<Record<string, string>>(asset.epi_attributes || {});
  const [knownModels, setKnownModels] = useState<string[]>([]);
  const [modelName, setModelName] = useState(asset.model_name || "");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: assetToDefaults(asset),
  });

  useEffect(() => {
    listEpiCategories().then((res) => setEpiCategories(res.data)).catch(() => {});
    listKnownModels().then(setKnownModels).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      form.reset(assetToDefaults(asset));
      setEpiAttrs(asset.epi_attributes || {});
      setModelName(asset.model_name || "");
      setApiError(null);
    }
  }, [open, asset]);

  const isVehicle = asset.category === "VEHICLE";
  const selectedCatId = form.watch("epi_category_id");
  const selectedEpiCat = epiCategories.find((c) => c.id === Number(selectedCatId));
  const enabledAttrs = selectedEpiCat
    ? EPI_PREDEFINED_ATTRIBUTES.filter((a) => selectedEpiCat.enabled_attributes.includes(a.key))
    : [];

  const submit = async (values: FormValues) => {
    setApiError(null);
    try {
      const payload: AssetUpdate = {
        name: values.name,
        ref: values.ref || null,
        status: values.status,
        plate: values.plate || null,
        model_name: isVehicle && modelName ? modelName : null,
        km_current: values.km_current ?? null,
        insurance_date: values.insurance_date || null,
        inspection_date: values.inspection_date || null,
        next_inspection_date: values.next_inspection_date || null,
        epi_type: values.epi_type || selectedEpiCat?.name || null,
        epi_category_id: values.epi_category_id ?? null,
        epi_attributes: Object.keys(epiAttrs).length > 0 ? epiAttrs : null,
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
        <Button variant="outline" className="rounded-xl gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-[#6C5CE7]" />
            Modifier — {asset.name}
          </DialogTitle>
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
                  <SelectItem value="DESTROYED">Détruit</SelectItem>
                  <SelectItem value="STOLEN">Volé</SelectItem>
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
                <div className="space-y-2 md:col-span-2">
                  <Label>Modèle</Label>
                  <Select value={modelName || "__none__"} onValueChange={(v) => setModelName(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un modèle…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucun / Autre</SelectItem>
                      {knownModels.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              <>
                {/* EPI Category selector */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Catégorie EPI</Label>
                  <Select
                    value={selectedCatId ? String(selectedCatId) : undefined}
                    onValueChange={(v) => { form.setValue("epi_category_id", Number(v)); setEpiAttrs({}); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie EPI…" />
                    </SelectTrigger>
                    <SelectContent>
                      {epiCategories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.icon ? `${c.icon} ` : ""}{c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dynamic attributes */}
                {enabledAttrs.length > 0 && (
                  <div className="md:col-span-2 rounded-xl bg-[#6C5CE7]/5 border border-[#6C5CE7]/20 p-3 space-y-3">
                    <p className="text-xs font-medium text-[#6C5CE7]">Attributs — {selectedEpiCat?.name}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {enabledAttrs.map((attr) => (
                        <div key={attr.key} className="space-y-1">
                          <Label className="text-xs">{attr.label}</Label>
                          {attr.type === "select" ? (
                            <Select
                              value={epiAttrs[attr.key] || undefined}
                              onValueChange={(v) => setEpiAttrs((prev) => ({ ...prev, [attr.key]: v }))}
                            >
                              <SelectTrigger className="rounded-lg h-9">
                                <SelectValue placeholder="Choisir…" />
                              </SelectTrigger>
                              <SelectContent>
                                {attr.options?.map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : attr.type === "date" ? (
                            <Input
                              type="date"
                              className="rounded-lg h-9"
                              value={epiAttrs[attr.key] || ""}
                              onChange={(e) => setEpiAttrs((prev) => ({ ...prev, [attr.key]: e.target.value }))}
                            />
                          ) : (
                            <Input
                              className="rounded-lg h-9"
                              value={epiAttrs[attr.key] || ""}
                              onChange={(e) => setEpiAttrs((prev) => ({ ...prev, [attr.key]: e.target.value }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback manual EPI type */}
                {!selectedCatId && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Type EPI (manuel)</Label>
                    <Input {...form.register("epi_type")} />
                  </div>
                )}
              </>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={3} {...form.register("notes")} />
            </div>
          </div>

          {apiError && <div className="text-sm text-red-600">{String(apiError)}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" className="rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white" disabled={form.formState.isSubmitting}>
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
    epi_category_id: asset.epi_category_id ?? null,
    serial_number: asset.serial_number ?? "",
    notes: (asset as any).notes ?? "",
  };
}
