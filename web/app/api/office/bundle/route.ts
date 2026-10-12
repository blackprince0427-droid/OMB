import { getOfficeServer } from "@/lib/server-office";

export async function GET(request: Request) {
  const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
  const bundle = await getOfficeServer().transaction(() => getOfficeServer().readBundle(companyId));
  if (!bundle) return Response.json({ error: "找不到此公司。" }, { status: 404 });
  return Response.json(bundle);
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "公司資料不正確。" }, { status: 400 });
  }
  const result = await getOfficeServer().transaction(() => getOfficeServer().writeBundle(body && typeof body === "object" ? body : {}));
  if (!result.ok && result.conflict) {
    return Response.json(
      { conflict: true, revision: result.revision, bundle: result.bundle, logs: result.logs },
      { status: 409 },
    );
  }
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ revision: result.revision, bundle: result.bundle, logs: result.logs });
}
