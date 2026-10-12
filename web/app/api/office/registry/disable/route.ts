import { getOfficeServer } from "@/lib/server-office";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "公司資料不正確。" }, { status: 400 });
  }
  const name = body && typeof body === "object" ? (body as { name?: unknown }).name : "";
  const result = await getOfficeServer().transaction(() => getOfficeServer().disableNamedCompany(name));
  if (!result.ok) return Response.json({ error: "error" in result ? result.error : "公司資料不正確。" }, { status: result.status });
  return Response.json({
    companies: result.companies,
    companyId: result.companyId,
    revision: result.revision,
    logs: result.logs,
  });
}
