import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getApps, getApp, initializeApp, cert } from "firebase-admin/app";
import { Unkey } from "@unkey/api";
import { withErrorHandling, jsonError } from "@/lib/errors";

export const runtime = "nodejs";

function getAdminApp() {
  if (getApps().length) return getApp();
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

function getUnkey() {
  return new Unkey({
    rootKey: process.env.UNKEY_ROOT_KEY ?? "",
    serverURL: process.env.UNKEY_SERVER_URL ?? "http://localhost:8080",
  });
}

export const POST = withErrorHandling(async (req: Request) => {
  const { idToken } = await req.json().catch(() => ({}));

  if (!idToken || typeof idToken !== "string") {
    return jsonError("Missing idToken", 400);
  }

  let email: string;
  let uid: string;
  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(idToken);
    if (!decoded.email) {
      return jsonError("Google account has no email", 400);
    }
    email = decoded.email;
    uid = decoded.uid;
  } catch {
    return jsonError("Invalid or expired ID token", 401);
  }

  const apiId = process.env.UNKEY_API_ID;
  if (!apiId) {
    return jsonError("Server misconfiguration: UNKEY_API_ID not set", 500);
  }

  let key: string;
  try {
    const unkey = getUnkey();
    const result = await unkey.keys.createKey({
      apiId,
      name: email,
      externalId: uid,
      prefix: "quiz",
    });
    key = result.data.key;
  } catch (err) {
    console.error("Unkey createKey error:", err);
    return jsonError("Failed to create API key", 500);
  }

  return NextResponse.json({ key, email }, { status: 201 });
});
