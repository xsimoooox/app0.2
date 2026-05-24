/** Clé stable pour une paire d'appelants (numéros normalisés). */
export function callPairKey(phoneA, phoneB) {
  return [phoneA, phoneB].filter(Boolean).sort().join('|');
}

export function canSpeakNow(turnHolder, myPhone) {
  if (!turnHolder || !myPhone) return false;
  return turnHolder === myPhone;
}

export function otherPartyPhone(myPhone, phoneA, phoneB) {
  if (myPhone === phoneA) return phoneB;
  if (myPhone === phoneB) return phoneA;
  return phoneB;
}
