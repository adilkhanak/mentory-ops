import { NextRequest, NextResponse } from "next/server";
import { database, makeId } from "@/lib/server";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.IMAP_INGEST_TOKEN || token !== process.env.IMAP_INGEST_TOKEN) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as Record<string, any>;
  const messages = Array.isArray(body.messages) ? body.messages : [body];
  const db = database(); let inserted = 0; let matched = 0;
  for (const m of messages) {
    if (!m.messageId) continue;
    if (await db.prepare("SELECT id FROM email_messages WHERE message_id=?").bind(m.messageId).first()) continue;
    const from = String(m.fromEmail ?? "").toLowerCase();
    const app = from ? await db.prepare("SELECT a.id FROM applications a JOIN people p ON p.id=a.person_id WHERE lower(p.email)=lower(?) ORDER BY a.updated_at DESC LIMIT 1").bind(from).first<{ id: string }>() : null;
    const emailId = makeId("mail"), now = new Date().toISOString();
    await db.prepare("INSERT INTO email_messages (id,message_id,uid,from_email,subject,received_at,status,application_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(emailId, m.messageId, Number(m.uid) || null, from || null, m.subject || null, m.receivedAt || now, app ? "MATCHED" : "RECEIVED", app?.id ?? null, now).run();
    inserted++;
    if (app) {
      await db.batch([
        db.prepare("INSERT INTO motivation_submissions (id,application_id,email_message_id,received_at,status,created_at) VALUES (?,?,?,?,?,?)").bind(makeId("mot"), app.id, emailId, m.receivedAt || now, "RECEIVED", now),
        db.prepare("UPDATE applications SET motivation_status='RECEIVED',updated_at=? WHERE id=?").bind(now, app.id),
      ]);
      matched++;
    }
  }
  return NextResponse.json({ ok: true, inserted, matched });
}
