"use client";

import { useEffect, useState } from "react";
import { listAuditLogs, type AuditLogOut, type ListAuditLogsParams } from "@/lib/api/audit";
import { RequireAuth } from "@/components/app/RequireAuth";
import { RequireRole } from "@/components/app/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 25;

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
};

const ENTITY_TYPES = ["", "ASSET", "EMPLOYEE", "USER", "EVENT"];
const ACTIONS = ["", "CREATE", "UPDATE", "DELETE"];

function AuditLogsContent() {
  const [logs, setLogs] = useState<AuditLogOut[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Filters
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [entityIdStr, setEntityIdStr] = useState("");

  const fetch = async (newOffset = 0) => {
    setLoading(true);
    try {
      const params: ListAuditLogsParams = {
        limit: PAGE_SIZE,
        offset: newOffset,
      };
      if (entityType) params.entity_type = entityType;
      if (action) params.action = action;
      const eid = Number(entityIdStr);
      if (entityIdStr && !isNaN(eid)) params.entity_id = eid;

      const res = await listAuditLogs(params);
      setLogs(res.data);
      setTotal(res.meta.total);
      setOffset(newOffset);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, action]);

  const hasMore = offset + PAGE_SIZE < total;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Journal d'audit</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={entityType} onValueChange={(v) => setEntityType(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Entité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes entités</SelectItem>
            {ENTITY_TYPES.filter(Boolean).map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={action} onValueChange={(v) => setAction(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes actions</SelectItem>
            {ACTIONS.filter(Boolean).map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            placeholder="ID entité"
            className="w-28"
            value={entityIdStr}
            onChange={(e) => setEntityIdStr(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetch(0)}
          />
          <Button variant="outline" size="sm" onClick={() => fetch(0)}>
            Filtrer
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="text-sm text-muted-foreground">
        {total} entrée{total !== 1 ? "s" : ""}
        {totalPages > 1 && ` — page ${page}/${totalPages}`}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-muted-foreground">Chargement…</div>
      ) : logs.length === 0 ? (
        <div className="text-muted-foreground">Aucune entrée</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-md border p-3 text-sm">
              <div
                className="flex items-center justify-between gap-2 cursor-pointer"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={ACTION_COLORS[log.action] ?? ""} variant="secondary">
                    {log.action}
                  </Badge>
                  <span className="font-medium">{log.entity_type}</span>
                  <span className="text-muted-foreground">#{log.entity_id}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-xs">
                  {log.user_id && <span>user #{log.user_id}</span>}
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                  <span>{expanded === log.id ? "▲" : "▼"}</span>
                </div>
              </div>

              {expanded === log.id && (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {log.before && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Avant</div>
                      <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48">
                        {JSON.stringify(log.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.after && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Après</div>
                      <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48">
                        {JSON.stringify(log.after, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.request_id && (
                    <div className="text-xs text-muted-foreground md:col-span-2">
                      Request: {log.request_id}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => fetch(offset - PAGE_SIZE)}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => fetch(offset + PAGE_SIZE)}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <RequireRole allow={["ADMIN"]}>
        <AuditLogsContent />
      </RequireRole>
    </RequireAuth>
  );
}
