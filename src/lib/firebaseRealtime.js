const DATABASE_URL = 'https://sign-langage-default-rtdb.firebaseio.com';
const API_KEY = 'AIzaSyDWVNNE_7-Ea1Cd5mPUZuh3pDGlEG64DGM';

const langMap = {
  Français: 'fr-FR',
  Arabe: 'ar-MA',
  Anglais: 'en-US',
  Darija: 'ar-MA',
};

function cleanPath(path) {
  return String(path).replace(/^\/+|\/+$/g, '');
}

function pathUrl(path) {
  return `${DATABASE_URL}/${cleanPath(path)}.json`;
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage can be unavailable in strict privacy contexts.
  }
}

export function getSpeechLang(label) {
  return langMap[label] || 'fr-FR';
}

export function generateSessionCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  let left = '';
  let right = '';
  for (let i = 0; i < 3; i += 1) left += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 3; i += 1) right += numbers[Math.floor(Math.random() * numbers.length)];
  return `${left}-${right}`;
}

export function getClientUid(role = 'user') {
  const key = `wakwak_uid_${role}`;
  const existing = readStorage(key);
  if (existing) return existing;
  const uid = `${role}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  writeStorage(key, uid);
  return uid;
}

export function getStoredSessionCode() {
  return readStorage('wakwak_active_session_code') || '';
}

export function storeSessionCode(code) {
  writeStorage('wakwak_active_session_code', code);
}

export async function setFirebaseData(path, data) {
  const response = await fetch(pathUrl(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Firebase PUT failed: ${response.status}`);
  return response.json();
}

export async function updateFirebaseData(path, data) {
  const response = await fetch(pathUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Firebase PATCH failed: ${response.status}`);
  return response.json();
}

export async function pushFirebaseData(path, data) {
  const response = await fetch(pathUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Firebase POST failed: ${response.status}`);
  return response.json();
}

export async function getFirebaseData(path) {
  const response = await fetch(pathUrl(path));
  if (!response.ok) throw new Error(`Firebase GET failed: ${response.status}`);
  return response.json();
}

export function listenFirebaseValue(path, onValue, onConnection) {
  const source = new EventSource(pathUrl(path));
  let currentValue = null;

  const applyNestedValue = (target, eventPath, value) => {
    const parts = eventPath.split('/').filter(Boolean);
    if (parts.length === 0) return value;
    const next = target && typeof target === 'object' ? { ...target } : {};
    let cursor = next;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        cursor[part] = value;
        return;
      }
      cursor[part] = cursor[part] && typeof cursor[part] === 'object' ? { ...cursor[part] } : {};
      cursor = cursor[part];
    });
    return next;
  };

  const handleEvent = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.path === '/') {
        currentValue = payload.data;
      } else {
        currentValue = applyNestedValue(currentValue, payload.path, payload.data);
      }
      onValue(currentValue);
      onConnection?.('connected');
    } catch {
      onConnection?.('error');
    }
  };

  source.addEventListener('put', handleEvent);
  source.addEventListener('patch', handleEvent);
  source.onerror = () => onConnection?.('reconnecting');
  source.onopen = () => onConnection?.('connected');

  return () => source.close();
}

export async function createRealtimeCall({ code, callerUid, callerName, lang }) {
  const timestamp = Date.now();
  storeSessionCode(code);
  await setFirebaseData(`sessions/${code}`, {
    transcript: {
      text: '',
      isFinal: true,
      timestamp,
      lang,
    },
    status: 'idle',
    participants: {
      A: callerUid,
      B: null,
    },
    createdAt: timestamp,
  });
  await setFirebaseData(`calls/${code}`, {
    caller: callerUid,
    callerName,
    status: 'ringing',
    lang,
    createdAt: timestamp,
  });
  await pushFirebaseData('notifications/deaf_user', {
    code,
    callerName,
    timestamp,
    status: 'pending',
  });
}

export async function joinRealtimeCall({ code, uid }) {
  storeSessionCode(code);
  await updateFirebaseData(`sessions/${code}/participants`, { B: uid });
  await updateFirebaseData(`calls/${code}`, { status: 'active' });
}

export async function sendTranscript({ code, text, isFinal, lang }) {
  const timestamp = Date.now();
  await updateFirebaseData(`sessions/${code}`, {
    transcript: {
      text,
      isFinal,
      timestamp,
      lang,
    },
    status: isFinal ? 'idle' : 'speaking',
  });
}

export async function endRealtimeCall(code) {
  if (!code) return;
  await updateFirebaseData(`calls/${code}`, { status: 'ended' });
  await updateFirebaseData(`sessions/${code}`, { status: 'ended' });
}

export async function registerNotificationPreference(uid) {
  if (!('Notification' in window)) return 'unsupported';
  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission;
  const pseudoToken = permission === 'granted'
    ? `web-notification-${uid}-${API_KEY.slice(-6)}`
    : null;
  await updateFirebaseData(`users/${uid}`, {
    notificationPermission: permission,
    fcmToken: pseudoToken,
    updatedAt: Date.now(),
  });
  return permission;
}

export function showLocalIncomingNotification({ code, callerName }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notification = new Notification('📞 Appel entrant', {
    body: `Code : ${code} — Appuyez sur Rejoindre`,
    data: { codeSession: code, type: 'incoming_call' },
  });
  notification.onclick = () => {
    storeSessionCode(code);
    window.focus();
    window.location.href = `/call/c1?code=${encodeURIComponent(code)}`;
  };
}

const RENCONTRE_TTL_MS = 30 * 60 * 1000;

function rencontrePath(sessionId, suffix = '') {
  const id = encodeURIComponent(sessionId);
  return suffix ? `rencontreSessions/${id}/${suffix}` : `rencontreSessions/${id}`;
}

export async function createRencontreSession(sessionId, hostUid, { hostDisplayName } = {}) {
  const now = Date.now();
  await setFirebaseData(rencontrePath(sessionId), {
    status: 'waiting',
    hostUid,
    hostDisplayName: hostDisplayName || 'Interlocuteur',
    guestUid: null,
    createdAt: now,
    expiresAt: now + RENCONTRE_TTL_MS,
    voice: { text: '', isFinal: true, timestamp: now, lang: 'fr-FR' },
    glove: { text: '', isFinal: true, timestamp: now },
    turn: 'hearing',
  });
}

export async function getRencontreSession(sessionId) {
  return getFirebaseData(rencontrePath(sessionId));
}

export async function joinRencontreSession(sessionId, guestUid) {
  const session = await getRencontreSession(sessionId);
  if (!session) throw new Error('session_not_found');
  if (session.expiresAt && Date.now() > session.expiresAt) throw new Error('session_expired');
  if (session.status === 'ended') throw new Error('session_ended');

  await updateFirebaseData(rencontrePath(sessionId), {
    guestUid,
    status: 'active',
    turn: 'hearing',
  });
}

export async function sendRencontreVoice(sessionId, { text, isFinal, lang }) {
  const timestamp = Date.now();
  const patch = {
    voice: { text, isFinal, timestamp, lang },
    status: 'active',
  };
  if (isFinal) {
    patch.turn = 'deaf';
  }
  await updateFirebaseData(rencontrePath(sessionId), patch);
}

export async function sendRencontreGlove(sessionId, { text, isFinal }) {
  const timestamp = Date.now();
  const patch = {
    glove: { text, isFinal, timestamp },
    status: 'active',
  };
  if (isFinal) {
    patch.turn = 'hearing';
  }
  await updateFirebaseData(rencontrePath(sessionId), patch);
}

export async function endRencontreSession(sessionId) {
  if (!sessionId) return;
  await updateFirebaseData(rencontrePath(sessionId), { status: 'ended' });
}

export function listenRencontreSession(sessionId, { onMeta, onVoice, onGlove, onConnection }) {
  const stops = [];

  if (onMeta || onConnection) {
    stops.push(listenFirebaseValue(rencontrePath(sessionId), (data) => {
      if (!data || typeof data !== 'object') return;
      onMeta?.({
        status: data.status,
        hostUid: data.hostUid,
        hostDisplayName: data.hostDisplayName,
        guestUid: data.guestUid,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt,
        turn: data.turn,
      });
      if (data.voice) onVoice?.(data.voice);
      if (data.glove) onGlove?.(data.glove);
    }, onConnection));
  }

  return () => stops.forEach((stop) => stop());
}

