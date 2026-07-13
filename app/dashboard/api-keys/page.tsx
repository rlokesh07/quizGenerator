"use client";

import { PageContainer } from "@/components/layout/page-container";
import { ApiKeysTable } from "@/features/api-keys/components/api-keys-table";
import { useAuth } from "@/lib/auth-context";

export default function ApiKeysPage() {
  const auth = useAuth();
  if (auth.status !== "signed-in") return null;

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Manage the keys used to authenticate requests to the Quiz Generator API.
        </p>
      </div>
      <ApiKeysTable user={auth.user} />
    </PageContainer>
  );
}
