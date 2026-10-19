import { currentUser } from "@/lib/auth/session";
import { quotaOf } from "@/lib/quota";
import { GenerateForm } from "@/components/GenerateForm";

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ verified?: string; name?: string }> }) {
  const { verified, name } = await searchParams;
  const user = (await currentUser())!;
  const q = quotaOf(user);
  return (
    <div className="space-y-4">
      {verified && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-ok">Email verified. You are ready to create listings.</p>}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">Create a listing</h1>
          <p className="text-sm text-muted">Describe the product in Chinese or English. The AI only uses what you give it and never makes up specs.</p>
        </div>
      </div>
      <GenerateForm
        initialName={(name ?? "").slice(0, 200)}
        quota={{ plan: q.plan, used: q.used, limit: q.limit, remaining: q.remaining }}
      />
    </div>
  );
}
