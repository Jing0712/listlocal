import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel mx-auto max-w-md space-y-3 p-8 text-center">
      <p className="text-5xl font-extrabold text-tao">404</p>
      <h1 className="text-xl font-extrabold">This page does not exist</h1>
      <Link href="/" className="btn-tao">Go to the home page</Link>
    </div>
  );
}
