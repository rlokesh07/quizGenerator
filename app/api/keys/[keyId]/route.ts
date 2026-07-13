import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError, withErrorHandling } from "@/lib/errors";
import { getUnkeyClient } from "@/lib/unkey";

export const runtime = "nodejs";

/**
 * Revoke (soft-delete) one of the signed-in user's own API keys. Ownership
 * is verified by matching the key's `externalId` against the caller's
 * Firebase uid before deleting, and a missing/foreign key both return 404
 * so we never leak whether a given keyId belongs to someone else.
 */
export const DELETE = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ keyId: string }> }) => {
    const auth = await requireUser(req);
    if (!auth.ok) {
      return jsonError("Unauthorized", auth.status, { code: auth.code });
    }

    const { keyId } = await ctx.params;
    const client = getUnkeyClient();

    let ownerId: string | null;
    try {
      const { data } = await client.keys.getKey({ keyId });
      ownerId = data.identity?.externalId ?? null;
    } catch {
      return jsonError("API key not found", 404);
    }

    if (ownerId !== auth.user.uid) {
      return jsonError("API key not found", 404);
    }

    try {
      await client.keys.deleteKey({ keyId });
    } catch (err) {
      console.error("Unkey deleteKey error:", err);
      return jsonError("Failed to revoke API key", 500);
    }

    return NextResponse.json({ ok: true });
  },
);
