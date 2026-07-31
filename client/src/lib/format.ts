export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function toInputDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

/** First name for greetings: prefers the account name, otherwise derives a
 * readable name from the email's local part (e.g. "jay.bondre" -> "Jay"). */
export function getFirstName(user: { name?: string | null; email: string }): string {
  if (user.name?.trim()) return user.name.trim().split(/\s+/)[0];

  const local = user.email.split("@")[0];
  const parts = local.split(/[._\-+0-9]+/).filter(Boolean);
  const first = parts[0] || local;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
