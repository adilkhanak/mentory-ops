const labels: Record<string, string> = {
  NEW: "Новая", IN_REVIEW: "На рассмотрении", APPROVED: "Одобрено", MAYBE: "В резерве", REJECTED: "Отклонено",
  NOT_REVIEWED: "Не проверено", NOT_SENT: "Не отправлено", SENT: "Отправлено", RECEIVED: "Получено",
  NOT_SCHEDULED: "Не назначено", SCHEDULED: "Назначено", ATTENDED: "Проведено", COMPLETED: "Проведено",
  ACCEPTED: "Принят", WAITLIST: "В резерве", PENDING: "Ожидает", UNKNOWN: "Не отмечено", NO_SHOW: "Не пришёл",
};
const tones: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200", ACCEPTED: "bg-emerald-50 text-emerald-700 border-emerald-200", RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MAYBE: "bg-amber-50 text-amber-700 border-amber-200", WAITLIST: "bg-amber-50 text-amber-700 border-amber-200", PENDING: "bg-amber-50 text-amber-700 border-amber-200", SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200", NO_SHOW: "bg-rose-50 text-rose-700 border-rose-200",
};
export function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[value] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>{labels[value] ?? value}</span>;
}
