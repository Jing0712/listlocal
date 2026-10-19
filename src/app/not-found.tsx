import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md space-y-3 text-center">
      <h1 className="text-xl font-semibold">页面不存在</h1>
      <Link href="/" className="btn">回到首页</Link>
    </div>
  );
}
