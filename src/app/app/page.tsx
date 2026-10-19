import { currentUser } from "@/lib/auth/session";
import { quotaOf } from "@/lib/quota";
import { GenerateForm } from "@/components/GenerateForm";

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ verified?: string }> }) {
  const { verified } = await searchParams;
  const user = (await currentUser())!;
  const q = quotaOf(user);
  return (
    <div className="space-y-6">
      {verified && <p className="rounded-lg bg-green-50 p-3 text-sm text-ok">邮箱验证成功，可以开始使用了。</p>}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">生成美国站 listing</h1>
          <p className="text-sm text-muted">用中文填写就行，越具体越好。AI 只会使用你提供的信息，不会编造参数。</p>
        </div>
        <p className="text-sm text-muted">
          {q.limit === null ? "Pro：无限生成" : `免费额度：剩余 ${q.remaining} / ${q.limit}`}
        </p>
      </div>
      <GenerateForm outOfQuota={q.remaining === 0} />
    </div>
  );
}
