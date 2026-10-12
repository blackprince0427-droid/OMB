import { officeTransaction } from "@/lib/office-route";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "公司資料不正確。" }, { status: 400 });
  }
  const input = body && typeof body === "object" ? (body as { company?: unknown; bundle?: unknown; logs?: unknown }) : {};
  const result = await officeTransaction((office) => office.insertCompanyIfAbsent(input.company, input.bundle, input.logs));
  if (result instanceof Response) return result;
  if (!result.ok) return Response.json({ error: "error" in result ? result.error : "公司資料不正確。" }, { status: result.status });
  return Response.json({ companies: result.companies });
}
