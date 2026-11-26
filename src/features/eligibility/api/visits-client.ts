// The landing page's public visitor count. The first visit from this phone adds one; later visits
// only read. Nothing is sent but the request itself, and the flag holds no answers.

const COUNTED_KEY = "paatra.counted.v1";

function alreadyCounted(): boolean {
  try {
    return localStorage.getItem(COUNTED_KEY) === "1";
  } catch {
    return true; // No storage (private mode): read only, so a refresh never counts twice.
  }
}

export async function visitorCount(): Promise<number | null> {
  const counted = alreadyCounted();
  try {
    const res = await fetch("/api/visits/paatra", { method: counted ? "GET" : "POST" });
    if (!res.ok) return null;
    const { count } = (await res.json()) as { count?: unknown };
    if (typeof count !== "number") return null;
    if (!counted) {
      try {
        localStorage.setItem(COUNTED_KEY, "1");
      } catch {}
    }
    return count;
  } catch {
    return null;
  }
}
