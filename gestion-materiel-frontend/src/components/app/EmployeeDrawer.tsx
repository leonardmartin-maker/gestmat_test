"use client";

import { useEffect, useState } from "react";
import { getEmployee, updateEmployee, type EmployeeOut } from "@/lib/api/employees";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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
  const [emp, setEmp] = useState<EmployeeOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [code, setCode] = useState("");

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
                <div className="mt-2 text-xs text-muted-foreground">
                  ID {emp.id} • {emp.active ? "Actif" : "Inactif"}
                  {emp.employee_code ? ` • ${emp.employee_code}` : ""}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {emp && (
                <Button variant="outline" size="sm" onClick={toggleActive} disabled={loading}>
                  {emp.active ? "Désactiver" : "Activer"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={load} disabled={loading || !employeeId}>
                {loading ? "…" : "Rafraîchir"}
              </Button>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {err && <div className="rounded-md border p-3 text-sm text-red-600">{String(err)}</div>}
          {!emp && !err && (
            <div className="text-sm text-muted-foreground">{loading ? "Chargement…" : "Sélectionne un employé"}</div>
          )}

          {emp && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input value={first} onChange={(e) => setFirst(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={last} onChange={(e) => setLast(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Code employé</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex: EMP-102" />
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Fermer
                </Button>
                <Button onClick={save} disabled={loading}>
                  {loading ? "…" : "Enregistrer"}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}