import { NextResponse } from "next/server";
import { getDb, QUESTIONS_COLLECTION } from "@/lib/firebase";
import { embedText } from "@/lib/embeddings";
import { jsonError, withErrorHandling } from "@/lib/errors";

export const runtime = "nodejs";

const MAX_RESULTS = 50;

export const GET = withErrorHandling(
  async (
    _req: Request,
    ctx: { params: Promise<{ search: string; numResults: string }> },
  ) => {
    const { search, numResults } = await ctx.params;

    const query = decodeURIComponent(search).trim();
    if (!query) {
      return jsonError("search query must not be empty", 400);
    }

    const parsedNum = Number.parseInt(numResults, 10);
    if (!Number.isInteger(parsedNum) || parsedNum < 1) {
      return jsonError("numResults must be a positive integer", 400);
    }
    const limit = Math.min(parsedNum, MAX_RESULTS);

    const queryVector = await embedText(query);

    const snapshot = await getDb()
      .collection(QUESTIONS_COLLECTION)
      .findNearest({
        vectorField: "embedding",
        queryVector,
        limit,
        distanceMeasure: "COSINE",
      })
      .get();

    const ids = snapshot.docs.map((doc) => doc.id);
    return NextResponse.json({ ids }, { status: 200 });
  },
);
