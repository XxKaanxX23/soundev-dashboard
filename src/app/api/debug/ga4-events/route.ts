import { auditGa4Events } from "@/lib/ga4/reports";

export const runtime = "nodejs";

export async function POST() {
  const result = await auditGa4Events();

  return Response.json(result, {
    status: result.ok ? 200 : 503,
  });
}
