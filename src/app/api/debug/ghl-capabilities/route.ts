import { runGhlCapabilityAudit } from "@/lib/ghl/audit";

export const runtime = "nodejs";

export async function POST() {
  const result = await runGhlCapabilityAudit();

  return Response.json(result, {
    status: result.ok ? 200 : 503,
  });
}
