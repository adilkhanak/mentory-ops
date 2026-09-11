import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { CYCLE_ID, normalizeCourse, normalizeEmail, normalizeIin } from "@/lib/domain";
import { audit, database, getActor, makeId } from "@/lib/server";

function pick(row: Record<string, unknown>, keys: string[]) {
  for (const [rawKey, value] of Object.entries(row)) {
    const key = rawKey.toLowerCase().replace(/\s+/g, " ").trim();
    if (keys.some((candidate) => key.includes(candidate))) return value;
  }
  return null;
}
function text(value: unknown) { return String(value ?? "").trim() || null; }
function date(value: unknown) { return value instanceof Date ? value.toISOString() : text(value); }
function regionalValue(explicit: unknown, region: string | null) {
  const flag = String(explicit ?? "").toLowerCase();
  if (/да|yes|true|1/.test(flag)) return 1;
  if (/нет|no|false|0/.test(flag)) return 0;
  return region && !["астана", "алматы"].includes(region.toLowerCase()) ? 1 : 0;
}

export async function POST(req: NextRequest) {
  const actor = await getActor("/import");
  if (!["ADMIN", "MANAGER"].includes(actor.role)) return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Файл не выбран" }, { status: 400 });
  if (file.size > 12_000_000) return NextResponse.json({ error: "Файл больше 12 МБ" }, { status: 400 });

  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const officialTabs = workbook.SheetNames.filter((name) => ["junior", "middle"].includes(name.trim().toLowerCase()));
  const sheetNames = officialTabs.length ? officialTabs : workbook.SheetNames.slice(0, 1);
  const sourceRows = sheetNames.flatMap((sheetName) => XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: null }).map((row) => ({ row, sheetName })));
  const db = database(); const issues: string[] = []; let imported = 0; let skipped = 0; const now = new Date().toISOString();

  for (let index = 0; index < sourceRows.length; index++) {
    const { row, sheetName } = sourceRows[index];
    const name = text(pick(row, ["фио", "full name", "кандидат", "name"]));
    const iin = normalizeIin(pick(row, ["иин", "iin"]));
    const email = normalizeEmail(pick(row, ["e-mail", "email", "почта"]));
    const course = normalizeCourse(pick(row, ["направ", "курс", "course", "программ"]) ?? sheetName);
    if (!name || (!iin && !email) || !course) { issues.push(`${sheetName}, строка ${index + 2}: не хватает ФИО, ИИН/email или направления`); skipped++; continue; }

    const applicationNumber = text(pick(row, ["номер заявки", "application number"]));
    const phone = text(pick(row, ["телефон", "phone", "мобиль"]));
    const birthDate = date(pick(row, ["дата рождения", "birth date"]));
    const identityNumber = text(pick(row, ["номер удостоверения", "identity number"]));
    const identityIssuedAt = date(pick(row, ["дата выдачи удостовер", "identity issued"]));
    const birthRegion = text(pick(row, ["область рождения", "регион рождения"]));
    const birthCity = text(pick(row, ["город рождения"]));
    const region = text(pick(row, ["область текущего", "регион текущего", "current region"]));
    const city = text(pick(row, ["город текущего", "current city"]));
    const education = text(pick(row, ["уровень образования", "education"]));
    const employment = text(pick(row, ["статус занятости", "employment"]));
    const experience = text(pick(row, ["опыт работы в it", "it experience"]));
    const learningGoal = text(pick(row, ["цель обучения", "learning goal"]));
    const cvUrl = text(pick(row, ["резюме", "cv"]));
    const notes = text(pick(row, ["комментар", "примеч"]));
    const regional = regionalValue(pick(row, ["региональная квота", "regional"]), region);

    const person = await db.prepare("SELECT id FROM people WHERE (iin IS NOT NULL AND iin=?) OR (email IS NOT NULL AND lower(email)=lower(?)) LIMIT 1").bind(iin, email).first<{ id: string }>();
    const personId = person?.id ?? makeId("person");
    if (person) await db.prepare("UPDATE people SET full_name=?,email=COALESCE(?,email),phone=COALESCE(?,phone),birth_date=COALESCE(?,birth_date),identity_number=COALESCE(?,identity_number),identity_issued_at=COALESCE(?,identity_issued_at),birth_region=COALESCE(?,birth_region),birth_city=COALESCE(?,birth_city),city=COALESCE(?,city),region=COALESCE(?,region),education=COALESCE(?,education),employment_status=COALESCE(?,employment_status),it_experience=COALESCE(?,it_experience),regional=? WHERE id=?").bind(name, email, phone, birthDate, identityNumber, identityIssuedAt, birthRegion, birthCity, city, region, education, employment, experience, regional, personId).run();
    else await db.prepare("INSERT INTO people(id,iin,full_name,email,phone,birth_date,identity_number,identity_issued_at,birth_region,birth_city,city,region,education,employment_status,it_experience,regional,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(personId, iin, name, email, phone, birthDate, identityNumber, identityIssuedAt, birthRegion, birthCity, city, region, education, employment, experience, regional, now).run();

    const existing = await db.prepare("SELECT id FROM applications WHERE person_id=? AND cycle_id=? AND course_id=?").bind(personId, CYCLE_ID, course).first<{ id: string }>();
    if (existing) await db.prepare("UPDATE applications SET application_number=COALESCE(?,application_number),applied_at=COALESCE(?,applied_at),signed_at=COALESCE(?,signed_at),source_application_status=COALESCE(?,source_application_status),sender_status=COALESCE(?,sender_status),learning_goal=COALESCE(?,learning_goal),cv_url=COALESCE(?,cv_url),notes=COALESCE(?,notes),source='OFFICIAL_IMPORT',updated_at=? WHERE id=?").bind(applicationNumber, date(pick(row, ["дата заявки"])), date(pick(row, ["дата подписания"])), text(pick(row, ["статус заявки"])), text(pick(row, ["статус отправителя"])), learningGoal, cvUrl, notes, now, existing.id).run();
    else await db.prepare("INSERT INTO applications(id,application_number,person_id,cycle_id,course_id,applied_at,signed_at,source_application_status,sender_status,learning_goal,status,cv_status,cv_url,motivation_status,interview_status,final_decision,source,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(makeId("app"), applicationNumber, personId, CYCLE_ID, course, date(pick(row, ["дата заявки"])), date(pick(row, ["дата подписания"])), text(pick(row, ["статус заявки"])), text(pick(row, ["статус отправителя"])), learningGoal, "NEW", "NOT_REVIEWED", cvUrl, "NOT_SENT", "NOT_SCHEDULED", "PENDING", "OFFICIAL_IMPORT", notes, now, now).run();
    imported++;
  }

  const runId = makeId("import");
  await db.prepare("INSERT INTO import_runs(id,source_name,status,rows_total,rows_imported,rows_skipped,issues_json,actor_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)").bind(runId, file.name, issues.length ? "COMPLETED_WITH_ISSUES" : "COMPLETED", sourceRows.length, imported, skipped, JSON.stringify(issues), actor.id, now).run();
  await audit(actor.id, "IMPORT", "import_run", runId, { file: file.name, sheets: sheetNames, total: sourceRows.length, imported, skipped });
  return NextResponse.json({ total: sourceRows.length, imported, skipped, issues });
}
