"use client";

import { Activity, KeyRound, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useAuth } from "@/lib/auth-context";

export default function OverviewPage() {
  const auth = useAuth();
  const { state } = useApiKeys(auth.status === "signed-in" ? auth.user : null);
  if (auth.status !== "signed-in") return null;

  const keys = state.status === "ready" ? state.keys : [];
  const totalKeys = keys.length;
  const activeKeys = keys.filter((key) => key.enabled).length;
  const verifications30d = keys.reduce((sum, key) => sum + (key.usage30d?.total ?? 0), 0);

  const stats = [
    { title: "Total API keys", value: totalKeys, icon: KeyRound, description: "Across your account" },
    {
      title: "Active keys",
      value: activeKeys,
      icon: ShieldCheck,
      description: `${totalKeys - activeKeys} disabled`,
    },
    { title: "Verifications (30d)", value: verifications30d, icon: Activity, description: "Across all your keys" },
  ];

  const recentKeys = keys.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">Signed in as {auth.user.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              {state.status === "loading" ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent keys</CardTitle>
          <CardDescription>Your most recently created API keys.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {state.status === "loading" && <Skeleton className="h-20 w-full" />}

          {state.status === "error" && <p className="text-sm text-destructive">{state.message}</p>}

          {state.status === "ready" && recentKeys.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No API keys yet — create one from the API Keys page.
            </p>
          )}

          {state.status === "ready" &&
            recentKeys.map((key) => (
              <div key={key.keyId} className="flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{key.name ?? "(unnamed)"}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{key.start}…</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(key.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
