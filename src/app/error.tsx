"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md space-y-3 text-center">
      <h1 className="text-xl font-semibold">出错了</h1>
      <p className="text-sm text-muted">页面加载失败，可能是服务暂时不可用。{error.digest && `错误编号：${error.digest}`}</p>
      <button className="btn" onClick={reset}>重试</button>
    </div>
  );
}
