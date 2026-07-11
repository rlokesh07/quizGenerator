import { Unkey } from "@unkey/api";

let _client: Unkey | null = null;

function getClient(): Unkey {
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
    const { data } = await getClient().keys.verifyKey({ key });
    if (!data.valid) return { valid: false, code: data.code };
    // identity.externalId is the ownerId set when the key was created.
    // Fall back to keyId so there is always a non-empty discriminator.
    const ownerId = data.identity?.externalId ?? data.keyId ?? key;
    return { valid: true, ownerId };
  } catch {
    return { valid: false, code: "INTERNAL_ERROR" };
  }
}
