import { NextRequest, NextResponse } from "next/server";
import { CYCLE_ID } from "@/lib/domain";
import { audit, database, getActor } from "@/lib/server";

export async function PATCH(req: NextRequest) {
  const actor = await getActor("/settings");
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Только администратор может менять настройки" }, { status: 403 });
  const body = await req.json() as Record<string, any>;
  const db = database();
  const regional = Math.max(0, Math.min(100, Number(body.regionalMinimum ?? 30)));
  const deadline = String(body.motivationDeadline ?? "2026-09-17");
  await db.prepare("UPDATE program_cycles SET regional_minimum=?,motivation_deadline=?,calendly_url=? WHERE id=?").bind(regional, deadline, body.calendlyUrl || null, CYCLE_ID).run();
  for (const [courseId, quota] of Object.entries(body.quotas ?? {})) {
    await db.prepare("UPDATE courses SET quota=? WHERE id=? AND cycle_id=?").bind(Math.max(0, Number(quota)), courseId, CYCLE_ID).run();
  }
  await audit(actor.id, "UPDATE_SETTINGS", "program_cycle", CYCLE_ID, body);
  return NextResponse.json({ ok: true });
}
