import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { officeErrorBody } from "@/lib/office-blob";
import { getOfficeServer, type OfficeServer } from "@/lib/server-office";

export function officeFailureResponse(error: unknown): Response {
  const body = officeErrorBody(error);
  console.error(`[office] ${body.status} ${body.error}`);
  return Response.json({ error: body.error }, { status: body.status });
}

export function officeUnavailable(): Response {
  return officeFailureResponse(new Error("公司資料暫時無法讀寫。"));
}

export async function officeTransaction<T>(fn: (office: OfficeServer) => T): Promise<T | Response> {
  try {
    await connection();
    const office = getOfficeServer();
    return await office.transaction(() => fn(office));
  } catch (error) {
    unstable_rethrow(error);
    return officeFailureResponse(error);
  }
}
