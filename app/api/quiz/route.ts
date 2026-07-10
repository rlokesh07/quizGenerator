import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb, QUIZZES_COLLECTION } from "@/lib/firebase";
import { createQuizSchema } from "@/lib/schemas";
import { findMissingQuestionIds } from "@/lib/questions";
import {
  jsonError,
  parseJsonBody,
  validationError,
  withErrorHandling,
} from "@/lib/errors";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (req: Request) => {
  const body = await parseJsonBody(req);
  if (body === null) {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createQuizSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { title, questionIds } = parsed.data;

  // Quizzes are immutable, so validate all referenced questions exist up front.
  const missing = await findMissingQuestionIds(questionIds);
  if (missing.length > 0) {
    return jsonError("Some questionIds do not exist", 400, { missing });
  }

  const docRef = await getDb().collection(QUIZZES_COLLECTION).add({
    title,
    questions: questionIds,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: docRef.id }, { status: 201 });
});
