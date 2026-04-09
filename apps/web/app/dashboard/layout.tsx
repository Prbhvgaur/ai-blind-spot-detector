import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <Sidebar />
      <div>{children}</div>
    </div>
  );
}

