import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb, QUIZZES_COLLECTION } from "@/lib/firebase";
import { createQuizSchema } from "@/lib/schemas";
import { checkQuestionOwnership } from "@/lib/questions";
import {
  jsonError,
  parseJsonBody,
  validationError,
  withErrorHandling,
} from "@/lib/errors";
import { verifyApiKey } from "@/lib/unkey";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (req: Request) => {
  const auth = await verifyApiKey(req);
  if (!auth.valid) {
    return jsonError("Unauthorized", 401, { code: auth.code });
  }

  const body = await parseJsonBody(req);
  if (body === null) {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createQuizSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { title, questionIds } = parsed.data;

  // Quizzes are immutable, so validate all referenced questions exist and
  // belong to the caller before creating.
  const { missing, forbidden } = await checkQuestionOwnership(questionIds, auth.ownerId);
  if (missing.length > 0) {
    return jsonError("Some questionIds do not exist", 400, { missing });
  }
  if (forbidden.length > 0) {
    return jsonError("Some questionIds belong to a different owner", 403, { forbidden });
  }

  const docRef = await getDb().collection(QUIZZES_COLLECTION).add({
    title,
    questions: questionIds,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: docRef.id }, { status: 201 });
});
