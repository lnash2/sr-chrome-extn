/**
 * Normalise a UK phone number to E.164 display format (+44XXXXXXXXXX).
 * Returns the original string if it can't be normalised.
 */
export function normalisePhoneE164(raw: string): string {
  // Strip everything except digits and leading +
  const stripped = raw.replace(/[^\d+]/g, '');

  // Already E.164
  if (/^\+44\d{10}$/.test(stripped)) return stripped;

  // +44 with spaces/dashes removed but possibly short
  if (stripped.startsWith('+44') && stripped.length >= 12) return stripped.slice(0, 13);

  // 44XXXXXXXXXX (no plus)
  if (stripped.startsWith('44') && stripped.length >= 12) return '+' + stripped.slice(0, 12);

  // 07XXXXXXXXX (UK mobile)
  if (stripped.startsWith('0') && stripped.length >= 11) return '+44' + stripped.slice(1, 11);

  // Can't normalise — return original trimmed
  return raw.trim();
}
