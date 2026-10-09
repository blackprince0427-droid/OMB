import { notFound } from "next/navigation";
import { FrameGate } from "@/components/frame-gate";
import { LoginScreen } from "@/components/login-screen";

const screens = new Set(["overview", "calendar", "records", "pending", "account", "users", "departments"]);

export default async function CompanySitePage({
  params,
}: {
  params: Promise<{ companyId: string; path?: string[] }>;
}) {
  const { path } = await params;
  if (!path || path.length === 0) return <LoginScreen />;
  if (path.length === 1 && screens.has(path[0] ?? "")) return <FrameGate>{null}</FrameGate>;
  notFound();
}
