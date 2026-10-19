/* ------------------------------------------------------------------ */
/* Integraciones feature-flag: Supabase, Sentry y PostHog.             */
/*                                                                     */
/* Nada de esto es bloqueante en el MVP: cada integración se activa    */
/* solo si su clave de entorno está definida. Sin claves, la app       */
/* funciona 100% local y no carga ningún SDK de telemetría.            */
/* ------------------------------------------------------------------ */

export const flags = {
  supabase: Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  sentry: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  posthog: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
} as const;

export type IntegrationFlag = keyof typeof flags;

/** Fábrica del cliente Supabase — solo si el flag está activo. */
export async function getSupabase() {
  if (!flags.supabase) return null;
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: true } }
  );
}
