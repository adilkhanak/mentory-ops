export const CYCLE_ID = "tech-orda-2026";

export const CV_STATUSES = ["NOT_REVIEWED", "APPROVED", "MAYBE", "REJECTED"] as const;

export function normalizeIin(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 12 ? digits : null;
}

export function normalizeEmail(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  return email.includes("@") ? email : null;
}

export function normalizeCourse(value: unknown) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("middle") || text.includes("мид")) return "middle-frontend";
  if (text.includes("junior") || text.includes("джун")) return "junior-frontend";
  return null;
}

export function cvFromCellColor(color?: string | null) {
  const hex = String(color ?? "").replace("#", "").toUpperCase();
  if (["00FF00", "92D050", "C6EFCE", "D9EAD3"].includes(hex)) return "APPROVED";
  if (["FFFF00", "FFD966", "FFEB9C", "FFF2CC", "FCE5CD"].includes(hex)) return "MAYBE";
  if (["FF0000", "C00000", "FFC7CE", "F4CCCC", "EA9999", "CC4125"].includes(hex)) return "REJECTED";
  return "NOT_REVIEWED";
}

export function regionalTarget(totalQuota: number, percent: number) {
  return Math.ceil(totalQuota * percent / 100);
}
