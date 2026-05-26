export const IST_TZ = "Asia/Kolkata";

function toDate(iso: string | Date): Date {
  if (iso instanceof Date) return iso;
  const s = String(iso);
  const hasTz = /Z|[+-]\d{2}:?\d{2}$/.test(s);
  return new Date(hasTz ? s : s + "Z");
}

export function fmtIST(iso: string | Date): string {
  return toDate(iso).toLocaleString("en-IN", {
    timeZone: IST_TZ,
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }) + " IST";
}

export function fmtISTLong(iso: string | Date): string {
  return toDate(iso).toLocaleString("en-IN", {
    timeZone: IST_TZ,
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  }) + " IST";
}

export function fmtISTDate(iso: string | Date): string {
  return toDate(iso).toLocaleDateString("en-IN", {
    timeZone: IST_TZ, year: "numeric", month: "short", day: "2-digit",
  });
}

export function fmtRel(iso: string | Date): string {
  const t = toDate(iso).getTime();
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  if (s < 0) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30); if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
