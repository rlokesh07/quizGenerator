"use client";

import { useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { KeyRound, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type ApiKey, useApiKeys } from "@/hooks/use-api-keys";
import { CreateKeySheet } from "./create-key-sheet";
import { KeyRowActions } from "./key-row-actions";

export function ApiKeysTable({ user }: { user: User }) {
  const { state, createKey, revokeKey } = useApiKeys(user);
  const [search, setSearch] = useState("");

  const keys = state.status === "ready" ? state.keys : [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return keys;
    return keys.filter(
      (key) => key.name?.toLowerCase().includes(query) || key.start.toLowerCase().includes(query),
    );
  }, [keys, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search keys…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <CreateKeySheet onCreate={createKey} />
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Usage (30d)</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.status === "loading" &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {state.status === "error" && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-destructive">
                  {state.message}
                </TableCell>
              </TableRow>
            )}

            {state.status === "ready" && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <KeyRound className="size-6" />
                    {keys.length === 0 ? "No API keys yet." : "No keys match your search."}
                  </div>
                </TableCell>
              </TableRow>
            )}

            {state.status === "ready" &&
              filtered.map((key) => <KeyRow key={key.keyId} apiKey={key} onRevoke={revokeKey} />)}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function KeyRow({ apiKey, onRevoke }: { apiKey: ApiKey; onRevoke: (keyId: string) => Promise<void> }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{apiKey.name ?? "(unnamed)"}</TableCell>
      <TableCell>
        <Badge variant={apiKey.enabled ? "secondary" : "destructive"}>
          {apiKey.enabled ? "Enabled" : "Disabled"}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{apiKey.start}…</TableCell>
      <TableCell className="text-muted-foreground">{new Date(apiKey.createdAt).toLocaleDateString()}</TableCell>
      <TableCell className="text-muted-foreground">
        {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleDateString() : "Never"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {apiKey.usage30d ? `${apiKey.usage30d.total} (${apiKey.usage30d.valid} valid)` : "—"}
      </TableCell>
      <TableCell>
        <KeyRowActions apiKey={apiKey} onRevoke={onRevoke} />
      </TableCell>
    </TableRow>
  );
}
