import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  createRealtimeCall,
  endRealtimeCall,
  generateSessionCode,
  getClientUid,
  getFirebaseData,
  getSpeechLang,
  pushFirebaseData,
  registerNotificationPreference,
  listenFirebaseValue,
  sendTranscript,
  showLocalIncomingNotification,
  storeSessionCode,
} from '../lib/firebaseRealtime';
import {
  Calendar,
  Check,
  ChevronLeft,
  Hand,
  History,
  Mail,
  MapPin,
  Phone,
  PhoneIncoming,
  Search,
  Share2,
  Star,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import ZoneDActionBar from '../components/ZoneDActionBar';
import SessionTopBar from '../components/SessionTopBar';
import { useCallSystemContext } from '../context/CallSystemContext';
import { getEntendantCallState } from '../lib/contactCallUi';
import { getContactPhone, normalizePhoneNumber } from '../lib/phoneUtils';

const CONTACTS_STORAGE_KEY = 'wakwak_contacts';

function getDefaultContacts() {
  return HEARING_CONTACTS.map((c) => ({
    ...c,
    phoneNumber: getContactPhone(c),
    role: 'deaf',
    isEmergency: false,
  }));
}

function loadStoredContacts() {
  try {
    const saved = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return getDefaultContacts();
}

function initialsFromName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name || '??').slice(0, 2).toUpperCase();
}

const HEARING_CONTACTS = [
  {
    id: 'amina',
    initials: 'AM',
    name: 'Amina Moussaoui',
    role: 'Sourde',
    relation: 'Amie',
    status: 'online',
    statusLabel: 'En ligne',
    phone: '+212 612 345 678',
    email: 'amina.m@gmail.com',
    city: 'Fès, Maroc',
    since: 'Janvier 2024',
    lastCall: 'Hier · 14:32',
    duration: '4 min 12 sec',
  },
  {
    id: 'youssef',
    initials: 'YB',
    name: 'Youssef Benali',
    role: 'Sourd',
    relation: 'Famille',
    status: 'busy',
    statusLabel: 'Occupé',
    phone: '+212 661 220 933',
    email: 'youssef.b@gmail.com',
    city: 'Rabat, Maroc',
    since: 'Février 2024',
    lastCall: 'Lundi · 10:08',
    duration: '2 min 30 sec',
  },
  {
    id: 'sara',
    initials: 'SL',
    name: 'Sara Lahlou',
    role: 'Sourde',
    relation: 'Collègue',
    status: 'offline',
    statusLabel: 'Hors ligne',
    phone: '+212 645 901 112',
    email: 'sara.l@gmail.com',
    city: 'Casablanca, Maroc',
    since: 'Mars 2024',
    lastCall: '12 mai · 18:05',
    duration: '1 min 06 sec',
  },
  {
    id: 'karim',
    initials: 'KM',
    name: 'Karim Meziane',
    role: 'Sourd',
    relation: 'Ami',
    status: 'online',
    statusLabel: 'En ligne',
    phone: '+212 699 451 782',
    email: 'karim.m@gmail.com',
    city: 'Marrakech, Maroc',
    since: 'Avril 2024',
    lastCall: 'Mardi · 09:18',
    duration: '2 min 45 sec',
  },
];

const statusColor = {
  online: '#22c55e',
  busy: '#f97316',
  offline: '#333333',
};

function getContact(id, contacts) {
  const list = contacts || loadStoredContacts();
  return list.find((contact) => contact.id === id) || list[0];
}

function ContactAvatar({ contact, size = 'sm' }) {
  const className = size === 'lg'
    ? 'w-16 h-16 rounded-[20px] border-2 border-[#c8e6c9] text-[20px]'
    : 'w-8 h-8 rounded-[9px] text-[11px]';

  return (
    <div className={`${className} bg-[#e8f5e9] text-[#4ade80] flex items-center justify-center font-extrabold shrink-0`}>
      {contact.initials}
    </div>
  );
}

function ContactList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { callUser, getRealtimeStatus, activeCall } = useCallSystemContext();
  const [query, setQuery] = useState('');
  const [contacts, setContacts] = useState(loadStoredContacts);
  const [listToast, setListToast] = useState(null);

  useEffect(() => {
    setContacts(loadStoredContacts());
  }, [location.pathname]);

  useEffect(() => {
    if (!activeCall?.withPhone) return;
    const phone = getContactPhone({ phone: activeCall.withPhone });
    const contact = contacts.find((c) => getContactPhone(c) === phone);
    if (contact) navigate(`/entendant/call/${contact.id}`);
  }, [activeCall, navigate, contacts]);

  const statusLabel = (status) => {
    if (status === 'online') return 'En ligne';
    if (status === 'busy') return 'Occupé';
    return 'Hors ligne';
  };

  const handleCallContact = (contact, event) => {
    event?.stopPropagation?.();
    const targetPhone = getContactPhone(contact);
    const status = getRealtimeStatus(targetPhone, contact.status);
    if (status !== 'online') {
      setListToast(
        `📵 ${contact.name} est ${status === 'busy' ? 'occupé' : 'hors ligne'}`,
      );
      setTimeout(() => setListToast(null), 2500);
      return;
    }
    callUser(targetPhone, contact.name);
  };

  const filteredContacts = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return contacts;
    return contacts.filter((contact) => (
      contact.name.toLowerCase().includes(cleanQuery)
      || (contact.role || '').toLowerCase().includes(cleanQuery)
      || contact.statusLabel?.toLowerCase().includes(cleanQuery)
    ));
  }, [query, contacts]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f5f5f5] text-[#111111] pb-[88px] select-none animate-fade-in">
      {listToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10001] px-4 py-2 rounded-full bg-[#6366f1] text-white text-[11px] font-bold shadow-lg">
          {listToast}
        </div>
      )}
      <header className="flex items-center justify-between px-3 pt-4 pb-2">
        <h1 className="text-[13px] font-bold text-[#111111]">Mes Contacts</h1>
        <button
          onClick={() => navigate('/entendant/contacts/add')}
          className="w-[26px] h-[26px] rounded-full bg-[#6366f1] text-white flex items-center justify-center active:scale-95 cursor-pointer"
          aria-label="Ajouter contact"
        >
          <UserPlus size={14} strokeWidth={2.5} />
        </button>
      </header>

      <div className="mx-3 my-2 h-9 rounded-[8px] bg-[#ffffff] border border-[#e0e0e0] flex items-center px-3 gap-2">
        <Search className="text-[#777777] shrink-0" size={14} strokeWidth={2.25} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un contact..."
          className="flex-1 bg-transparent outline-none text-[10px] text-[#333333] placeholder:text-[#666666] font-semibold"
        />
      </div>

      <section className="px-3 pt-2">
        <h2 className="text-[8px] font-bold text-[#888888] uppercase tracking-[0.6px] mb-2">MES CONTACTS SOURDS</h2>

        <div className="space-y-[5px]">
          {filteredContacts.map((contact) => {
            const liveStatus = getRealtimeStatus(getContactPhone(contact), contact.status);
            return (
            <button
              key={contact.id}
              onClick={() => navigate(`/entendant/contacts/${contact.id}`)}
              className="w-full bg-[#ffffff] hover:bg-[#eeeeee] border border-[#e0e0e0] rounded-[10px] p-[8px_10px] flex items-center gap-2 text-left cursor-pointer transition-colors active:scale-[0.99]"
            >
              <ContactAvatar contact={contact} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold text-[#111111] leading-tight truncate">{contact.name}</div>
                <div className="text-[9px] text-[#777777] font-semibold flex items-center gap-1.5 mt-0.5">
                  <span>{contact.role === 'hearing' ? 'Entendant' : 'Sourd'}</span>
                  <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ backgroundColor: statusColor[liveStatus] || statusColor.offline }} />
                  <span>{statusLabel(liveStatus)}</span>
                </div>
              </div>
              {(() => {
                const callUi = getEntendantCallState(liveStatus);
                return (
                  <span
                    role="button"
                    tabIndex={callUi.disabled ? -1 : 0}
                    className={callUi.className}
                    onClick={(event) => {
                      if (!callUi.disabled) handleCallContact(contact, event);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !callUi.disabled) {
                        handleCallContact(contact, event);
                      }
                    }}
                  >
                    <Phone size={13} strokeWidth={2.5} />
                  </span>
                );
              })()}
            </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function AddContact() {
  const navigate = useNavigate();
  const [newContact, setNewContact] = useState({
    name: '',
    phoneNumber: '',
    role: 'deaf',
    isEmergency: false,
  });
  const [formError, setFormError] = useState('');

  const handleAddContact = () => {
    setFormError('');

    if (!newContact.name || newContact.name.trim().length < 2) {
      setFormError('Le nom doit faire au moins 2 caractères');
      return;
    }
    if (!newContact.phoneNumber || newContact.phoneNumber.replace(/\D/g, '').length < 8) {
      setFormError('Numéro de téléphone invalide (min 8 chiffres)');
      return;
    }

    const cleanPhone = normalizePhoneNumber(
      newContact.phoneNumber.replace(/[^+\d]/g, ''),
    );
    if (!cleanPhone) {
      setFormError('Numéro de téléphone invalide');
      return;
    }

    const contacts = loadStoredContacts();
    const exists = contacts.find((c) => getContactPhone(c) === cleanPhone);
    if (exists) {
      setFormError('Ce numéro existe déjà dans vos contacts');
      return;
    }

    const contact = {
      id: `contact_${Date.now()}`,
      initials: initialsFromName(newContact.name.trim()),
      name: newContact.name.trim(),
      phoneNumber: cleanPhone,
      phone: cleanPhone,
      role: newContact.role === 'hearing' ? 'Entendant' : 'Sourd',
      relation: 'Contact',
      status: 'offline',
      statusLabel: 'Hors ligne',
      email: '',
      city: '',
      since: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      lastCall: '—',
      duration: '—',
      isEmergency: newContact.isEmergency,
      addedAt: new Date().toISOString(),
    };

    const updated = [...contacts, contact];
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));
    console.log('[CONTACT] Added:', contact);
    navigate('/entendant/contacts');
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f5f5f5] text-[#111111] pb-[88px] select-none animate-fade-in">
      <button
        type="button"
        onClick={() => navigate('/entendant/contacts')}
        className="flex items-center gap-1 text-[11px] text-[#6366f1] font-bold px-3.5 py-3"
      >
        <ChevronLeft size={14} strokeWidth={2.5} />
        Contacts
      </button>

      <div className="px-3.5">
        <h1 className="text-[15px] font-extrabold">Ajouter Contact</h1>
        <p className="text-[10px] text-[#777777] font-semibold mt-1">Créer une fiche pour une personne sourde.</p>

        {formError && (
          <p className="mt-3 text-[11px] font-bold text-[#ef4444]">{formError}</p>
        )}

        <div className="mt-4 rounded-[12px] border border-[#e5e5e5] bg-[#fafafa] p-3 space-y-3">
          <label className="block">
            <span className="text-[9px] font-bold text-[#777777] uppercase tracking-[0.5px]">Nom complet</span>
            <input
              value={newContact.name}
              onChange={(e) => setNewContact((prev) => ({ ...prev, name: e.target.value }))}
              className="mt-1 w-full h-10 rounded-[9px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-[11px] outline-none text-[#333333]"
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-bold text-[#777777] uppercase tracking-[0.5px]">Téléphone</span>
            <input
              value={newContact.phoneNumber}
              onChange={(e) => setNewContact((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="+212600000001"
              className="mt-1 w-full h-10 rounded-[9px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-[11px] outline-none text-[#333333]"
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-bold text-[#777777] uppercase tracking-[0.5px]">Rôle</span>
            <select
              value={newContact.role}
              onChange={(e) => setNewContact((prev) => ({ ...prev, role: e.target.value }))}
              className="mt-1 w-full h-10 rounded-[9px] bg-[#ffffff] border border-[#e0e0e0] px-3 text-[11px] outline-none text-[#333333] font-semibold"
            >
              <option value="deaf">Sourd</option>
              <option value="hearing">Entendant</option>
            </select>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newContact.isEmergency}
              onChange={(e) => setNewContact((prev) => ({ ...prev, isEmergency: e.target.checked }))}
              className="rounded border-[#e0e0e0]"
            />
            <span className="text-[10px] font-bold text-[#777777]">Contact SOS</span>
          </label>
        </div>

        <button
          type="button"
          onClick={handleAddContact}
          className="mt-4 w-full h-11 rounded-[12px] bg-[#6366f1] text-white text-[12px] font-extrabold active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Check size={18} strokeWidth={2.5} />
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => navigate('/entendant/contacts')}
          className="mt-2 w-full h-10 rounded-[12px] bg-transparent border border-[#333333] text-[#666666] text-[12px] font-bold active:scale-[0.98]"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 border-b border-[#eeeeee] last:border-b-0">
      <span className="w-7 h-7 rounded-[8px] bg-[#eeeeee] text-[#666666] flex items-center justify-center shrink-0">
        <Icon size={14} strokeWidth={2.25} />
      </span>
      <span className="min-w-0">
        <span className="block text-[9px] text-[#777777] font-bold">{label}</span>
        <span className="block text-[11px] text-[#333333] font-semibold mt-0.5">{value}</span>
      </span>
    </div>
  );
}

function ContactDetail({ contact, onDelete, onToggleFavorite, onShare }) {
  const navigate = useNavigate();
  const { callUser, getRealtimeStatus } = useCallSystemContext();
  const liveStatus = getRealtimeStatus(getContactPhone(contact), contact.status);

  const handleCallContact = () => {
    const targetPhone = getContactPhone(contact);
    if (liveStatus !== 'online') return;
    callUser(targetPhone, contact.name);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f5f5f5] text-[#111111] pb-[88px] select-none animate-fade-in">
      <button
        onClick={() => navigate('/entendant/contacts')}
        className="flex items-center gap-1 text-[11px] text-[#6366f1] font-bold px-3.5 py-3"
      >
        <ChevronLeft size={14} strokeWidth={2.5} />
        Contacts
      </button>

      <section className="bg-[#f0f0f8] px-3.5 pt-5 pb-4 flex flex-col items-center text-center">
        <ContactAvatar contact={contact} size="lg" />
        <h1 className="text-[15px] font-extrabold text-[#111111] mt-3">{contact.name}</h1>
        <p className="text-[10px] text-[#777777] font-semibold mt-1">{contact.role} · {contact.relation}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: statusColor[liveStatus] || statusColor.offline }} />
          <span className="text-[10px] font-bold" style={{ color: statusColor[liveStatus] || statusColor.offline }}>
            {liveStatus === 'online' ? 'En ligne' : liveStatus === 'busy' ? 'Occupé' : 'Hors ligne'}
          </span>
        </div>
      </section>

      <button
        type="button"
        onClick={handleCallContact}
        disabled={liveStatus !== 'online'}
        className="w-[calc(100%-28px)] mx-3.5 mt-3 rounded-[12px] bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed p-[11px] text-white text-[12px] font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <Phone size={14} strokeWidth={2.5} />
        Appeler en LSF
      </button>

      <section className="bg-[#fafafa] border border-[#e5e5e5] rounded-[12px] mx-3.5 mt-[10px] overflow-hidden">
        <DetailRow icon={Phone} label="Téléphone" value={contact.phone} />
        <DetailRow icon={Mail} label="Email" value={contact.email} />
        <DetailRow icon={MapPin} label="Ville" value={contact.city} />
        <DetailRow icon={Calendar} label="Contact depuis" value={contact.since} />
      </section>

      <section className="grid grid-cols-2 gap-1.5 mx-3.5 mt-[10px]">
        {[
          { Icon: History, color: '#666666', label: 'Historique', action: () => navigate('/entendant/historique') },
          { Icon: Star, color: '#fbbf24', label: 'Favoris', action: () => onToggleFavorite?.(contact) },
          { Icon: Share2, color: '#666666', label: 'Partager', action: () => onShare?.(contact) },
          { Icon: Trash2, color: '#ef4444', label: 'Supprimer', action: () => onDelete?.(contact) },
        ].map(({ Icon, color, label, action }) => (
          <button
            type="button"
            key={label}
            onClick={action}
            className={`bg-[#fafafa] border border-[#e5e5e5] rounded-[10px] p-[10px_8px] flex flex-col items-center gap-1.5 text-[9px] font-bold active:scale-[0.98] ${
              label === 'Supprimer' ? 'text-[#ef4444]' : 'text-[#666666]'
            }`}
          >
            <Icon size={18} strokeWidth={2.25} style={{ color }} />
            {label}
          </button>
        ))}
      </section>

      <section className="bg-[#e8f5e9] border border-[#c8e6c9] rounded-[10px] mx-3.5 mt-[10px] mb-3.5 p-[10px_12px] flex items-center gap-3">
        <div className="flex-1">
          <h2 className="text-[8px] font-bold text-[#2d6a3a] uppercase tracking-[0.6px] mb-1">DERNIER APPEL</h2>
          <p className="text-[10px] text-[#4ade80] font-bold">{contact.lastCall}</p>
          <p className="text-[9px] text-[#2d6a3a] font-bold mt-0.5">Durée : {contact.duration}</p>
        </div>
        <PhoneIncoming className="text-[#2d6a3a] shrink-0" size={20} strokeWidth={2.25} />
      </section>
    </div>
  );
}

function useAudioVisualizer(canvasRef, micActive) {
  const rafRef = useRef(null);
  const phaseRef = useRef(0);
  const analyserRef = useRef(null);
  const audioRef = useRef({ context: null, stream: null, data: null });

  useEffect(() => {
    let mounted = true;

    const startAudio = async () => {
      if (!micActive || !navigator.mediaDevices?.getUserMedia) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const context = new AudioContext();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        audioRef.current = {
          context,
          stream,
          data: new Uint8Array(analyser.frequencyBinCount),
        };
      } catch (error) {
        analyserRef.current = null;
      }
    };

    startAudio();

    return () => {
      mounted = false;
      const current = audioRef.current;
      current.stream?.getTracks().forEach((track) => track.stop());
      current.context?.close();
      analyserRef.current = null;
      audioRef.current = { context: null, stream: null, data: null };
    };
  }, [micActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return undefined;

    const draw = () => {
      context.clearRect(0, 0, 160, 160);
      const center = 80;
      const baseRadius = 38;
      const bars = 80;
      phaseRef.current += 0.04;

      if (analyserRef.current && audioRef.current.data) {
        analyserRef.current.getByteFrequencyData(audioRef.current.data);
      }

      context.beginPath();
      context.arc(center, center, 44, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(180,20,20,0.6)';
      context.lineWidth = 1.5;
      context.stroke();

      for (let i = 0; i < bars; i += 1) {
        const audioData = audioRef.current.data;
        const realAmp = audioData ? audioData[i % audioData.length] / 255 : 0;
        const wave = Math.sin(phaseRef.current * 2 + i * 0.22) * 0.16;
        const variance = Math.sin(i * 1.7 + phaseRef.current * 3) * 0.08;
        const simulatedAmp = Math.abs(Math.sin(phaseRef.current)) * 0.55 + 0.08 + wave + variance;
        const amp = Math.max(0.05, Math.min(1, micActive && audioData ? realAmp + 0.08 : simulatedAmp));
        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const length = 4 + amp * 34;
        const x1 = center + Math.cos(angle) * baseRadius;
        const y1 = center + Math.sin(angle) * baseRadius;
        const x2 = center + Math.cos(angle) * (baseRadius + length);
        const y2 = center + Math.sin(angle) * (baseRadius + length);
        const red = Math.round(180 + amp * 75);
        const greenBlue = Math.max(0, Math.round(30 - amp * 30));

        if (amp > 0.55) {
          context.beginPath();
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          context.strokeStyle = 'rgba(255,80,80,0.25)';
          context.lineWidth = 4;
          context.lineCap = 'round';
          context.stroke();
        }

        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.strokeStyle = `rgb(${red}, ${greenBlue}, ${greenBlue})`;
        context.lineWidth = amp > 0.6 ? 2.5 : 1.8;
        context.lineCap = 'round';
        context.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef, micActive]);
}

function CallScreen({ contact }) {
  const navigate = useNavigate();
  const { endCall, activeCall, receivedText, emitVoiceText, canSpeakTurn } = useCallSystemContext();
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const mountedRef = useRef(false);
  const micOnRef = useRef(true);
  const soundOnRef = useRef(true);
  const hpOnRef = useRef(true);
  const lastGloveRef = useRef('');
  const bcRef = useRef(null);
  const [seconds, setSeconds] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [hpOn, setHpOn] = useState(true);
  const [deafSignText, setDeafSignText] = useState('● ● ●');
  const [callToast, setCallToast] = useState(null);
  const [language, setLanguage] = useState('Français');
  const [sessionCode] = useState(() => {
    const code = generateSessionCode();
    storeSessionCode(code);
    return code;
  });
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechStatus, setSpeechStatus] = useState('initialisation');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const speechLang = getSpeechLang(language);

  const showCallToast = (message) => {
    setCallToast(message);
    setTimeout(() => setCallToast(null), 2500);
  };

  const speakSignText = (text) => {
    if (!soundOnRef.current || !text?.trim()) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = hpOnRef.current ? 1.0 : 0.3;
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en'));
    if (enVoice) utterance.voice = enVoice;
    window.speechSynthesis.speak(utterance);
  };

  const onSignReceived = (text) => {
    const cleaned = (text || '').replace(/^🤟\s*/, '').trim();
    if (!cleaned || cleaned === lastGloveRef.current) return;
    lastGloveRef.current = cleaned;
    setDeafSignText(cleaned);
    speakSignText(cleaned);
  };

  useEffect(() => {
    if (receivedText?.trim()) {
      onSignReceived(receivedText);
    }
  }, [receivedText]);

  useAudioVisualizer(canvasRef, micOn);

  useEffect(() => {
    mountedRef.current = true;
    const uid = getClientUid('hearing');
    registerNotificationPreference(uid).catch(() => {});
    createRealtimeCall({
      code: sessionCode,
      callerUid: uid,
      callerName: 'Personne entendante',
      lang: speechLang,
    })
      .then(() => {
        showLocalIncomingNotification({ code: sessionCode, callerName: 'Personne entendante' });
      })
      .catch(() => setSpeechStatus('firebase indisponible'));

    const reminder = setInterval(async () => {
      try {
        const call = await getFirebaseData(`calls/${sessionCode}`);
        if (call?.status === 'ringing') {
          await pushFirebaseData('notifications/deaf_user', {
            code: sessionCode,
            callerName: 'Personne entendante',
            timestamp: Date.now(),
            status: 'pending',
          });
          showLocalIncomingNotification({ code: sessionCode, callerName: 'Personne entendante' });
        }
      } catch {
        // Network may be unavailable; speech/transcript flow keeps retrying independently.
      }
    }, 30000);

    try {
      bcRef.current = new BroadcastChannel(sessionCode);
      bcRef.current.onmessage = (e) => {
        const msg = e.data;
        if (msg?.type === 'SIGN_TEXT') onSignReceived(msg.text);
      };
    } catch {
      /* BroadcastChannel unavailable */
    }

    const stopSession = listenFirebaseValue(`sessions/${sessionCode}`, (data) => {
      if (data?.glove?.text) onSignReceived(data.glove.text);
    });

    return () => {
      mountedRef.current = false;
      clearInterval(reminder);
      stopSession();
      if (bcRef.current) {
        bcRef.current.close();
        bcRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      endRealtimeCall(sessionCode).catch(() => {});
    };
  }, [sessionCode]);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatus('non supporté');
      return undefined;
    }

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = activeCall?.withPhone ? 'en-US' : speechLang;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      micOnRef.current = true;
      setMicOn(true);
      setSpeechStatus('écoute active');
    };

    recognition.onerror = () => {
      setSpeechStatus('reconnexion');
    };

    recognition.onend = () => {
      if (!micOnRef.current) {
        setSpeechStatus('micro coupé');
        return;
      }
      if (mountedRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch {
            setSpeechStatus('en attente micro');
          }
        }, 700);
      }
    };

    recognition.onresult = (event) => {
      if (!micOnRef.current) return;
      let interim = '';
      let finalChunk = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript || '';
        if (result.isFinal) {
          finalChunk += text;
        } else {
          interim += text;
        }
      }

      if (finalChunk.trim()) {
        const nextFinal = `${finalTranscriptRef.current} ${finalChunk}`.trim();
        finalTranscriptRef.current = nextFinal;
        setFinalTranscript(nextFinal);
        setInterimTranscript('');
        if (activeCall?.withPhone && canSpeakTurn) {
          emitVoiceText(finalChunk.trim());
        }
        sendTranscript({
          code: sessionCode,
          text: nextFinal,
          isFinal: true,
          lang: speechLang,
        }).catch(() => setSpeechStatus('firebase indisponible'));
      } else if (interim.trim()) {
        setInterimTranscript(interim);
        sendTranscript({
          code: sessionCode,
          text: `${finalTranscriptRef.current} ${interim}`.trim(),
          isFinal: false,
          lang: speechLang,
        }).catch(() => setSpeechStatus('firebase indisponible'));
      }
    };

    try {
      recognition.start();
    } catch {
      setSpeechStatus('en attente micro');
    }

    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, [speechLang, sessionCode, activeCall, emitVoiceText, canSpeakTurn]);

  const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const previewText = `${finalTranscript} ${interimTranscript}`.trim();

  const postBc = (payload) => {
    if (bcRef.current) bcRef.current.postMessage(payload);
  };

  const toggleMicro = () => {
    if (micOn) {
      micOnRef.current = false;
      setMicOn(false);
      setSpeechStatus('micro coupé');
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      postBc({ type: 'MIC_OFF', role: 'hearing', timestamp: new Date().toISOString() });
    } else {
      micOnRef.current = true;
      setMicOn(true);
      setSpeechStatus('écoute active');
      try {
        recognitionRef.current?.start();
      } catch {
        setSpeechStatus('en attente micro');
      }
      postBc({ type: 'MIC_ON', role: 'hearing', timestamp: new Date().toISOString() });
    }
  };

  const toggleMuteSound = () => {
    const next = !soundOn;
    soundOnRef.current = next;
    setSoundOn(next);
    if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      showCallToast('🔇 Son coupé');
    } else if (next) {
      showCallToast('🔊 Son activé');
    }
  };

  const toggleHp = () => {
    const next = !hpOn;
    hpOnRef.current = next;
    setHpOn(next);
  };

  const finishCall = () => {
    if (!window.confirm('Terminer la session ?\n\nLa conversation sera sauvegardée.')) return;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    postBc({ type: 'SESSION_END', role: 'hearing', timestamp: new Date().toISOString() });
    endRealtimeCall(sessionCode).catch(() => {});
    endCall();
    setShowSaveDialog(true);
  };

  const closeCall = (shouldSave) => {
    if (shouldSave) {
      const savedSessions = localStorage.getItem('sessions') ? JSON.parse(localStorage.getItem('sessions')) : [];
      savedSessions.unshift({
        id: 'hearing_session_' + Date.now(),
        contactId: contact.id,
        contactName: contact.name,
        date: new Date().toLocaleDateString('fr-FR'),
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        duration: seconds,
        transcriptExcerpt: previewText || 'Appel sans transcription',
        fullTranscript: [{ sender: 'Moi', text: previewText, time }],
      });
      localStorage.setItem('sessions', JSON.stringify(savedSessions));
    }
    setShowSaveDialog(false);
    navigate(`/entendant/contacts/${contact.id}`);
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] bg-[#f5f5f5] text-[#111111] max-w-md mx-auto flex flex-col overflow-hidden select-none animate-fade-in h-[calc(100dvh-80px)]">
      {callToast && (
        <div className="fixed left-1/2 z-[10001] -translate-x-1/2 bottom-24 rounded-full bg-[#6366f1] text-white text-[12px] font-semibold px-4 py-2 shadow-lg">
          {callToast}
        </div>
      )}
      <SessionTopBar
        title={contact.name}
        subtitle="Appel en cours"
        onBack={finishCall}
        backLabel="Quitter l'appel"
      />

      <section className="bg-[#f5f0ff] border-b border-[#d1c4e9] p-[10px_14px] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-[22px] h-[22px] rounded-[6px] bg-[#ede7f6] text-[#a78bfa] flex items-center justify-center">
              <Hand size={14} strokeWidth={2.25} />
            </span>
            <span className="text-[8px] font-bold text-[#a78bfa] uppercase tracking-[0.6px]">LSF — GANTS EN DIRECT</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-[#6366f1] animate-blink-1" />
            <span className="w-1 h-1 rounded-full bg-[#6366f1] animate-blink-2" />
            <span className="w-1 h-1 rounded-full bg-[#6366f1] animate-blink-3" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="flex items-center gap-2 text-[9px] font-bold text-[#777777]">
            Langue
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="h-7 rounded-[7px] bg-[#ffffff] border border-[#e5e5e5] px-2 text-[10px] font-bold text-[#333333] outline-none"
            >
              <option>Français</option>
              <option>Arabe</option>
              <option>Anglais</option>
              <option>Darija</option>
            </select>
          </label>
          <div className="text-center">
            <div className="text-[9px] text-[#777777] font-bold leading-none">Code session</div>
            <div className="text-[20px] text-[#6366f1] font-extrabold leading-tight">{sessionCode}</div>
          </div>
        </div>

        <div className="bg-[#ede7f6] border border-[#d1c4e9] rounded-[8px] px-3 py-1.5 mb-2 text-[11px] font-semibold text-[#333333] min-h-[28px]">
          <span className="text-[#818cf8]">🤟 </span>
          {deafSignText}
        </div>

        <div
          className={`border rounded-[8px] px-3 py-2 text-[11px] font-semibold leading-relaxed max-h-[60px] overflow-y-auto ${
            micOn ? 'bg-[#f3e5f5] border-[#b39ddb]' : 'bg-[#eeeeee] border-[#dddddd] opacity-80'
          }`}
        >
          {!micOn ? (
            <span className="text-[#555555] text-[11px]">🔇 Micro coupé</span>
          ) : previewText ? (
            <>
              <span className="text-[#333333]">{finalTranscript}</span>
              {interimTranscript && <span className="text-[#666666] italic"> {interimTranscript}</span>}
            </>
          ) : (
            <span className="text-[#666666] italic">Reconnaissance vocale en cours...</span>
          )}
          <div className="mt-1 text-[8px] font-bold text-[#777777] uppercase">{speechStatus}</div>
        </div>
      </section>

      <section className="flex-1 min-h-0 flex flex-col items-center justify-center gap-[10px] px-4">
        <div className="relative w-[160px] h-[160px]">
          <canvas ref={canvasRef} width="160" height="160" className="absolute inset-0 w-[160px] h-[160px]" />
          <div className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-[#e8f5e9] border-[3px] border-[#c8e6c9] text-[#4ade80] flex items-center justify-center text-[24px] font-extrabold">
            {contact.initials}
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-[16px] font-extrabold">{contact.name}</h1>
          <p className="text-[11px] text-[#4ade80] font-bold mt-1">Signe en LSF</p>
          <p className="text-[13px] text-[#888888] font-black mt-1">{time}</p>
        </div>
      </section>

      <ZoneDActionBar
        variant="hearingCall"
        micOn={micOn}
        soundOn={soundOn}
        hpOn={hpOn}
        onMicro={toggleMicro}
        onMute={toggleMuteSound}
        onHp={toggleHp}
        onEnd={finishCall}
      />

      {showSaveDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
          <div className="w-full max-w-[300px] rounded-[18px] border border-[#e5e5e5] bg-white p-5 text-center shadow-2xl">
            <h3 className="text-[14px] font-extrabold text-[#111111]">Sauvegarder la conversation ?</h3>
            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-[#777777]">
              Le transcript, la durée et la date seront ajoutés à l'historique local.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => closeCall(false)}
                className="h-10 flex-1 rounded-[12px] bg-[#e5e5e5] text-[12px] font-extrabold text-[#333333] active:scale-95 flex items-center justify-center gap-1"
              >
                <X size={14} strokeWidth={2.5} />
                Ignorer
              </button>
              <button
                type="button"
                onClick={() => closeCall(true)}
                className="h-10 flex-1 rounded-[12px] bg-[#16a34a] text-[12px] font-extrabold text-white active:scale-95 flex items-center justify-center gap-1"
              >
                <Check size={14} strokeWidth={2.5} />
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EntendantContacts() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [contacts, setContacts] = useState(loadStoredContacts);
  const [toast, setToast] = useState(null);
  const contact = getContact(id, contacts);

  const persistContacts = (next) => {
    setContacts(next);
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(next));
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleDeleteContact = (c) => {
    if (!window.confirm(`Supprimer ${c.name} ?`)) return;
    persistContacts(contacts.filter((x) => x.id !== c.id));
    showToast('Contact supprimé');
    navigate('/entendant/contacts');
  };

  const handleToggleFavorite = (c) => {
    persistContacts(
      contacts.map((x) => (x.id === c.id ? { ...x, isFavorite: !x.isFavorite } : x)),
    );
    showToast(c.isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris');
  };

  const handleShareContact = (c) => {
    const text = `${c.name}\n${getContactPhone(c)}`;
    navigator.clipboard.writeText(text);
    showToast('Coordonnées copiées');
  };

  if (location.pathname.endsWith('/add')) {
    return <AddContact />;
  }

  if (location.pathname.startsWith('/entendant/call/')) {
    return <CallScreen contact={contact} />;
  }

  if (id) {
    return (
      <>
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10001] px-4 py-2 rounded-full bg-[#6366f1] text-white text-[11px] font-bold shadow-lg">
            {toast}
          </div>
        )}
        <ContactDetail
          contact={contact}
          onDelete={handleDeleteContact}
          onToggleFavorite={handleToggleFavorite}
          onShare={handleShareContact}
        />
      </>
    );
  }

  return <ContactList />;
}
