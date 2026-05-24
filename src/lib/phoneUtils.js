/** Normalise un numéro pour l'identifiant d'appel (phoneNumber). */
export function normalizePhoneNumber(raw) {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (trimmed.startsWith('+')) {
    return `+${trimmed.replace(/\D/g, '')}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('212')) return `+${digits}`;
  if (digits.startsWith('0') && digits.length >= 9) {
    return `+212${digits.slice(1)}`;
  }
  if (digits.length === 9) return `+212${digits}`;
  return `+${digits}`;
}

export function getContactPhone(contact) {
  return normalizePhoneNumber(contact?.phoneNumber || contact?.phone || '');
}
