"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";

export type ApiKey = {
  keyId: string;
  start: string;
  name: string | null;
  enabled: boolean;
  createdAt: number;
  lastUsedAt: number | null;
  expires: number | null;
  usage30d: { total: number; valid: number } | null;
};

export type ApiKeysState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; keys: ApiKey[] };

async function authedFetch(user: User, path: string, init?: RequestInit) {
  const idToken = await user.getIdToken();
  return fetch(path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${idToken}` },
  });
}

/**
 * Fetches and caches the signed-in user's API keys, and exposes
 * create/revoke mutations that refetch the list on success. Each call site
 * gets its own copy of this state (no global cache) since the app only has
 * a couple of pages that need it.
 */
export function useApiKeys(user: User | null) {
  const [state, setState] = useState<ApiKeysState>({ status: "loading" });

  const refetch = useCallback(async () => {
    if (!user) return;
    setState({ status: "loading" });
    try {
      const res = await authedFetch(user, "/api/keys/mine");
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? `Request failed (${res.status})` });
        return;
      }
      setState({ status: "ready", keys: data.keys });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createKey = useCallback(
    async (name?: string) => {
      if (!user) throw new Error("Not signed in");
      const res = await authedFetch(user, "/api/auth/create-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(name ? { name } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create API key.");
      await refetch();
      return data.key as string;
    },
    [user, refetch],
  );

  const revokeKey = useCallback(
    async (keyId: string) => {
      if (!user) throw new Error("Not signed in");
      const res = await authedFetch(user, `/api/keys/${keyId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(data.error ?? "Failed to revoke API key.");
      }
      await refetch();
    },
    [user, refetch],
  );

  return { state, refetch, createKey, revokeKey };
}
