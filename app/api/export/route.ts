import { NextResponse } from "next/server";
import { getActor, listApplications } from "@/lib/server";

function cell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  await getActor("/applications");
  const rows = await listApplications();
  const headers = ["Номер заявки", "ФИО", "ИИН", "Email", "Телефон", "Дата рождения", "Курс", "Регион", "Город", "Образование", "Занятость", "Опыт в IT", "Региональная квота", "Ссылка CV", "Этап заявки", "Статус CV", "Мотивация", "Интервью", "Финальное решение", "Комментарий"];
  const records = rows.map((row: Record<string, unknown>) => [row.application_number, row.full_name, row.iin, row.email, row.phone, row.birth_date, row.course_name, row.region, row.city, row.education, row.employment_status, row.it_experience, row.regional ? "Да" : "Нет", row.cv_url, row.status, row.cv_status, row.motivation_status, row.interview_status, row.final_decision, row.notes]);
  const csv = [headers, ...records].map((row) => row.map(cell).join(",")).join("\n");
  return new NextResponse(`\uFEFF${csv}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=mentory-techorda-2026.csv" } });
}
