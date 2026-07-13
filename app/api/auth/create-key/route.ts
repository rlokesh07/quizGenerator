import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError, parseJsonBody, withErrorHandling } from "@/lib/errors";
import { getUnkeyClient } from "@/lib/unkey";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (req: Request) => {
  const auth = await requireUser(req);
  if (!auth.ok) {
    return jsonError("Unauthorized", auth.status, { code: auth.code });
  }
  if (!auth.user.email) {
    return jsonError("Google account has no email", 400);
  }

  const apiId = process.env.UNKEY_API_ID;
  if (!apiId) {
    return jsonError("Server misconfiguration: UNKEY_API_ID not set", 500);
  }

  const body = await parseJsonBody(req);
  const requestedName = (body as { name?: unknown })?.name;
  const name = typeof requestedName === "string" && requestedName.trim()
    ? requestedName.trim()
    : auth.user.email;

  let key: string;
  try {
    const result = await getUnkeyClient().keys.createKey({
      apiId,
      name,
      externalId: auth.user.uid,
      prefix: "quiz",
    });
    key = result.data.key;
  } catch (err) {
    console.error("Unkey createKey error:", err);
    return jsonError("Failed to create API key", 500);
  }

  return NextResponse.json({ key, email: auth.user.email }, { status: 201 });
});
