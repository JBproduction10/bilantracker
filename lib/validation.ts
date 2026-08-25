/**
 * A pragmatic email check — not a full RFC 5322 parser (nothing genuinely
 * is, and trying tends to reject valid addresses more often than it catches
 * bad ones). This is deliberately used on BOTH sides: client-side for
 * immediate feedback, and — critically — server-side in the data layer,
 * where it's actually enforced. The client check is a courtesy; the server
 * check is what stops a bad address from silently reaching real SMTP.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string | undefined | null): boolean {
  if (!value || typeof value !== "string") return false;
  return EMAIL_RE.test(value.trim());
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Validates and normalizes an email in one step for use in data-layer
 * functions — throws a clear, user-facing message on failure so it surfaces
 * the same way any other validation error does (via the existing
 * `withAuth` / route try-catch pattern), no special-casing needed.
 */
export function assertValidEmail(value: string | undefined | null, fieldLabel = "L'adresse email"): string {
  if (!isValidEmail(value)) {
    throw new Error(`${fieldLabel} n'est pas valide.`);
  }
  return normalizeEmail(value as string);
}
