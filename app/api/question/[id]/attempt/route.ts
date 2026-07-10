import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb, QUESTIONS_COLLECTION } from "@/lib/firebase";
import { attemptSchema } from "@/lib/schemas";
import {
  jsonError,
  parseJsonBody,
  validationError,
  withErrorHandling,
} from "@/lib/errors";

export const runtime = "nodejs";

export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;

    const body = await parseJsonBody(req);
    if (body === null) {
      return jsonError("Invalid JSON body", 400);
    }

    const parsed = attemptSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const db = getDb();
    const ref = db.collection(QUESTIONS_COLLECTION).doc(id);

    // Increment atomically inside a transaction so we can 404 on a missing
    // question and return the updated counts in one round trip.
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;

      const data = snap.data()!;
      const isCorrect =
        parsed.data.answer.trim().toLowerCase() ===
        (data.correctAnswer ?? "").trim().toLowerCase();

      tx.update(ref, {
        attempted: FieldValue.increment(1),
        correct: FieldValue.increment(isCorrect ? 1 : 0),
      });

      return {
        correct: isCorrect,
        correctAnswer: data.correctAnswer ?? "",
        attempted: (data.attempted ?? 0) + 1,
        totalCorrect: (data.correct ?? 0) + (isCorrect ? 1 : 0),
      };
    });

    if (result === null) {
      return jsonError(`Question '${id}' not found`, 404);
    }

    return NextResponse.json(result, { status: 200 });
  },
);
