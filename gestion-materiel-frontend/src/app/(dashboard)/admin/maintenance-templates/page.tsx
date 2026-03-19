"use client";

import { useEffect, useState } from "react";
import {
  listTemplates,
  seedTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  listKnownModels,
  type MaintenanceTemplateOut,
} from "@/lib/api/maintenance-templates";
import { RequireAuth } from "@/components/app/RequireAuth";
import { RequireRole } from "@/components/app/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatInterval(km: number | null, days: number | null): string {
  const parts: string[] = [];
  if (km) parts.push(`${km.toLocaleString("fr-CH")} km`);
  if (days) {
    if (days >= 365) {
      const years = Math.round(days / 365);
      parts.push(`${years} an${years > 1 ? "s" : ""}`);
    } else {
      const months = Math.round(days / 30);
      parts.push(`${months} mois`);
    }
  }
  return parts.join(" / ") || "—";
}

function MaintenanceTemplatesContent() {
  const [templates, setTemplates] = useState<MaintenanceTemplateOut[]>([]);
  const [knownModels, setKnownModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const [res, models] = await Promise.all([listTemplates(), listKnownModels()]);
      setTemplates(res.data);
      setKnownModels(models);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await seedTemplates();
      alert(`${result.created} tâche(s) créée(s) sur ${result.total} total`);
      fetch();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
    }
    setSeeding(false);
  };

  const handleDelete = async (t: MaintenanceTemplateOut) => {
    if (!confirm(`Supprimer la tâche "${t.task_name}" du modèle "${t.model_name}" ?`)) return;
    try {
      await deleteTemplate(t.id);
      fetch();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
    }
  };

  // Group by model
  const grouped = templates.reduce<Record<string, MaintenanceTemplateOut[]>>((acc, t) => {
    if (!acc[t.model_name]) acc[t.model_name] = [];
    acc[t.model_name].push(t);
    return acc;
  }, {});
  const modelNames = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" style={{ color: "#6C5CE7" }} />
            Plans de maintenance
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : `${templates.length} tâche(s) · ${modelNames.length} modèle(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {templates.length === 0 && !loading && (
            <Button
              onClick={handleSeed}
              disabled={seeding}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {seeding ? "Initialisation…" : "Initialiser plans constructeur"}
            </Button>
          )}
          <TemplateDialog mode="create" knownModels={knownModels} existingModels={modelNames} onSaved={fetch} />
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : modelNames.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun plan de maintenance</p>
          <p className="text-sm">Cliquez sur "Initialiser plans constructeur" pour commencer.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {modelNames.map((model) => (
            <div key={model} className="rounded-2xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-xl">🛵</span>
                  {model}
                </h3>
                <Badge variant="secondary" className="bg-[#6C5CE7]/10 text-[#6C5CE7] border-[#6C5CE7]/20">
                  {grouped[model].length} tâche(s)
                </Badge>
              </div>

              <div className="space-y-1.5">
                {grouped[model].map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{t.task_name}</span>
                      <span className="text-muted-foreground ml-2">
                        ({formatInterval(t.interval_km, t.interval_days)})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TemplateDialog
                        mode="edit"
                        template={t}
                        knownModels={knownModels}
                        existingModels={modelNames}
                        onSaved={fetch}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(t)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {templates.length > 0 && (
        <div className="flex justify-center">
          <Button
            onClick={handleSeed}
            disabled={seeding}
            variant="outline"
            className="rounded-xl"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            {seeding ? "Vérification…" : "Ajouter les tâches constructeur manquantes"}
          </Button>
        </div>
      )}
    </div>
  );
}

function TemplateDialog({
  mode,
  template,
  knownModels,
  existingModels,
  onSaved,
}: {
  mode: "create" | "edit";
  template?: MaintenanceTemplateOut;
  knownModels: string[];
  existingModels: string[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [modelName, setModelName] = useState(template?.model_name || "");
  const [customModel, setCustomModel] = useState("");
  const [taskName, setTaskName] = useState(template?.task_name || "");
  const [intervalKm, setIntervalKm] = useState(template?.interval_km?.toString() || "");
  const [intervalDays, setIntervalDays] = useState(template?.interval_days?.toString() || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allModels = [...new Set([...knownModels, ...existingModels])].sort();
  const isCustom = modelName === "__custom__";

  const reset = () => {
    setModelName(template?.model_name || "");
    setCustomModel("");
    setTaskName(template?.task_name || "");
    setIntervalKm(template?.interval_km?.toString() || "");
    setIntervalDays(template?.interval_days?.toString() || "");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalModel = isCustom ? customModel.trim() : modelName;
    if (!finalModel) {
      setError("Le modèle est obligatoire.");
      return;
    }
    if (!taskName.trim()) {
      setError("Le nom de la tâche est obligatoire.");
      return;
    }
    if (!intervalKm && !intervalDays) {
      setError("Au moins un intervalle (km ou jours) est requis.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        model_name: finalModel,
        task_name: taskName.trim(),
        interval_km: intervalKm ? parseInt(intervalKm) : null,
        interval_days: intervalDays ? parseInt(intervalDays) : null,
      };

      if (mode === "create") {
        await createTemplate(payload);
      } else if (template) {
        await updateTemplate(template.id, payload);
      }
      setOpen(false);
      onSaved();
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
        {mode === "create" ? (
          <Button className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white rounded-xl">
            <Plus className="h-4 w-4 mr-1" />
            Nouvelle tâche
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-[#6C5CE7]" />
            {mode === "create" ? "Nouvelle tâche de maintenance" : "Modifier la tâche"}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Modèle de scooter *</Label>
            <Select value={modelName} onValueChange={setModelName}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sélectionner un modèle…" />
              </SelectTrigger>
              <SelectContent>
                {allModels.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Autre (personnalisé)…</SelectItem>
              </SelectContent>
            </Select>
            {isCustom && (
              <Input
                className="rounded-xl"
                placeholder="Ex: Vespa Primavera 125"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Tâche *</Label>
            <Input
              required
              className="rounded-xl"
              placeholder="Ex: Vidange huile moteur"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Intervalle km</Label>
              <Input
                type="number"
                className="rounded-xl"
                placeholder="Ex: 6000"
                value={intervalKm}
                onChange={(e) => setIntervalKm(e.target.value)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Intervalle jours</Label>
              <Input
                type="number"
                className="rounded-xl"
                placeholder="Ex: 180"
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
                min={1}
              />
              {intervalDays && (
                <p className="text-xs text-muted-foreground">
                  ≈ {Math.round(parseInt(intervalDays) / 30)} mois
                </p>
              )}
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{String(error)}</div>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white rounded-xl"
            >
              {submitting ? "Enregistrement…" : mode === "create" ? "Créer" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MaintenanceTemplatesPage() {
  return (
    <RequireAuth>
      <RequireRole allow={["ADMIN"]}>
        <MaintenanceTemplatesContent />
      </RequireRole>
    </RequireAuth>
  );
}
