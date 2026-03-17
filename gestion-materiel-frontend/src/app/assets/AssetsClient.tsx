"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { listAssetsWithAssignee, type AssetOutWithAssignee } from "@/lib/api/assets";
import { exportAssetsCsv } from "@/lib/api/export";
import { CreateAssetDialog } from "@/components/app/CreateAssetDialog";
import { AssetDrawer } from "@/components/app/AssetDrawer";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function assigneeLabel(a: AssetOutWithAssignee) {
  const asg = a.assigned_to;
  if (!asg) return "—";
  const name = [asg.first_name, asg.last_name].filter(Boolean).join(" ").trim();
  const code = asg.employee_code ? ` (${asg.employee_code})` : "";
  return (name || `#${asg.employee_id}`) + code;
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-muted"
      title="Retirer ce filtre"
    >
      <span>{label}</span>
      <span className="text-muted-foreground">×</span>
    </button>
  );
}

export default function AssetsClient() {
  const router = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

  const openDrawer = (id: number) => {
    setSelectedAssetId(id);
    setDrawerOpen(true);
  };

  const [reloadTick, setReloadTick] = useState(0);
  const reload = () => setReloadTick((x) => x + 1);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [category, setCategory] = useState<string>("ALL");

  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AssetOutWithAssignee[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [sort, setSort] = useState<"name" | "status" | "category" | "last_event_at">("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const sp = searchParams;

    const s = sp.get("search");
    const st = sp.get("status");
    const cat = sp.get("category");
    const lim = sp.get("limit");
    const off = sp.get("offset");
    const so = sp.get("sort");
    const di = sp.get("dir");

    if (s !== null) setSearch(s);
    if (st !== null) setStatus(st);
    if (cat !== null) setCategory(cat);
    if (lim !== null && !Number.isNaN(Number(lim))) setLimit(Number(lim));
    if (off !== null && !Number.isNaN(Number(off))) setOffset(Number(off));

    if (so === "name" || so === "status" || so === "category" || so === "last_event_at") setSort(so);
    if (di === "asc" || di === "desc") setDir(di);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setUrl = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === "ALL") sp.delete(k);
      else sp.set(k, String(v));
    });
    router.replace(`${pathname}?${sp.toString()}`);
  };

  useEffect(() => {
    setUrl({
      search: search.trim() ? search.trim() : undefined,
      status,
      category,
      limit,
      offset,
      sort,
      dir,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, category, limit, offset, sort, dir]);

  const query = useMemo(() => {
    return {
      search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
      status: status === "ALL" ? undefined : status,
      category: category === "ALL" ? undefined : category,
      limit,
      offset,
    };
  }, [debouncedSearch, status, category, limit, offset]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    listAssetsWithAssignee(query)
      .then((res) => {
        setRows(res.data);
        setTotal(res.meta.total);
      })
      .catch((e: any) => {
        setError(e?.response?.data?.detail || e?.message || "Erreur");
      })
      .finally(() => setLoading(false));
  }, [query, reloadTick]);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));

  const extraCols = category === "VEHICLE" ? 2 : 1;
  const colCount = 4 + extraCols + 1;

  const sortedRows = useMemo(() => {
    const copy = [...rows];

    const getVal = (a: AssetOutWithAssignee) => {
      if (sort === "name") return a.name ?? "";
      if (sort === "status") return a.status ?? "";
      if (sort === "category") return a.category ?? "";
      if (sort === "last_event_at") return a.last_event_at ?? "";
      return "";
    };

    copy.sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);
      const cmp = String(av).localeCompare(String(bv), "fr", { numeric: true, sensitivity: "base" });
      return dir === "asc" ? cmp : -cmp;
    });

    return copy;
  }, [rows, sort, dir]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Matériel</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Chargement…" : `${total} élément(s)`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Input
              className="w-[280px]"
              placeholder="Rechercher (nom, ref, plaque, série…)…"
              value={search}
              onChange={(e) => {
                setOffset(0);
                setSearch(e.target.value);
              }}
            />

            <Select
              value={category}
              onValueChange={(v) => {
                setOffset(0);
                setCategory(v);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes</SelectItem>
                <SelectItem value="VEHICLE">Véhicule</SelectItem>
                <SelectItem value="EPI">EPI</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(v) => {
                setOffset(0);
                setStatus(v);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="AVAILABLE">Disponible</SelectItem>
                <SelectItem value="ASSIGNED">Attribué</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="RETIRED">Retiré</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setOffset(0);
                setLimit(Number(v));
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={`${sort}:${dir}`}
              onValueChange={(v) => {
                setOffset(0);
                const [s, d] = v.split(":");
                setSort(s as any);
                setDir(d as any);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name:asc">Nom (A → Z)</SelectItem>
                <SelectItem value="name:desc">Nom (Z → A)</SelectItem>
                <SelectItem value="status:asc">Statut (A → Z)</SelectItem>
                <SelectItem value="status:desc">Statut (Z → A)</SelectItem>
                <SelectItem value="category:asc">Catégorie (A → Z)</SelectItem>
                <SelectItem value="category:desc">Catégorie (Z → A)</SelectItem>
                <SelectItem value="last_event_at:desc">Dernière activité (récent)</SelectItem>
                <SelectItem value="last_event_at:asc">Dernière activité (ancien)</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() =>
                exportAssetsCsv({
                  status: status === "ALL" ? undefined : status,
                  category: category === "ALL" ? undefined : category,
                })
              }
            >
              Export CSV
            </Button>
            <CreateAssetDialog onCreated={reload} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {debouncedSearch.trim() && (
              <FilterChip
                label={`Recherche: ${debouncedSearch.trim()}`}
                onClear={() => {
                  setOffset(0);
                  setSearch("");
                }}
              />
            )}

            {category !== "ALL" && (
              <FilterChip
                label={`Catégorie: ${category}`}
                onClear={() => {
                  setOffset(0);
                  setCategory("ALL");
                }}
              />
            )}

            {status !== "ALL" && (
              <FilterChip
                label={`Statut: ${status}`}
                onClear={() => {
                  setOffset(0);
                  setStatus("ALL");
                }}
              />
            )}
          </div>

          {(debouncedSearch.trim() || category !== "ALL" || status !== "ALL") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOffset(0);
                setSearch("");
                setCategory("ALL");
                setStatus("ALL");
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border p-3 text-sm text-red-600">
          {String(error)}
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Ref / Série</TableHead>

              {category === "VEHICLE" ? (
                <>
                  <TableHead>Plaque</TableHead>
                  <TableHead>KM</TableHead>
                </>
              ) : (
                <TableHead>Détails</TableHead>
              )}

              <TableHead>Attribué à</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedRows.map((a) => (
              <TableRow key={a.id} className="cursor-pointer" onClick={() => openDrawer(a.id)}>
                <TableCell className="font-medium">
                  {a.name}
                  <div className="text-xs text-muted-foreground">public_id: {a.public_id}</div>
                </TableCell>

                <TableCell>
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOffset(0);
                      setCategory(a.category);
                    }}
                    title="Filtrer par cette catégorie"
                  >
                    {a.category}
                  </button>
                </TableCell>

                <TableCell>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOffset(0);
                      setStatus(a.status);
                    }}
                    className="inline-flex"
                    title="Filtrer par ce statut"
                  >
                    <StatusBadge status={a.status} />
                  </button>
                </TableCell>

                <TableCell>
                  <div>{a.ref ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{a.serial_number ?? "—"}</div>
                </TableCell>

                {category === "VEHICLE" ? (
                  <>
                    <TableCell>{a.plate ?? "—"}</TableCell>
                    <TableCell>{a.km_current ?? "—"}</TableCell>
                  </>
                ) : (
                  <TableCell>
                    {a.category === "VEHICLE"
                      ? `${a.plate ?? "—"} • KM ${a.km_current ?? "—"}`
                      : `EPI: ${a.epi_type ?? "—"}`}
                  </TableCell>
                )}

                <TableCell>{assigneeLabel(a)}</TableCell>
              </TableRow>
            ))}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-sm text-muted-foreground py-8">
                  Aucun résultat
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
          <Button variant="outline" disabled={!canPrev || loading} onClick={() => setOffset(Math.max(0, offset - limit))}>
            Précédent
          </Button>
          <Button variant="outline" disabled={!canNext || loading} onClick={() => setOffset(offset + limit)}>
            Suivant
          </Button>
        </div>
      </div>

      <AssetDrawer open={drawerOpen} onOpenChange={setDrawerOpen} assetId={selectedAssetId} />
    </div>
  );
}