import { NextResponse } from "next/server";
import { getQuestion } from "@/lib/questions";
import { jsonError, withErrorHandling } from "@/lib/errors";

export const runtime = "nodejs";

export const GET = withErrorHandling(
  async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;

    const question = await getQuestion(id);
    if (!question) {
      return jsonError(`Question '${id}' not found`, 404);
    }

    // Omit id from the body to match the specified response shape.
    const { id: _omit, ...rest } = question;
    return NextResponse.json(rest, { status: 200 });
  },
);
