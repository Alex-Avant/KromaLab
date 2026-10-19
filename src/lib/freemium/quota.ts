"use client";

/* ------------------------------------------------------------------ */
/* Cuota freemium diaria (local en el MVP; Supabase la valida en D).   */
/* 3 exportaciones por día; el contador se reinicia con la fecha.      */
/* ------------------------------------------------------------------ */

export const FREE_DAILY_EXPORTS = 3;

const STORAGE_KEY = "kromalab:quota:v1";

type Quota = { date: string; used: number };

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getQuota(): Quota {
  const storage = safeStorage();
  if (!storage) return { date: today(), used: 0 };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { date: today(), used: 0 };
    const parsed = JSON.parse(raw) as Partial<Quota>;
    if (parsed.date !== today()) return { date: today(), used: 0 };
    return { date: parsed.date ?? today(), used: parsed.used ?? 0 };
  } catch {
    return { date: today(), used: 0 };
  }
}

export function remainingExports(): number {
  const { used } = getQuota();
  return Math.max(0, FREE_DAILY_EXPORTS - used);
}

export function setQuota(quota: Quota) {
  safeStorage()?.setItem(STORAGE_KEY, JSON.stringify(quota));
}

/** Consume una exportación; devuelve false si la cuota está agotada. */
export function consumeExport(): boolean {
  const quota = getQuota();
  if (quota.used >= FREE_DAILY_EXPORTS) return false;
  setQuota({ ...quota, used: quota.used + 1 });
  return true;
}
