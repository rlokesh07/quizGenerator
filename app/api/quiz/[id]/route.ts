import { NextResponse } from "next/server";
import { getDb, QUIZZES_COLLECTION } from "@/lib/firebase";
import { getQuestionsByIds } from "@/lib/questions";
import { jsonError, withErrorHandling } from "@/lib/errors";

export const runtime = "nodejs";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;

    const snap = await getDb().collection(QUIZZES_COLLECTION).doc(id).get();
    if (!snap.exists) {
      return jsonError(`Quiz '${id}' not found`, 404);
    }

    const data = snap.data()!;
    const questionIds: string[] = data.questions ?? [];
    const questions = await getQuestionsByIds(questionIds);

    return NextResponse.json(
      { id: snap.id, title: data.title, questions },
      { status: 200 },
    );
  },
);
