import { redirect } from "next/navigation";
import { CYCLE_ID } from "@/lib/domain";
import { database as postgresDatabase } from "@/lib/database";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, simpleAuthEnabled, verifySessionToken } from "@/lib/simple-auth";

export type Actor = { id: string; email: string; name: string; role: "ADMIN" | "MANAGER" | "TEACHER" | "VIEWER" };

function db() { return postgresDatabase(); }

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export async function ensureBootstrap() {
  const database = db();
  const exists = await database.prepare("SELECT id FROM program_cycles WHERE id = ?").bind(CYCLE_ID).first();
  if (!exists) {
    await database.batch([
      database.prepare("INSERT INTO program_cycles (id,name,regional_minimum,motivation_deadline,calendly_url,active,created_at) VALUES (?,?,?,?,?,1,?)").bind(CYCLE_ID, "Tech Orda 2026", 30, "2026-09-17", null, now()),
      database.prepare("INSERT INTO courses (id,cycle_id,name,quota,sort_order) VALUES (?,?,?,?,?)").bind("junior-frontend", CYCLE_ID, "Junior Frontend Developer", 21, 1),
      database.prepare("INSERT INTO courses (id,cycle_id,name,quota,sort_order) VALUES (?,?,?,?,?)").bind("middle-frontend", CYCLE_ID, "Middle Frontend Engineer", 23, 2),
    ]);
  }
}

export async function getActor(path = "/"): Promise<Actor> {
  await ensureBootstrap();
  const database = db();

  if (simpleAuthEnabled()) {
    const authenticated = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
    if (!authenticated) redirect(`/login?next=${encodeURIComponent(path.startsWith("/") ? path : "/")}`);
    const admin = await database.prepare("SELECT id,email,name,role FROM users WHERE role='ADMIN' ORDER BY created_at LIMIT 1").first<Actor>();
    if (!admin) throw new Error("Simple auth requires at least one ADMIN user");
    return admin;
  }

  if (process.env.OPEN_ACCESS === "true") {
    const admin = await database
      .prepare("SELECT id,email,name,role FROM users WHERE role='ADMIN' ORDER BY created_at LIMIT 1")
      .first<Actor>();
    if (!admin) throw new Error("OPEN_ACCESS requires at least one ADMIN user");
    return admin;
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect(`/login?next=${encodeURIComponent(path.startsWith("/") ? path : "/")}`);
  const userId = user.id;
  const email = user.email.toLowerCase();
  const displayName = String(user.user_metadata?.full_name ?? user.email);
  let row = await database.prepare("SELECT id,email,name,role FROM users WHERE id = ?").bind(userId).first<Actor>();
  if (!row) {
    const invited = await database.prepare("SELECT id,role FROM users WHERE lower(email)=lower(?)").bind(email).first<{ id: string; role: Actor["role"] }>();
    if (invited) {
      await database.prepare("UPDATE users SET id=?, name=? WHERE id=?").bind(userId, displayName, invited.id).run();
      row = { id: userId, email, name: displayName, role: invited.role };
    } else {
      await supabase.auth.signOut();
      redirect("/login?error=access");
    }
  }
  return row;
}

export async function dashboard() {
  await ensureBootstrap();
  const database = db();
  const [cycle, courses, totals, regions, queues, recent] = await Promise.all([
    database.prepare("SELECT * FROM program_cycles WHERE id=?").bind(CYCLE_ID).first<Record<string, unknown>>(),
    database.prepare("SELECT c.*, COUNT(CASE WHEN a.final_decision='ACCEPTED' THEN 1 END) AS accepted, COUNT(a.id) AS applications FROM courses c LEFT JOIN applications a ON a.course_id=c.id WHERE c.cycle_id=? GROUP BY c.id ORDER BY c.sort_order").bind(CYCLE_ID).all(),
    database.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN cv_status='NOT_REVIEWED' THEN 1 ELSE 0 END) AS cv_pending, SUM(CASE WHEN motivation_status='RECEIVED' THEN 1 ELSE 0 END) AS motivation_received, SUM(CASE WHEN interview_status='SCHEDULED' THEN 1 ELSE 0 END) AS interviews FROM applications WHERE cycle_id=?").bind(CYCLE_ID).first(),
    database.prepare("SELECT COUNT(*) AS accepted, SUM(CASE WHEN p.regional=1 THEN 1 ELSE 0 END) AS regional FROM applications a JOIN people p ON p.id=a.person_id WHERE a.cycle_id=? AND a.final_decision='ACCEPTED'").bind(CYCLE_ID).first(),
    database.prepare("SELECT SUM(CASE WHEN cv_status='NOT_REVIEWED' THEN 1 ELSE 0 END) AS cv, SUM(CASE WHEN cv_status='APPROVED' AND motivation_status!='RECEIVED' THEN 1 ELSE 0 END) AS motivation, SUM(CASE WHEN motivation_status='RECEIVED' AND interview_status='NOT_SCHEDULED' THEN 1 ELSE 0 END) AS interview, SUM(CASE WHEN interview_status IN ('COMPLETED','ATTENDED') AND final_decision='PENDING' THEN 1 ELSE 0 END) AS decisions FROM applications WHERE cycle_id=?").bind(CYCLE_ID).first(),
    database.prepare("SELECT a.id,p.full_name,c.name AS course,a.status,a.updated_at FROM applications a JOIN people p ON p.id=a.person_id JOIN courses c ON c.id=a.course_id WHERE a.cycle_id=? ORDER BY a.updated_at DESC LIMIT 6").bind(CYCLE_ID).all(),
  ]);
  return { cycle, courses: courses.results, totals, regions, queues, recent: recent.results as Array<Record<string, string>> };
}

export async function listApplications(search = "", course = "", status = "", cv = "", motivation = "", interview = "", decision = "") {
  await ensureBootstrap();
  const terms: string[] = ["a.cycle_id=?"];
  const args: unknown[] = [CYCLE_ID];
  if (search) { terms.push("(lower(p.full_name) LIKE ? OR lower(p.email) LIKE ? OR p.iin LIKE ?)"); const q=`%${search.toLowerCase()}%`; args.push(q,q,q); }
  if (course) { terms.push("a.course_id=?"); args.push(course); }
  if (status) { terms.push("a.status=?"); args.push(status); }
  if (cv) { terms.push("a.cv_status=?"); args.push(cv); }
  if (motivation) { terms.push("a.motivation_status=?"); args.push(motivation); }
  if (interview) { terms.push("a.interview_status=?"); args.push(interview); }
  if (decision) { terms.push("a.final_decision=?"); args.push(decision); }
  const sql = `SELECT a.*,p.full_name,p.email,p.phone,p.iin,p.birth_date,p.city,p.region,p.education,p.employment_status,p.it_experience,p.regional,c.name AS course_name FROM applications a JOIN people p ON p.id=a.person_id JOIN courses c ON c.id=a.course_id WHERE ${terms.join(" AND ")} ORDER BY a.updated_at DESC LIMIT 500`;
  return (await db().prepare(sql).bind(...args).all()).results;
}

export async function applicationDetail(applicationId: string) {
  await ensureBootstrap();
  const database = db();
  const application = await database.prepare("SELECT a.*,p.full_name,p.email,p.phone,p.iin,p.birth_date,p.identity_number,p.identity_issued_at,p.birth_region,p.birth_city,p.city,p.region,p.education,p.employment_status,p.it_experience,p.regional,c.name AS course_name FROM applications a JOIN people p ON p.id=a.person_id JOIN courses c ON c.id=a.course_id WHERE a.id=?").bind(applicationId).first();
  if (!application) return null;
  const [reviews, interview, motivation, audit] = await Promise.all([
    database.prepare("SELECT r.*,u.name AS reviewer FROM cv_reviews r LEFT JOIN users u ON u.id=r.reviewer_id WHERE r.application_id=? ORDER BY r.created_at DESC").bind(applicationId).all(),
    database.prepare("SELECT * FROM interviews WHERE application_id=?").bind(applicationId).first(),
    database.prepare("SELECT * FROM motivation_submissions WHERE application_id=? ORDER BY received_at DESC").bind(applicationId).all(),
    database.prepare("SELECT * FROM audit_log WHERE entity_id=? ORDER BY created_at DESC LIMIT 20").bind(applicationId).all(),
  ]);
  return { application, reviews: reviews.results, interview, motivation: motivation.results, audit: audit.results };
}

export async function audit(actorId: string, action: string, entityType: string, entityId: string | null, changes: unknown) {
  await db().prepare("INSERT INTO audit_log (id,actor_id,action,entity_type,entity_id,changes_json,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(id("audit"), actorId, action, entityType, entityId, JSON.stringify(changes), now()).run();
}

export const makeId = id;
export const database = db;
