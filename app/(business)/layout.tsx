import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BusinessShell } from "@/components/business/business-shell";

export default async function BusinessGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  return (
    <BusinessShell
      user={{
        name: session.user.name ?? "",
        email: session.user.email ?? "",
      }}
    >
      {children}
    </BusinessShell>
  );
}
