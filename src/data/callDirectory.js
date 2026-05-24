import { normalizePhoneNumber } from '../lib/phoneUtils';

export const SYSTEM_PHONES = {
  deaf: '+212600000001',
  hearing: '+212600000002',
};

/** Annuaire minimal pour affichage nom / rôle dans les modals d'appel */
const DIRECTORY = [
  { phoneNumber: '+212600000001', name: 'Utilisateur sourd', role: 'deaf' },
  { phoneNumber: '+212600000002', name: 'Utilisateur entendant', role: 'hearing' },
  { phoneNumber: '+212612345678', name: 'Jean Dupont', role: 'deaf' },
  { phoneNumber: '+212145678900', name: 'Martin Lefebvre', role: 'deaf' },
  { phoneNumber: '+212761220933', name: 'Amina Benali', role: 'deaf' },
  { phoneNumber: '+212698765432', name: 'Sophie Laurent', role: 'hearing' },
  { phoneNumber: '+212655432110', name: 'Lucas Moreau', role: 'hearing' },
  { phoneNumber: '+212677889900', name: 'Fatou Diallo', role: 'deaf' },
  { phoneNumber: '+212123456789', name: 'Pierre Fontaine', role: 'deaf' },
  { phoneNumber: '+212644556677', name: 'Nadia Khelil', role: 'deaf' },
  { phoneNumber: '+212612345678', name: 'Amina Moussaoui', role: 'deaf' },
  { phoneNumber: '+212661220933', name: 'Youssef Benali', role: 'deaf' },
  { phoneNumber: '+212645901112', name: 'Sara Lahlou', role: 'deaf' },
  { phoneNumber: '+212699451782', name: 'Karim Meziane', role: 'deaf' },
];

export function lookupContactByPhone(phone) {
  const key = normalizePhoneNumber(phone);
  return DIRECTORY.find((entry) => entry.phoneNumber === key) || null;
}
