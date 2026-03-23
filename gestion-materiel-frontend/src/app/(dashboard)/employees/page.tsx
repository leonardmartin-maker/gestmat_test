"use client";

import { useEffect, useMemo, useState } from "react";
import { listEmployees, type EmployeeOut } from "@/lib/api/employees";
import { listSites, type SiteOut } from "@/lib/api/sites";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { exportEmployeesCsv } from "@/lib/api/export";
import { EmployeeDrawer } from "@/components/app/EmployeeDrawer";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Users, Search, Download, UserSearch, ChevronLeft, ChevronRight, CircleCheck, XCircle, Building2 } from "lucide-react";

function label(e: EmployeeOut) {
  const name = `${e.first_name} ${e.last_name}`.trim();
  const code = e.employee_code ? ` (${e.employee_code})` : "";
  return name + code;
}

export default function EmployeesPage() {
  const [reloadTick, setReloadTick] = useState(0);
  const reload = () => setReloadTick((x) => x + 1);

  const [search, setSearch] = useState("");
  const [active, setActive] = useState<"ALL" | "true" | "false">("ALL");

  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const [rows, setRows] = useState<EmployeeOut[]>([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [sites, setSites] = useState<SiteOut[]>([]);
  const [siteFilter, setSiteFilter] = useState<string>("ALL");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const openDrawer = (id: number) => {
    setSelectedId(id);
    setDrawerOpen(true);
  };

  useEffect(() => {
    listSites({ active: true }).then((res) => setSites(res.data)).catch(() => {});
  }, []);

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const query = useMemo(() => {
    return {
      search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
      active: active === "ALL" ? undefined : active === "true",
      site_id: siteFilter !== "ALL" ? Number(siteFilter) : undefined,
      limit,
      offset,
    };
  }, [debouncedSearch, active, siteFilter, limit, offset]);

  useEffect(() => {
    setLoading(true);
    setErr(null);

    listEmployees(query)
      .then((r) => {
        setRows(r.data);
        setTotal(r.meta.total);
      })
      .catch((e: any) => setErr(e?.response?.data?.detail || e?.message || "Erreur"))
      .finally(() => setLoading(false));
  }, [query, reloadTick]);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" style={{ color: "#6C5CE7" }} />
            Employés
          </h1>
          <p className="text-sm text-muted-foreground">{loading ? "Chargement…" : `${total} employé(s)`}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-[260px] rounded-xl pl-10"
              placeholder="Rechercher (nom, code)…"
              value={search}
              onChange={(e) => {
                setOffset(0);
                setSearch(e.target.value);
              }}
            />
          </div>

          <Select
            value={active}
            onValueChange={(v) => {
              setOffset(0);
              setActive(v as any);
            }}
          >
            <SelectTrigger className="w-[160px] rounded-xl">
              <SelectValue placeholder="Actifs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              <SelectItem value="true">Actifs</SelectItem>
              <SelectItem value="false">Inactifs</SelectItem>
            </SelectContent>
          </Select>

          {sites.length > 0 && (
            <Select
              value={siteFilter}
              onValueChange={(v) => {
                setOffset(0);
                setSiteFilter(v);
              }}
            >
              <SelectTrigger className="w-[180px] rounded-xl">
                <SelectValue placeholder="Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les sites</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={String(limit)}
            onValueChange={(v) => {
              setOffset(0);
              setLimit(Number(v));
            }}
          >
            <SelectTrigger className="w-[120px] rounded-xl">
              <SelectValue placeholder="Page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() =>
              exportEmployeesCsv({
                active: active === "ALL" ? undefined : active === "true",
              })
            }
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {err && <div className="rounded-xl border p-3 text-sm text-red-600">{String(err)}</div>}

      <div className="rounded-2xl border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employé</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Actif</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((e) => (
              <TableRow key={e.id} className="cursor-pointer hover:bg-purple-50/50" onClick={() => openDrawer(e.id)}>
                <TableCell className="font-medium">{label(e)}</TableCell>
                <TableCell>{e.employee_code ?? "—"}</TableCell>
                <TableCell>
                  {e.site_name ? (
                    <span className="text-sm">{e.site_name}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {e.active ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                      <CircleCheck className="h-4 w-4" />
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-400 text-sm font-medium">
                      <XCircle className="h-4 w-4" />
                      Inactif
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <UserSearch className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Aucun résultat</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          Page {page} / {pages} — offset {offset}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl" disabled={!canPrev || loading} onClick={() => setOffset(Math.max(0, offset - limit))}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Précédent
          </Button>
          <Button variant="outline" className="rounded-xl" disabled={!canNext || loading} onClick={() => setOffset(offset + limit)}>
            Suivant
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <EmployeeDrawer open={drawerOpen} onOpenChange={setDrawerOpen} employeeId={selectedId} onUpdated={reload} />
    </div>
  );
}
