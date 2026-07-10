import { NextResponse } from "next/server";
import { ZodError } from "zod";

interface ErrorBody {
  error: string;
  details?: unknown;
}

export function jsonError(
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ErrorBody> {
  const body: ErrorBody = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

/** Turn a Zod validation error into a 400 response with flattened field errors. */
export function validationError(error: ZodError): NextResponse<ErrorBody> {
  return jsonError("Validation failed", 400, error.flatten());
}

/**
 * Wraps a route handler to catch unexpected errors and return a 500
 * instead of leaking internals or crashing the request.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("Unhandled route error:", err);
      return jsonError("Internal server error", 500);
    }
  };
}

/** Safely parse a JSON request body, returning null on malformed input. */
export async function parseJsonBody(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
