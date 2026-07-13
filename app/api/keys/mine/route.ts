import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError, withErrorHandling } from "@/lib/errors";
import { getUnkeyClient, getVerificationStats, summarizeKey } from "@/lib/unkey";

export const runtime = "nodejs";

/**
 * List the signed-in user's own API keys (matched by Firebase uid as
 * `externalId`), with best-effort usage stats. Only requires being signed
 * in — there is no way to list or manage other users' keys via this app.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return jsonError("Unauthorized", auth.status, { code: auth.code });
  }

  const apiId = process.env.UNKEY_API_ID;
  if (!apiId) {
    return jsonError("Server misconfiguration: UNKEY_API_ID not set", 500);
  }

  const page = await getUnkeyClient().apis.listKeys({
    apiId,
    externalId: auth.user.uid,
    limit: 50,
  });

  const keys = await Promise.all(
    page.result.data.map(async (key) => ({
      ...summarizeKey(key),
      usage30d: await getVerificationStats(key.keyId),
    })),
  );

  return NextResponse.json({ keys });
});
