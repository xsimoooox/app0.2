import { SYSTEM_PHONES } from '../data/callDirectory';
import { getContactPhone, normalizePhoneNumber } from './phoneUtils';

const HEARING_PEER_CONTACTS = [
  { id: 'amina', phone: '+212 612 345 678' },
  { id: 'youssef', phone: '+212 661 220 933' },
  { id: 'sara', phone: '+212 645 901 112' },
  { id: 'karim', phone: '+212 699 451 782' },
];

/** Route d'écran d'appel Contacts pour un numéro pair. */
export function getCallRouteForPeer(peerPhone, myRole) {
  const phone = normalizePhoneNumber(peerPhone);
  const contactId = resolveContactId(phone, myRole);
  return myRole === 'hearing' ? `/entendant/call/${contactId}` : `/call/${contactId}`;
}

function resolveContactId(phone, myRole) {
  if (myRole === 'hearing') {
    const entMatch = HEARING_PEER_CONTACTS.find(
      (c) => getContactPhone(c) === phone,
    );
    if (entMatch) return entMatch.id;
  } else {
    try {
      const raw = localStorage.getItem('contacts');
      if (raw) {
        const list = JSON.parse(raw);
        const found = list.find((c) => getContactPhone(c) === phone);
        if (found?.id) return found.id;
      }
    } catch {
      /* ignore */
    }
  }

  if (phone === SYSTEM_PHONES.hearing) return 'c4';
  if (phone === SYSTEM_PHONES.deaf) return 'amina';

  return myRole === 'hearing' ? 'amina' : 'c1';
}
