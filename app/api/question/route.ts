import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb, QUESTIONS_COLLECTION } from "@/lib/firebase";
import { createQuestionSchema } from "@/lib/schemas";
import { embedText } from "@/lib/embeddings";
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

  const parsed = createQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { question, type, topic, options, correctAnswer, explanation } = parsed.data;

  const embedding = await embedText(question);

  const docRef = await getDb().collection(QUESTIONS_COLLECTION).add({
    question,
    type,
    topic,
    options: (options ?? null),
    correctAnswer,
    attempted: 0,
    correct: 0,
    explanation,
    ownerId: auth.ownerId,
    embedding: FieldValue.vector(embedding),
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ id: docRef.id }, { status: 201 });
});
