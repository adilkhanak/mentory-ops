import { NextRequest, NextResponse } from "next/server";
import { audit, database, getActor, makeId } from "@/lib/server";

const roles = ["ADMIN", "MANAGER", "TEACHER", "VIEWER"] as const;

export async function POST(req: NextRequest) {
  const actor = await getActor("/settings");
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Только администратор может менять доступы" }, { status: 403 });
  const body = await req.json() as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim() || email;
  const role = roles.includes(body.role as typeof roles[number]) ? body.role as typeof roles[number] : "VIEWER";
  if (!email.includes("@")) return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
  const db = database();
  const existing = await db.prepare("SELECT id FROM users WHERE lower(email)=lower(?)").bind(email).first<{ id: string }>();
  const id = existing?.id ?? makeId("invite");
  if (existing) await db.prepare("UPDATE users SET name=?,role=? WHERE id=?").bind(name, role, id).run();
  else await db.prepare("INSERT INTO users(id,email,name,role,created_at) VALUES(?,?,?,?,?)").bind(id, email, name, role, new Date().toISOString()).run();
  await audit(actor.id, existing ? "UPDATE_USER_ACCESS" : "INVITE_USER", "user", id, { email, role });
  return NextResponse.json({ ok: true });
}
