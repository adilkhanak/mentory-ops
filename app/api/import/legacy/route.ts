import { NextRequest, NextResponse } from "next/server";
import { CYCLE_ID, normalizeCourse, normalizeEmail, normalizeIin } from "@/lib/domain";
import { database, getActor, makeId } from "@/lib/server";

export async function POST(req: NextRequest) {
  let actorId: string | null = null;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.MIGRATION_TOKEN || token !== process.env.MIGRATION_TOKEN) {
    const actor = await getActor("/import");
    if (actor.role !== "ADMIN") return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    actorId = actor.id;
  }
  const body = await req.json() as Record<string, any>;
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const db = database(); let imported = 0; let skipped = 0; const now = new Date().toISOString();
  for (const row of rows) {
    const name = String(row.fullName ?? "").trim(), iin = normalizeIin(row.iin), email = normalizeEmail(row.email), course = normalizeCourse(row.course);
    if (!name || (!iin && !email) || !course) { skipped++; continue; }
    const person = await db.prepare("SELECT id FROM people WHERE (iin IS NOT NULL AND iin=?) OR (email IS NOT NULL AND lower(email)=lower(?)) LIMIT 1").bind(iin, email).first<{ id: string }>();
    const personId = person?.id ?? makeId("person");
    if (!person) await db.prepare("INSERT INTO people (id,iin,full_name,email,phone,birth_date,identity_number,identity_issued_at,birth_region,birth_city,city,region,education,employment_status,it_experience,regional,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(personId, iin, name, email, row.phone || null, row.birthDate || null, row.identityNumber || null, row.identityIssuedAt || null, row.birthRegion || null, row.birthCity || null, row.city || null, row.region || null, row.education || null, row.employmentStatus || null, row.itExperience || null, row.regional ? 1 : 0, now).run();
    else await db.prepare("UPDATE people SET full_name=?,email=COALESCE(?,email),phone=COALESCE(?,phone),birth_date=COALESCE(?,birth_date),identity_number=COALESCE(?,identity_number),identity_issued_at=COALESCE(?,identity_issued_at),birth_region=COALESCE(?,birth_region),birth_city=COALESCE(?,birth_city),city=COALESCE(?,city),region=COALESCE(?,region),education=COALESCE(?,education),employment_status=COALESCE(?,employment_status),it_experience=COALESCE(?,it_experience),regional=? WHERE id=?").bind(name, email, row.phone || null, row.birthDate || null, row.identityNumber || null, row.identityIssuedAt || null, row.birthRegion || null, row.birthCity || null, row.city || null, row.region || null, row.education || null, row.employmentStatus || null, row.itExperience || null, row.regional ? 1 : 0, personId).run();
    const existing = await db.prepare("SELECT id FROM applications WHERE person_id=? AND cycle_id=? AND course_id=?").bind(personId, CYCLE_ID, course).first<{ id: string }>();
    const applicationId = existing?.id ?? makeId("app");
    if (existing) await db.prepare("UPDATE applications SET application_number=COALESCE(?,application_number),applied_at=COALESCE(?,applied_at),signed_at=COALESCE(?,signed_at),source_application_status=COALESCE(?,source_application_status),sender_status=COALESCE(?,sender_status),learning_goal=COALESCE(?,learning_goal),cv_status=?,cv_url=COALESCE(?,cv_url),motivation_status=?,interview_status=?,final_decision=?,notes=COALESCE(?,notes),updated_at=? WHERE id=?").bind(row.applicationNumber || null,row.appliedAt || null,row.signedAt || null,row.sourceApplicationStatus || null,row.senderStatus || null,row.learningGoal || null,row.cvStatus || "NOT_REVIEWED", row.cvUrl || null, row.motivationStatus || "NOT_SENT", row.interviewStatus || "NOT_SCHEDULED", row.finalDecision || "PENDING", row.notes || null, now, applicationId).run();
    else await db.prepare("INSERT INTO applications (id,application_number,person_id,cycle_id,course_id,applied_at,signed_at,source_application_status,sender_status,learning_goal,status,cv_status,cv_url,motivation_status,interview_status,final_decision,source,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(applicationId,row.applicationNumber || null,personId,CYCLE_ID,course,row.appliedAt || null,row.signedAt || null,row.sourceApplicationStatus || null,row.senderStatus || null,row.learningGoal || null,"IN_REVIEW",row.cvStatus || "NOT_REVIEWED",row.cvUrl || null,row.motivationStatus || "NOT_SENT",row.interviewStatus || "NOT_SCHEDULED",row.finalDecision || "PENDING","LEGACY_SHEET",row.notes || null,now,now).run();
    if (row.scheduledAt || row.interviewStatus === "ATTENDED") {
      await db.prepare("INSERT INTO interviews (id,application_id,scheduled_at,calendly_url,attendance,decision,comment,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(application_id) DO UPDATE SET scheduled_at=COALESCE(excluded.scheduled_at,interviews.scheduled_at),attendance=excluded.attendance,decision=excluded.decision,comment=COALESCE(excluded.comment,interviews.comment),updated_at=excluded.updated_at").bind(makeId("int"), applicationId, row.scheduledAt || null, row.calendlyUrl || null, row.interviewStatus === "ATTENDED" ? "ATTENDED" : "UNKNOWN", row.interviewDecision || "PENDING", row.interviewComment || null, now).run();
    }
    imported++;
  }
  const runId = makeId("import");
  await db.prepare("INSERT INTO import_runs (id,source_name,status,rows_total,rows_imported,rows_skipped,issues_json,actor_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(runId, "Legacy Google Sheet", "COMPLETED", rows.length, imported, skipped, "[]", actorId, now).run();
  return NextResponse.json({ ok: true, imported, skipped });
}
