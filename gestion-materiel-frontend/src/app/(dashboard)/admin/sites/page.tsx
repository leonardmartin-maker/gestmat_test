"use client";

import { useEffect, useState } from "react";
import {
  listSites,
  createSite,
  updateSite,
  deleteSite,
  type SiteOut,
  type SiteCreate,
  type SiteUpdate,
} from "@/lib/api/sites";
import { RequireAuth } from "@/components/app/RequireAuth";
import { RequireRole } from "@/components/app/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function SitesContent() {
  const [sites, setSites] = useState<SiteOut[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const res = await listSites();
      setSites(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleDeactivate = async (site: SiteOut) => {
    if (!confirm(`Désactiver le site "${site.name}" ?`)) return;
    try {
      await deleteSite(site.id);
      fetchSites();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
    }
  };

  const handleReactivate = async (site: SiteOut) => {
    try {
      await updateSite(site.id, { is_active: true });
      fetchSites();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
    }
  };

  const activeSites = sites.filter((s) => s.is_active);
  const inactiveSites = sites.filter((s) => !s.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" style={{ color: "#6C5CE7" }} />
            Sites / Dépôts
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Chargement…" : `${activeSites.length} site(s) actif(s)`}
          </p>
        </div>
        <SiteDialog mode="create" onSaved={fetchSites} />
      </div>

      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : activeSites.length === 0 && inactiveSites.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun site</p>
          <p className="text-sm">Créez votre premier site pour commencer.</p>
        </div>
      ) : (
        <>
          {/* Active sites */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSites.map((site) => (
              <div
                key={site.id}
                className="rounded-2xl border p-4 hover:shadow-sm transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#6C5CE7]" />
                    <h3 className="font-semibold text-lg">{site.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <SiteDialog mode="edit" site={site} onSaved={fetchSites} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => handleDeactivate(site)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {site.address && (
                  <p className="text-sm text-muted-foreground">{site.address}</p>
                )}

                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 text-xs"
                  >
                    Actif
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Créé le {new Date(site.created_at).toLocaleDateString("fr-CH")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Inactive sites */}
          {inactiveSites.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Sites désactivés ({inactiveSites.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inactiveSites.map((site) => (
                  <div
                    key={site.id}
                    className="rounded-2xl border border-dashed p-4 opacity-60 hover:opacity-100 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold">{site.name}</h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[#6C5CE7]"
                        onClick={() => handleReactivate(site)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Réactiver
                      </Button>
                    </div>
                    {site.address && (
                      <p className="text-sm text-muted-foreground">{site.address}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SiteDialog({
  mode,
  site,
  onSaved,
}: {
  mode: "create" | "edit";
  site?: SiteOut;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(site?.name || "");
  const [address, setAddress] = useState(site?.address || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName(site?.name || "");
    setAddress(site?.address || "");
    setError(null);
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
        await createSite({
          name: name.trim(),
          address: address.trim() || null,
        });
      } else if (site) {
        await updateSite(site.id, {
          name: name.trim(),
          address: address.trim() || null,
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
            Nouveau site
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
            <Building2 className="h-5 w-5 text-[#6C5CE7]" />
            {mode === "create" ? "Nouveau site" : "Modifier le site"}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input
              required
              className="rounded-xl"
              placeholder="Ex: Genève, Lausanne, Zurich…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input
              className="rounded-xl"
              placeholder="Ex: Rue du Commerce 12, 1204 Genève"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
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

export default function SitesPage() {
  return (
    <RequireAuth>
      <RequireRole allow={["ADMIN"]}>
        <SitesContent />
      </RequireRole>
    </RequireAuth>
  );
}
