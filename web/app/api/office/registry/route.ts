import { getOfficeServer } from "@/lib/server-office";

export async function GET() {
  const companies = await getOfficeServer().transaction(() => getOfficeServer().registry());
  return Response.json({ companies });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "公司資料不正確。" }, { status: 400 });
  }
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const result = await getOfficeServer().transaction(() => getOfficeServer().createCompany(input));
  if (!result.ok) return Response.json({ error: "error" in result ? result.error : "公司資料不正確。" }, { status: result.status });
  return Response.json({
    companies: result.companies,
    company: result.company,
    revision: result.revision,
    bundle: result.bundle,
    logs: result.logs,
  });
}
