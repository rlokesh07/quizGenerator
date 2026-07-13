import { Unkey } from "@unkey/api";
import type { KeyResponseData } from "@unkey/api/models/components";

let _client: Unkey | null = null;

export function getUnkeyClient(): Unkey {
  if (!_client) {
    _client = new Unkey({
      rootKey: process.env.UNKEY_ROOT_KEY ?? "",
      serverURL: process.env.UNKEY_SERVER_URL ?? "http://localhost:8080",
    });
  }
  return _client;
}

export type AuthResult =
  | { valid: true; ownerId: string }
  | { valid: false; code: string };

export async function verifyApiKey(req: Request): Promise<AuthResult> {
  const key = req.headers.get("x-api-key");
  if (!key) return { valid: false, code: "MISSING_KEY" };

  try {
    const { data } = await getUnkeyClient().keys.verifyKey({ key });
    if (!data.valid) return { valid: false, code: data.code };
    // identity.externalId is the ownerId set when the key was created.
    // Fall back to keyId so there is always a non-empty discriminator.
    const ownerId = data.identity?.externalId ?? data.keyId ?? key;
    return { valid: true, ownerId };
  } catch {
    return { valid: false, code: "INTERNAL_ERROR" };
  }
}

export type KeySummary = {
  keyId: string;
  start: string;
  name: string | null;
  enabled: boolean;
  externalId: string | null;
  createdAt: number;
  lastUsedAt: number | null;
  expires: number | null;
};

export function summarizeKey(key: KeyResponseData): KeySummary {
  return {
    keyId: key.keyId,
    start: key.start,
    name: key.name ?? null,
    enabled: key.enabled,
    externalId: key.identity?.externalId ?? null,
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt ?? null,
    expires: key.expires ?? null,
  };
}

export type VerificationStats = { total: number; valid: number };

/**
 * Best-effort verification counts for a key over the last 30 days.
 *
 * This queries Unkey's ClickHouse-backed analytics endpoint, which isn't
 * part of the minimal self-hosted stack in this repo (mysql + redis + the
 * `unkey run api` image, no ClickHouse). Returns null instead of throwing
 * when analytics aren't available, so callers can show "usage data
 * unavailable" rather than failing the whole request.
 */
export async function getVerificationStats(keyId: string): Promise<VerificationStats | null> {
  const escapedKeyId = keyId.replace(/'/g, "\\'");
  try {
    const result = await getUnkeyClient().analytics.getVerifications({
      query: `SELECT COUNT(*) as total, SUM(if(outcome = 'VALID', 1, 0)) as valid FROM key_verifications_v1 WHERE key_id = '${escapedKeyId}' AND time >= now() - INTERVAL 30 DAY`,
    });
    const row = result.data[0] as { total?: unknown; valid?: unknown } | undefined;
    return { total: Number(row?.total ?? 0), valid: Number(row?.valid ?? 0) };
  } catch {
    return null;
  }
}
