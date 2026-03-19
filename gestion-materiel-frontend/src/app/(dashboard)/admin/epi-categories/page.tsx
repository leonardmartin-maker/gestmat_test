"use client";

import { useEffect, useState } from "react";
import {
  listEpiCategoriesAdmin,
  createEpiCategory,
  updateEpiCategory,
  deleteEpiCategory,
  type EpiCategoryOut,
} from "@/lib/api/epi-categories";
import { EPI_PREDEFINED_ATTRIBUTES } from "@/lib/constants/epi-attributes";
import { RequireAuth } from "@/components/app/RequireAuth";
import { RequireRole } from "@/components/app/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HardHat, Plus, Pencil, Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ATTR_LABEL: Record<string, string> = Object.fromEntries(
  EPI_PREDEFINED_ATTRIBUTES.map((a) => [a.key, a.label])
);

function EpiCategoriesContent() {
  const [categories, setCategories] = useState<EpiCategoryOut[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await listEpiCategoriesAdmin();
      setCategories(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleDelete = async (cat: EpiCategoryOut) => {
    if (!confirm(`Supprimer la catégorie "${cat.name}" ?`)) return;
    try {
      await deleteEpiCategory(cat.id);
      fetch();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardHat className="h-6 w-6" style={{ color: "#6C5CE7" }} />
            Catégories EPI
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : `${categories.length} catégorie(s)`}
          </p>
        </div>
        <EpiCategoryDialog mode="create" onSaved={fetch} />
      </div>

      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <HardHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucune catégorie EPI</p>
          <p className="text-sm">Créez votre première catégorie pour commencer.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="rounded-2xl border p-4 hover:shadow-sm transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cat.icon || "🛡️"}</span>
                  <h3 className="font-semibold text-lg">{cat.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <EpiCategoryDialog mode="edit" category={cat} onSaved={fetch} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(cat)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {cat.enabled_attributes.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Aucun attribut</span>
                ) : (
                  cat.enabled_attributes.map((key) => (
                    <Badge
                      key={key}
                      variant="secondary"
                      className="bg-[#6C5CE7]/10 text-[#6C5CE7] border-[#6C5CE7]/20 text-xs"
                    >
                      {ATTR_LABEL[key] || key}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EpiCategoryDialog({
  mode,
  category,
  onSaved,
}: {
  mode: "create" | "edit";
  category?: EpiCategoryOut;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name || "");
  const [icon, setIcon] = useState(category?.icon || "");
  const [attrs, setAttrs] = useState<string[]>(category?.enabled_attributes || []);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName(category?.name || "");
    setIcon(category?.icon || "");
    setAttrs(category?.enabled_attributes || []);
    setError(null);
  };

  const toggleAttr = (key: string) => {
    setAttrs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        await createEpiCategory({
          name: name.trim(),
          icon: icon.trim() || null,
          enabled_attributes: attrs,
        });
      } else if (category) {
        await updateEpiCategory(category.id, {
          name: name.trim(),
          icon: icon.trim() || null,
          enabled_attributes: attrs,
        });
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
            Nouvelle catégorie
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-[#6C5CE7]" />
            {mode === "create" ? "Nouvelle catégorie EPI" : "Modifier la catégorie"}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-[1fr_80px]">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                required
                className="rounded-xl"
                placeholder="Ex: Casque, Gants, Chaussures…"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Icône</Label>
              <Input
                className="rounded-xl text-center text-xl"
                placeholder="🛡️"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Attributs activés</Label>
            <div className="rounded-xl border p-3 space-y-2">
              {EPI_PREDEFINED_ATTRIBUTES.map((attr) => {
                const isChecked = attrs.includes(attr.key);
                return (
                  <button
                    type="button"
                    key={attr.key}
                    className={`flex items-center gap-3 cursor-pointer rounded-lg p-2 -m-1 transition-colors text-left w-full ${
                      isChecked ? "bg-[#6C5CE7]/10" : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleAttr(attr.key)}
                  >
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isChecked ? "bg-[#6C5CE7] border-[#6C5CE7]" : "border-gray-300"
                    }`}>
                      {isChecked && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{attr.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({attr.type === "select"
                          ? attr.options?.join(", ")
                          : attr.type === "date"
                          ? "date"
                          : "texte libre"})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{String(error)}</div>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpen(false)}
            >
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

export default function EpiCategoriesPage() {
  return (
    <RequireAuth>
      <RequireRole allow={["ADMIN"]}>
        <EpiCategoriesContent />
      </RequireRole>
    </RequireAuth>
  );
}
