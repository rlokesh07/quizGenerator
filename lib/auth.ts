import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase";

export type FirebaseUser = { uid: string; email: string | null };

export type UserAuthResult =
  | { ok: true; user: FirebaseUser }
  | { ok: false; status: 401; code: "MISSING_TOKEN" | "INVALID_TOKEN" };

/**
 * Verifies the Firebase ID token in the `Authorization: Bearer <token>`
 * header. Any signed-in Firebase user passes this check.
 */
export async function requireUser(req: Request): Promise<UserAuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!idToken) {
    return { ok: false, status: 401, code: "MISSING_TOKEN" };
  }

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
    return { ok: true, user: { uid: decoded.uid, email: decoded.email ?? null } };
  } catch {
    return { ok: false, status: 401, code: "INVALID_TOKEN" };
  }
}
