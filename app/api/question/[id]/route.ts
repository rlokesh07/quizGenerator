import { NextResponse } from "next/server";
import { getQuestion } from "@/lib/questions";
import { jsonError, withErrorHandling } from "@/lib/errors";
import { verifyApiKey } from "@/lib/unkey";

export const runtime = "nodejs";

export const GET = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const auth = await verifyApiKey(req);
    if (!auth.valid) {
      return jsonError("Unauthorized", 401, { code: auth.code });
    }

    const { id } = await ctx.params;

    const question = await getQuestion(id);
    if (!question) {
      return jsonError(`Question '${id}' not found`, 404);
    }

    if (question.ownerId !== auth.ownerId) {
      return jsonError("Forbidden", 403);
    }

    // Omit id and ownerId from the response body.
    const { id: _omitId, ownerId: _omitOwner, ...rest } = question;
    return NextResponse.json(rest, { status: 200 });
  },
);
