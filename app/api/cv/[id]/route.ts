import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { database, getActor } from "@/lib/server";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function documentPage(title: string, text: string) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#e2e8f0;color:#172554;font:15px/1.6 system-ui,sans-serif}.page{box-sizing:border-box;max-width:900px;min-height:100vh;margin:0 auto;padding:48px 56px;background:white;box-shadow:0 10px 30px #0f172a1a}h1{font-size:18px;margin:0 0 28px;border-bottom:1px solid #e2e8f0;padding-bottom:16px}.content{white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:640px){.page{padding:24px}}</style></head><body><main class="page"><h1>${escapeHtml(title)}</h1><div class="content">${escapeHtml(text)}</div></main></body></html>`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getActor(`/applications/${id}`);
  const row = await database().prepare("SELECT a.cv_url,p.full_name FROM applications a JOIN people p ON p.id=a.person_id WHERE a.id=?").bind(id).first<{ cv_url: string | null; full_name: string }>();
  if (!row?.cv_url) return NextResponse.json({ error: "CV не найдено" }, { status: 404 });
  let source: URL;
  try { source = new URL(row.cv_url); } catch { return NextResponse.json({ error: "Некорректная ссылка CV" }, { status: 400 }); }
  if (!['http:', 'https:'].includes(source.protocol)) return NextResponse.json({ error: "Недопустимая ссылка CV" }, { status: 400 });
  const upstream = await fetch(source, { redirect: "follow", cache: "no-store" });
  if (!upstream.ok) return NextResponse.json({ error: "Не удалось загрузить CV" }, { status: 502 });
  const bytes = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get("content-type")?.split(";")[0] || "application/octet-stream";
  const pathname = source.pathname.toLowerCase();

  if (pathname.endsWith(".docx") || contentType.includes("wordprocessingml")) {
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    return new NextResponse(documentPage(`CV — ${row.full_name}`, value || "Документ не содержит распознаваемого текста."), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'" },
    });
  }

  return new NextResponse(bytes, {
    headers: { "Content-Type": contentType, "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
