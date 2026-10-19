import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.emailVerified) redirect("/verify-email");
  return <>{children}</>;
}
