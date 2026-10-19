"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="panel mx-auto max-w-md space-y-3 p-8 text-center">
      <h1 className="text-xl font-extrabold">This page failed to load</h1>
      <p className="text-sm text-muted">
        A service we depend on may be down. Try again in a moment.{error.digest && ` Error ID: ${error.digest}`}
      </p>
      <button className="btn-tao" onClick={reset}>Try again</button>
    </div>
  );
}
