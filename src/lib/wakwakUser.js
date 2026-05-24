import { normalizePhoneNumber } from './phoneUtils';

export const WAKWAK_USER_KEY = 'wakwak_user';

export function isValidWakwakUser(user) {
  if (!user || typeof user !== 'object') return false;
  const name = String(user.name || '').trim();
  const phone = normalizePhoneNumber(user.phoneNumber || '');
  const role = user.role;
  return (
    name.length >= 3 &&
    /^[\p{L}\s'-]+$/u.test(name) &&
    phone.length >= 11 &&
    (role === 'deaf' || role === 'hearing')
  );
}

export function getWakwakUser() {
  try {
    const raw = localStorage.getItem(WAKWAK_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!isValidWakwakUser(user)) return null;
    return {
      ...user,
      phoneNumber: normalizePhoneNumber(user.phoneNumber),
    };
  } catch {
    return null;
  }
}

export function saveWakwakUser(user) {
  const payload = {
    name: user.name.trim(),
    phoneNumber: normalizePhoneNumber(user.phoneNumber),
    role: user.role,
    createdAt: user.createdAt || new Date().toISOString(),
    avatar: user.avatar ?? null,
  };
  localStorage.setItem(WAKWAK_USER_KEY, JSON.stringify(payload));
  localStorage.setItem('wakwak_profile', payload.role === 'hearing' ? 'entendant' : 'sourd');
  localStorage.setItem('userPhone', payload.phoneNumber);
  return payload;
}

export function clearWakwakUser() {
  localStorage.removeItem(WAKWAK_USER_KEY);
  localStorage.removeItem('wakwak_profile');
  localStorage.removeItem('userPhone');
}

export function getHomeRoute(role) {
  return role === 'hearing' ? '/entendant/accueil' : '/accueil';
}
