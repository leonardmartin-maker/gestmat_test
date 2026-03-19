"use client";

import { useEffect, useState } from "react";
import { getEmployee, updateEmployee, type EmployeeOut } from "@/lib/api/employees";
import { useAuth } from "@/lib/auth/auth-context";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, UserX, UserCheck, Mail } from "lucide-react";

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

  const load = async () => {
    if (!employeeId) return;
    setLoading(true);
    setErr(null);
    try {
      const e = await getEmployee(employeeId);
      setEmp(e);
      setFirst(e.first_name);
      setLast(e.last_name);
      setCode(e.employee_code ?? "");
      setEmail(e.email ?? "");
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !employeeId) return;
    setEmp(null);
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

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={loading}>
                  Fermer
                </Button>
                {canWrite && (
                  <Button className="rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white" onClick={save} disabled={loading}>
                    {loading ? "…" : "Enregistrer"}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}