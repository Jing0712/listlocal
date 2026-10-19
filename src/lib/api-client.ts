/** Browser-side fetch helper: always returns parsed JSON or throws an Error with the server's message. */
export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? (init?.body ? "POST" : "GET"),
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "网络连接失败，请检查网络后重试");
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof data.error === "string" ? data.error : `请求失败（${res.status}）`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly data: Record<string, unknown> = {}) {
    super(message);
  }
}
