import { connection } from "next/server";
import { getOfficeServer, type OfficeServer } from "@/lib/server-office";

export function officeUnavailable(): Response {
  return Response.json({ error: "公司資料暫時無法讀寫。" }, { status: 500 });
}

export async function officeTransaction<T>(fn: (office: OfficeServer) => T): Promise<T | Response> {
  await connection();
  try {
    const office = getOfficeServer();
    return await office.transaction(() => fn(office));
  } catch {
    return officeUnavailable();
  }
}
