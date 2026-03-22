"use client";

import { useEffect, useState } from "react";
import { getEmployee, updateEmployee, getEmployeeAssets, type EmployeeOut } from "@/lib/api/employees";
import { listEvents, type EventOut } from "@/lib/api/events";
import type { AssetOut } from "@/lib/api/assets";
import { useAuth } from "@/lib/auth/auth-context";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, UserX, UserCheck, Mail, Package, History, Truck, Shield, ExternalLink, Trash2 } from "lucide-react";
import { deleteEmployee } from "@/lib/api/admin";

export function EmployeeDrawer({
  open,
  onOpenChange,
  employeeId,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId: number | null;
  onUpdated: () => void;
}) {
  const { canWrite } = useAuth();
  const [emp, setEmp] = useState<EmployeeOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");

  // New: assets & events
  const [assets, setAssets] = useState<AssetOut[]>([]);
  const [events, setEvents] = useState<EventOut[]>([]);

  const load = async () => {
    if (!employeeId) return;
    setLoading(true);
    setErr(null);
    try {
      const [e, empAssets, empEvents] = await Promise.all([
        getEmployee(employeeId),
        getEmployeeAssets(employeeId).catch(() => []),
        listEvents({ employee_id: employeeId, limit: 20 }).catch(() => ({ data: [] })),
      ]);
      setEmp(e);
      setFirst(e.first_name);
      setLast(e.last_name);
      setCode(e.employee_code ?? "");
      setEmail(e.email ?? "");
      setAssets(empAssets);
      setEvents(empEvents.data);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !employeeId) return;
    setEmp(null);
    setAssets([]);
    setEvents([]);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeId]);

  const save = async () => {
    if (!emp) return;
    setErr(null);
    if (!first.trim() || !last.trim()) {
      setErr("Prénom et nom sont requis.");
      return;
    }
    setLoading(true);
    try {
      await updateEmployee(emp.id, {
        first_name: first.trim(),
        last_name: last.trim(),
        employee_code: code.trim() ? code.trim() : null,
        email: email.trim() ? email.trim() : null,
      });
      await load();
      onUpdated();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!emp) return;
    if (!confirm(`Supprimer l'employé "${emp.first_name} ${emp.last_name}" ?\nCette action est réversible (soft delete).`)) return;
    try {
      await deleteEmployee(emp.id);
      onOpenChange(false);
      onUpdated();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const toggleActive = async () => {
    if (!emp) return;
    setLoading(true);
    setErr(null);
    try {
      await updateEmployee(emp.id, { active: !emp.active });
      await load();
      onUpdated();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const eventLabel = (type: string) => {
    if (type === "CHECK_IN") return "Prise";
    if (type === "CHECK_OUT") return "Retour";
    return type;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate">
                {emp ? `${emp.first_name} ${emp.last_name}` : "Employé"}
              </div>
              {emp && (
                <>
                  <div className="mt-2 text-xs text-muted-foreground">
                    ID {emp.id} • {emp.active ? "Actif" : "Inactif"}
                    {emp.employee_code ? ` • ${emp.employee_code}` : ""}
                  </div>
                  {emp.email && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {emp.email}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2">
              {canWrite && emp && (
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={toggleActive} disabled={loading}>
                  {emp.active ? <><UserX className="h-3.5 w-3.5" /> Désactiver</> : <><UserCheck className="h-3.5 w-3.5" /> Activer</>}
                </Button>
              )}
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={load} disabled={loading || !employeeId}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "…" : "Rafraîchir"}
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{String(err)}</div>}
          {!emp && !err && (
            <div className="text-sm text-muted-foreground">{loading ? "Chargement…" : "Sélectionne un employé"}</div>
          )}

          {emp && (
            <>
              {/* Edit form */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input value={first} onChange={(e) => setFirst(e.target.value)} readOnly={!canWrite} />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={last} onChange={(e) => setLast(e.target.value)} readOnly={!canWrite} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Code employé</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex: EMP-102" readOnly={!canWrite} />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-[#6C5CE7]" />
                  Email
                </Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employe@exemple.ch" readOnly={!canWrite} />
              </div>

              {canWrite && (
                <div className="flex justify-between gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-red-600 border-red-300 hover:bg-red-50" onClick={handleDelete} disabled={loading}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={loading}>
                      Fermer
                    </Button>
                    <Button className="rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white" onClick={save} disabled={loading}>
                      {loading ? "…" : "Enregistrer"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <a
                  href={`/employees/${emp.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/20 text-[#6C5CE7] px-4 py-2 text-sm font-medium transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Voir le journal complet
                </a>
              </div>

              <Separator />

              {/* Assets in possession */}
              <div className="space-y-3">
                <div className="text-sm font-medium flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-[#6C5CE7]" />
                  Matériel en possession ({assets.length})
                </div>

                {assets.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucun matériel assigné</div>
                ) : (
                  <div className="space-y-1.5">
                    {assets.map((a) => (
                      <a
                        key={a.id}
                        href={`/assets/${a.id}`}
                        className="flex items-center gap-3 rounded-xl border p-3 text-sm hover:bg-purple-50/30 transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {a.category === "VEHICLE" ? (
                            <Truck className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Shield className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{a.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.category === "VEHICLE" && a.plate ? a.plate : a.epi_type ?? a.category}
                            {a.km_current != null && ` • ${a.km_current.toLocaleString("fr-CH")} km`}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">ASSIGNÉ</Badge>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Event history */}
              <div className="space-y-3">
                <div className="text-sm font-medium flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-[#6C5CE7]" />
                  Historique ({events.length})
                </div>

                {events.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucun événement</div>
                ) : (
                  <div className="space-y-1.5">
                    {events.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl border p-3 text-sm hover:bg-purple-50/30 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge
                              variant="secondary"
                              className={`text-xs flex-shrink-0 ${
                                ev.event_type === "CHECK_IN"
                                  ? "bg-blue-100 text-blue-700"
                                  : ev.event_type === "CHECK_OUT"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {eventLabel(ev.event_type)}
                            </Badge>
                            <span className="font-medium truncate">
                              {ev.asset_name ?? `Asset #${ev.asset_id}`}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {new Date(ev.occurred_at).toLocaleDateString("fr-CH")}{" "}
                            {new Date(ev.occurred_at).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {(ev.km_value != null || ev.notes) && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {ev.km_value != null && `${ev.km_value.toLocaleString("fr-CH")} km`}
                            {ev.km_value != null && ev.notes && " • "}
                            {ev.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
