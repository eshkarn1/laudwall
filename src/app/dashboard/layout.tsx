import { Header } from "@/components/bits";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Header user={user} />
      <main className="wrap" style={{ padding: "28px 16px 60px" }}>{children}</main>
    </>
  );
}
