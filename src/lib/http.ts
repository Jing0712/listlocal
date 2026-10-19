import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly extra: Record<string, unknown> = {}) {
    super(message);
  }
}

/**
 * Wrap a route handler: known errors become JSON with the right status,
 * unknown errors become a logged 500 with a request id the user can quote.
 */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    const requestId = crypto.randomUUID().slice(0, 8);
    try {
      return await handler(...args);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message, requestId, ...e.extra }, { status: e.status });
      }
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return NextResponse.json(
          { error: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", requestId },
          { status: 400 },
        );
      }
      console.error(JSON.stringify({ level: "error", requestId, msg: e instanceof Error ? e.message : String(e) }));
      return NextResponse.json({ error: "Something went wrong on our side. Please try again.", requestId }, { status: 500 });
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON");
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
