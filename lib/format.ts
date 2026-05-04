export function formatRupiah(value: number | string | null | undefined) {
  const numberValue = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(numberValue);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(date));
}

export function getStartOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getStartOfWeek(date = new Date()) {
  const result = getStartOfDay(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
}

export function getStartOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getStartOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1);
}

export function monthLabel(monthIndex: number) {
  return ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][monthIndex];
}
