// Display helpers shared by the admin and student screens.

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

// 900000 -> "₹9,00,000"
export function formatINR(n: number): string {
  return `₹${inr.format(n)}`;
}

// 100000 -> "₹1 L", 450000 -> "₹4.5 L"
export function formatLakh(n: number): string {
  const lakh = n / 100000;
  return `₹${Number.isInteger(lakh) ? lakh : lakh.toFixed(1).replace(/\.0$/, "")} L`;
}

export function daysAgo(then: Date | null, now: Date): string {
  if (!then) return "never";
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

// "2027-03-31" -> "31 Mar 2027"
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// The registry's dates are Indian dates.
export function todayInIndia(now: Date): string {
  return new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}
