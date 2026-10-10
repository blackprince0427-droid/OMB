import { notFound } from "next/navigation";
import { FrameGate } from "@/components/frame-gate";
import { LoginScreen } from "@/components/login-screen";

const screens = new Set(["overview", "calendar", "records", "pending", "account", "users", "departments"]);

export default async function CompanyPathPage({
  params,
}: {
  params: Promise<{ companyPath: string; rest?: string[] }>;
}) {
  const { rest } = await params;
  if (!rest || rest.length === 0) return <LoginScreen />;
  if (rest.length === 1 && screens.has(rest[0] ?? "")) return <FrameGate>{null}</FrameGate>;
  notFound();
}
