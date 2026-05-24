import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Phone,
  History,
  Star,
  AlertTriangle,
  Share2,
  Ban,
  Trash2,
  MicOff,
  Mic,
  Clipboard,
  PhoneOff,
  ArrowLeft,
  X,
  Check,
  Shield,
  User,
  Heart,
  Hand,
  UserRound,
  RefreshCw,
  Save,
  PhoneIncoming,
  LogIn,
  Camera,
} from 'lucide-react';
import ZoneDActionBar from '../components/ZoneDActionBar';
import SessionTopBar from '../components/SessionTopBar';
import { useCallSystemContext } from '../context/CallSystemContext';
import { useImmersiveSession } from '../context/ImmersiveSessionContext';
import { getContactCallState } from '../lib/contactCallUi';
import { getContactPhone } from '../lib/phoneUtils';
import {
  endRealtimeCall,
  getClientUid,
  getStoredSessionCode,
  joinRealtimeCall,
  listenFirebaseValue,
  registerNotificationPreference,
  showLocalIncomingNotification,
  storeSessionCode,
} from '../lib/firebaseRealtime';

// Default mock contacts to populate Firestore initially
const DEFAULT_CONTACTS = [
  {
    id: 'c1',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '06 12 34 56 78',
    email: 'jean.dupont@sourdconnect.fr',
    role: 'Sourd',
    isEmergencyContact: true,
    isFavorite: true,
    isBlocked: false,
    status: 'online',
    relationType: 'Ami proche',
    photoUrl: null
  },
  {
    id: 'c2',
    firstName: 'Martin',
    lastName: 'Lefebvre',
    phone: '01 45 67 89 00',
    email: 'dr.martin@hopital-lsf.fr',
    role: 'Médecin',
    isEmergencyContact: true,
    isFavorite: false,
    isBlocked: false,
    status: 'busy',
    relationType: 'Médecin traitant',
    photoUrl: null
  },
  {
    id: 'c3',
    firstName: 'Amina',
    lastName: 'Benali',
    phone: '07 61 22 09 33',
    email: 'amina.benali@lsf-pro.fr',
    role: 'Sourd',
    isEmergencyContact: true,
    isFavorite: false,
    isBlocked: false,
    status: 'online',
    relationType: 'Interprète LSF',
    photoUrl: null
  },
  {
    id: 'c4',
    firstName: 'Sophie',
    lastName: 'Laurent',
    phone: '06 98 76 54 32',
    email: 'sophie.laurent@hearing.com',
    role: 'Entendant',
    isEmergencyContact: false,
    isFavorite: true,
    isBlocked: false,
    status: 'offline',
    relationType: 'Sœur',
    photoUrl: null
  },
  {
    id: 'c5',
    firstName: 'Lucas',
    lastName: 'Moreau',
    phone: '06 55 43 21 10',
    email: 'lucas.moreau@gmail.com',
    role: 'Entendant',
    isEmergencyContact: false,
    isFavorite: false,
    isBlocked: false,
    status: 'online',
    relationType: 'Collègue',
    photoUrl: null
  },
  {
    id: 'c6',
    firstName: 'Fatou',
    lastName: 'Diallo',
    phone: '06 77 88 99 00',
    email: 'fatou.diallo@edu.fr',
    role: 'Sourd',
    isEmergencyContact: false,
    isFavorite: true,
    isBlocked: false,
    status: 'busy',
    relationType: 'Amie',
    photoUrl: null
  },
  {
    id: 'c7',
    firstName: 'Pierre',
    lastName: 'Fontaine',
    phone: '01 23 45 67 89',
    email: 'p.fontaine@hopital.fr',
    role: 'Médecin',
    isEmergencyContact: false,
    isFavorite: false,
    isBlocked: false,
    status: 'offline',
    relationType: 'Spécialiste ORL',
    photoUrl: null
  },
  {
    id: 'c8',
    firstName: 'Nadia',
    lastName: 'Khelil',
    phone: '06 44 55 66 77',
    email: 'nadia.k@outlook.com',
    role: 'Autre',
    isEmergencyContact: false,
    isFavorite: false,
    isBlocked: false,
    status: 'online',
    relationType: 'Voisine',
    photoUrl: null
  }
];

export default function Contacts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { setImmersiveSession } = useImmersiveSession();
  const {
    callUser,
    getRealtimeStatus,
    activeCall,
    endCall,
    sendSignText,
    receivedText,
    canSpeakTurn,
  } = useCallSystemContext();

  // Determine current screen from URL
  let screen = 'list';
  if (location.pathname === '/contacts/add') {
    screen = 'add';
  } else if (location.pathname.startsWith('/contacts/')) {
    screen = 'detail';
  } else if (location.pathname.startsWith('/call/')) {
    screen = 'call';
  }

  // State
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Form State (Screen 2)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Entendant');
  const [isSOS, setIsSOS] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [relationType, setRelationType] = useState('Famille');
  const [photoInitials, setPhotoInitials] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState(null);

  // Call Screen State (Screen 4)
  const [callActive, setCallActive] = useState(false);
  const [microActive, setMicroActive] = useState(true);
  const [interlocuteurDit, setInterlocuteurDit] = useState('');
  const [vosSignes, setVosSignes] = useState('🤟 Gant connecté. En attente...');
  const [signingActive, setSigningActive] = useState(false);
  const [pulseGlove, setPulseGlove] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarMode, setAvatarMode] = useState('alex'); // alex or frizitta
  const [transcriptHistory, setTranscriptHistory] = useState([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [alexSkippedWords, setAlexSkippedWords] = useState([]);
  const [sessionCodeInput, setSessionCodeInput] = useState('');
  const [activeSessionCode, setActiveSessionCode] = useState('');
  const [remoteTranscript, setRemoteTranscript] = useState({ text: '', isFinal: true, lang: 'fr-FR' });
  const [remoteStatus, setRemoteStatus] = useState('idle');
  const [realtimeConnection, setRealtimeConnection] = useState('idle');
  const [incomingCall, setIncomingCall] = useState(null);

  // Database refs
  const [frizittaDb, setFrizittaDb] = useState(null);
  const [alexDb, setAlexDb] = useState(null);
  const [currentLetterUrl, setCurrentLetterUrl] = useState('');
  const [currentLetter, setCurrentLetter] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [currentAlexWord, setCurrentAlexWord] = useState('');
  const [activeVideo, setActiveVideo] = useState('A');

  // Video and loops refs
  const videoARef = useRef(null);
  const videoBRef = useRef(null);
  const callTimerRef = useRef(null);
  const simGloveIntervalRef = useRef(null);
  const simVoiceIntervalRef = useRef(null);
  const frizittaPlaybackRef = useRef({ index: 0, sequence: [], timer: null, active: false });
  const alexPlaybackRef = useRef({ index: 0, sequence: [], activeVideo: 'A', active: false });
  const lastRemoteTextRef = useRef('');

  // Load contacts database — always reinitialize from DEFAULT if missing/empty
  useEffect(() => {
    try {
      const saved = localStorage.getItem('contacts');
      const version = localStorage.getItem('contacts_version');
      // Force reset if no version flag (first run or manual clear)
      if (version === 'v1' && saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setContacts(parsed);
          return;
        }
      }
    } catch (e) {
      console.error("Error loading contacts from localStorage:", e);
    }
    // Reset with rich default contacts
    localStorage.setItem('contacts', JSON.stringify(DEFAULT_CONTACTS));
    localStorage.setItem('contacts_version', 'v1');
    setContacts(DEFAULT_CONTACTS);
  }, []);

  useEffect(() => {
    const uid = getClientUid('deaf');
    registerNotificationPreference(uid).catch(() => {});
  }, []);

  useEffect(() => {
    let lastNotifiedCode = '';
    const stopListening = listenFirebaseValue('calls', (calls) => {
      if (!calls || typeof calls !== 'object') return;
      const ringing = Object.entries(calls)
        .filter(([, call]) => call?.status === 'ringing')
        .map(([code, call]) => ({ code, ...call }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

      if (!ringing || ringing.code === activeSessionCode) return;
      setIncomingCall(ringing);
      if (ringing.code !== lastNotifiedCode) {
        lastNotifiedCode = ringing.code;
        showLocalIncomingNotification({ code: ringing.code, callerName: ringing.callerName || 'Personne entendante' });
      }
    });

    return stopListening;
  }, [activeSessionCode]);

  useEffect(() => {
    if (!incomingCall) return undefined;
    const timer = setTimeout(() => setIncomingCall(null), 30000);
    return () => clearTimeout(timer);
  }, [incomingCall]);

  // Parse Frizitta and Alex database files for calling screen
  useEffect(() => {
    Promise.all([
      fetch('/FRIZITTA_DB.txt').then(r => r.text()),
      fetch('/ALEX_DB.txt').then(r => r.text())
    ])
      .then(([frizittaText, alexText]) => {
        // Parse Frizitta
        const fLines = frizittaText.split('\n');
        const fDb = {};
        fLines.forEach(line => {
          if (!line.includes('|')) return;
          const parts = line.split('|');
          const nomPart = parts[0].replace('Nom :', '').trim();
          const urlPart = parts[1].replace('URL :', '').trim();
          const underscoreIndex = nomPart.indexOf('_');
          if (underscoreIndex === -1) return;
          let char = nomPart.substring(0, underscoreIndex).toUpperCase();
          fDb[char] = urlPart;
        });
        setFrizittaDb(fDb);

        // Parse Alex
        const aLines = alexText.split('\n');
        const aDb = [];
        aLines.forEach(line => {
          if (!line.includes('|')) return;
          const parts = line.split('|');
          let original = '';
          let synonymes = [];
          let url = '';
          parts.forEach(part => {
            if (part.includes('Nom Original :')) {
              original = part.replace('Nom Original :', '').trim();
            } else if (part.includes('Synonymes :')) {
              const synStr = part.replace('Synonymes :', '').trim();
              synonymes = synStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
            } else if (part.includes('URL :')) {
              url = part.replace('URL :', '').trim();
            }
          });
          if (original && url) {
            aDb.push({ original, synonymes, url });
          }
        });
        setAlexDb(aDb);
      })
      .catch(err => console.error("Erreur chargement bases de données appel", err));
  }, []);

  // Simulate Firestore Real-time listener for contact status updates
  useEffect(() => {
    if (screen !== 'list') return;

    const interval = setInterval(() => {
      setContacts(prev => {
        const statuses = ['online', 'busy', 'offline'];
        const updated = prev.map(c => {
          // 25% chance of changing status
          if (Math.random() < 0.25) {
            const currentIdx = statuses.indexOf(c.status);
            const nextIdx = (currentIdx + Math.floor(Math.random() * 2) + 1) % 3;
            return { ...c, status: statuses[nextIdx] };
          }
          return c;
        });
        localStorage.setItem('contacts', JSON.stringify(updated));
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [screen]);

  // Toast notifier
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // Helper functions
  const saveToFirestore = (updatedList) => {
    localStorage.setItem('contacts', JSON.stringify(updatedList));
    setContacts(updatedList);
  };

  // Add Contact action
  const handleAddContact = (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      showToast("⚠️ Prénom et Nom obligatoires !");
      return;
    }

    const newContact = {
      id: 'c_' + Date.now(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || 'Non renseigné',
      email: email.trim() || 'Non renseigné',
      role,
      isEmergencyContact: isSOS,
      isFavorite: isFav,
      isBlocked: false,
      status: 'offline',
      relationType: relationType || 'Autre',
      photoUrl: photoDataUrl
    };

    const updated = [newContact, ...contacts];
    saveToFirestore(updated);
    showToast("✅ Contact enregistré !");
    
    // Reset Form
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setRole('Entendant');
    setIsSOS(false);
    setIsFav(false);
    setRelationType('Famille');
    setPhotoDataUrl(null);

    setTimeout(() => {
      navigate('/contacts');
    }, 300);
  };

  // Get active contact
  const activeContact = contacts.find(c => c.id === id);

  const handleCallContact = useCallback(
    (contact) => {
      if (!contact || contact.isBlocked) {
        showToast("⚠️ Impossible d'appeler ce contact");
        return;
      }
      const targetPhone = getContactPhone(contact);
      const status = getRealtimeStatus(targetPhone, contact.status);
      if (status !== 'online') {
        showToast(`📵 ${contact.firstName} ${contact.lastName} est ${status === 'busy' ? 'occupé' : 'hors ligne'}`);
        return;
      }
      callUser(targetPhone, `${contact.firstName} ${contact.lastName}`.trim());
    },
    [callUser, getRealtimeStatus],
  );

  useEffect(() => {
    if (!activeCall?.withPhone) return;
    const phone = getContactPhone({ phone: activeCall.withPhone });
    const contact = contacts.find((c) => getContactPhone(c) === phone);
    if (contact && screen !== 'call') {
      navigate(`/call/${contact.id}`);
    }
  }, [activeCall, contacts, screen, navigate]);

  useEffect(() => {
    setImmersiveSession(false);
    return () => setImmersiveSession(false);
  }, [screen, setImmersiveSession]);

  // Toggle emergency contact status
  const handleToggleSOS = (contactId) => {
    const updated = contacts.map(c => {
      if (c.id === contactId) {
        const nextSOS = !c.isEmergencyContact;
        showToast(nextSOS ? "🚨 Ajouté aux contacts d'urgence (SOS)" : "ℹ️ Retiré des contacts d'urgence");
        return { ...c, isEmergencyContact: nextSOS };
      }
      return c;
    });
    saveToFirestore(updated);
  };

  // Toggle favorite status
  const handleToggleFav = (contactId) => {
    const updated = contacts.map(c => {
      if (c.id === contactId) {
        const nextFav = !c.isFavorite;
        showToast(nextFav ? "⭐ Ajouté aux favoris" : "ℹ️ Retiré des favoris");
        return { ...c, isFavorite: nextFav };
      }
      return c;
    });
    saveToFirestore(updated);
  };

  // Toggle block status
  const handleToggleBlock = (contactId) => {
    const updated = contacts.map(c => {
      if (c.id === contactId) {
        const nextBlocked = !c.isBlocked;
        showToast(nextBlocked ? "🚫 Contact bloqué" : "✅ Contact débloqué");
        return { ...c, isBlocked: nextBlocked };
      }
      return c;
    });
    saveToFirestore(updated);
  };

  // Delete contact
  const handleDeleteContact = (contactId) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce contact ?")) {
      const updated = contacts.filter(c => c.id !== contactId);
      saveToFirestore(updated);
      showToast("🗑️ Contact supprimé");
      navigate('/contacts');
    }
  };

  // Search filter
  const filteredEmergency = contacts.filter(c => 
    c.isEmergencyContact && 
    !c.isBlocked &&
    (c.firstName + ' ' + c.lastName).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNormal = contacts.filter(c => 
    !c.isBlocked &&
    !c.isEmergencyContact &&
    (c.firstName + ' ' + c.lastName).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Avatar Processing routines for Calling Screen (copied from Rencontre for high-fidelity)
  function processFrizitta(text) {
    if (!frizittaDb) return [];
    const normalized = text.toUpperCase();
    const words = normalized.split(' ').filter(w => w.length > 0);
    const sequence = [];
    
    words.forEach((word, index) => {
      word.split('').forEach((char, charIdx) => {
        if (frizittaDb[char]) {
          sequence.push({ 
            type: 'letter', 
            url: frizittaDb[char], 
            char: char,
            word: word
          });
        }
      });
      if (index < words.length - 1) {
        sequence.push({ type: 'neutral', url: frizittaDb['NEUTRE'] || '' });
      }
    });
    sequence.push({ type: 'neutral', url: frizittaDb['NEUTRE'] || '' });
    return sequence;
  }

  const startFrizittaPlayback = (sequence) => {
    stopFrizittaPlayback();
    frizittaPlaybackRef.current.sequence = sequence;
    frizittaPlaybackRef.current.index = 0;
    frizittaPlaybackRef.current.active = true;
    
    const play = () => {
      if (!frizittaPlaybackRef.current.active) return;
      const idx = frizittaPlaybackRef.current.index;
      const seq = frizittaPlaybackRef.current.sequence;
      if (idx >= seq.length) {
        setCurrentLetterUrl(frizittaDb['NEUTRE'] || '');
        setCurrentLetter('');
        setCurrentWord('');
        return;
      }
      const item = seq[idx];
      setCurrentLetterUrl(item.url);
      if (item.type === 'letter') {
        setCurrentLetter(item.char);
        setCurrentWord(item.word);
      } else {
        setCurrentLetter('');
        setCurrentWord('');
      }
      const duration = item.type === 'neutral' ? 300 : 600;
      frizittaPlaybackRef.current.timer = setTimeout(() => {
        frizittaPlaybackRef.current.index++;
        play();
      }, duration);
    };
    play();
  };

  const stopFrizittaPlayback = () => {
    frizittaPlaybackRef.current.active = false;
    if (frizittaPlaybackRef.current.timer) clearTimeout(frizittaPlaybackRef.current.timer);
    setCurrentLetter('');
    setCurrentWord('');
    setCurrentLetterUrl(frizittaDb ? frizittaDb['NEUTRE'] || '' : '');
  };

  function findInAlex(word) {
    if (!alexDb) return null;
    const w = word.toLowerCase().trim();
    let entry = alexDb.find(e => e.original.toLowerCase() === w);
    if (entry) return entry.url;
    entry = alexDb.find(e => e.synonymes.some(s => s.toLowerCase() === w));
    if (entry) return entry.url;
    return null;
  }

  function processAlex(text) {
    const words = text.toLowerCase().trim().split(' ').filter(w => w.length > 0);
    const sequence = [];
    const skipped = [];
    let i = 0;
    while (i < words.length) {
      if (i + 1 < words.length) {
        const twoWords = words[i] + ' ' + words[i+1];
        const compound = alexDb.find(e => e.original.toLowerCase().replace(/-|_/g, ' ') === twoWords);
        if (compound) {
          sequence.push({ url: compound.url, word: twoWords });
          i += 2;
          continue;
        }
      }
      const url = findInAlex(words[i]);
      if (url) {
        sequence.push({ url: url, word: words[i] });
      } else {
        skipped.push(words[i]);
      }
      i++;
    }
    return { sequence, skipped };
  }

  const startAlexPlayback = (sequence) => {
    stopAlexPlayback();
    const videoA = videoARef.current;
    const videoB = videoBRef.current;
    if (!videoA || !videoB) return;
    
    alexPlaybackRef.current.sequence = sequence;
    alexPlaybackRef.current.index = 0;
    alexPlaybackRef.current.activeVideo = 'A';
    alexPlaybackRef.current.active = true;
    
    const playNextAlex = () => {
      if (!alexPlaybackRef.current.active) return;
      const seqIndex = alexPlaybackRef.current.index;
      const seq = alexPlaybackRef.current.sequence;
      if (seqIndex >= seq.length) {
        setCurrentAlexWord('');
        return;
      }
      
      const currentVideoId = alexPlaybackRef.current.activeVideo;
      const currentVideo = currentVideoId === 'A' ? videoA : videoB;
      const nextVideo = currentVideoId === 'A' ? videoB : videoA;
      
      const currentItem = seq[seqIndex];
      setCurrentAlexWord(currentItem.word.toUpperCase());
      
      if (seqIndex + 1 < seq.length) {
        nextVideo.src = seq[seqIndex + 1].url;
        nextVideo.load();
      }
      
      currentVideo.ontimeupdate = () => {
        if (currentVideo.duration - currentVideo.currentTime < 0.1) {
          currentVideo.ontimeupdate = null;
          alexPlaybackRef.current.index++;
          if (alexPlaybackRef.current.index < seq.length) {
            nextVideo.style.opacity = '1';
            nextVideo.style.zIndex = '2';
            currentVideo.style.opacity = '0';
            currentVideo.style.zIndex = '1';
            nextVideo.play();
            
            const nextActiveId = currentVideoId === 'A' ? 'B' : 'A';
            alexPlaybackRef.current.activeVideo = nextActiveId;
            setActiveVideo(nextActiveId);
            playNextAlex();
          } else {
            setCurrentAlexWord('');
          }
        }
      };
      
      currentVideo.src = currentItem.url;
      currentVideo.play();
    };
    playNextAlex();
  };

  const stopAlexPlayback = () => {
    alexPlaybackRef.current.active = false;
    setCurrentAlexWord('');
    if (videoARef.current) {
      videoARef.current.pause();
      videoARef.current.ontimeupdate = null;
      videoARef.current.src = '';
    }
    if (videoBRef.current) {
      videoBRef.current.pause();
      videoBRef.current.ontimeupdate = null;
      videoBRef.current.src = '';
    }
  };

  const launchCall = () => {
    if (activeContact) handleCallContact(activeContact);
  };

  const joinSessionByCode = async (rawCode) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;
    setRealtimeConnection('reconnecting');
    try {
      await joinRealtimeCall({ code, uid: getClientUid('deaf') });
      storeSessionCode(code);
      setActiveSessionCode(code);
      setSessionCodeInput(code);
      setIncomingCall(null);
      setRealtimeConnection('connected');
      showToast(`Session ${code} connectee`);
    } catch {
      setRealtimeConnection('lost');
      showToast('Connexion Firebase impossible');
    }
  };

  // Setup Call Intervals and Timers on Call Start
  useEffect(() => {
    if (screen !== 'call' || !activeContact) return;

    // Reset states
    setCallActive(true);
    setCallDuration(0);
    setTranscriptHistory([]);
    setInterlocuteurDit('');
    setVosSignes('🤟 Gant connecté. En attente...');
    setRemoteTranscript({ text: '', isFinal: true, lang: 'fr-FR' });
    setRemoteStatus('idle');
    setRealtimeConnection('idle');
    lastRemoteTextRef.current = '';

    const codeFromUrl = new URLSearchParams(location.search).get('code');
    const storedCode = codeFromUrl || getStoredSessionCode();
    if (storedCode) {
      setSessionCodeInput(storedCode);
      joinSessionByCode(storedCode);
    }

    // Call duration timer
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(callTimerRef.current);
      if (simGloveIntervalRef.current) clearInterval(simGloveIntervalRef.current);
      if (simVoiceIntervalRef.current) clearInterval(simVoiceIntervalRef.current);
      stopFrizittaPlayback();
      stopAlexPlayback();
    };
  }, [screen, activeContact?.id, location.search]);

  useEffect(() => {
    if (screen !== 'call' || !activeSessionCode) return undefined;

    const stopTranscript = listenFirebaseValue(`sessions/${activeSessionCode}/transcript`, (transcript) => {
      if (!transcript || typeof transcript !== 'object') return;
      const text = transcript.text || '';
      setRemoteTranscript(transcript);
      setInterlocuteurDit(text);
      setIsSpeaking(!transcript.isFinal);

      if (transcript.isFinal && text && text !== lastRemoteTextRef.current) {
        const previous = lastRemoteTextRef.current;
        const newText = previous && text.startsWith(previous)
          ? text.slice(previous.length).trim()
          : text;
        lastRemoteTextRef.current = text;

        if (newText) {
          if (avatarMode === 'frizitta') {
            const seq = processFrizitta(newText);
            if (seq.length > 0) startFrizittaPlayback(seq);
          } else {
            const { sequence, skipped } = processAlex(newText);
            setAlexSkippedWords(skipped);
            if (sequence.length > 0) startAlexPlayback(sequence);
          }

          setTranscriptHistory(prev => [...prev, {
            id: 'remote_' + Date.now(),
            sender: 'contact',
            text: newText,
            timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      }
    }, setRealtimeConnection);

    const stopStatus = listenFirebaseValue(`sessions/${activeSessionCode}/status`, (status) => {
      if (!status) return;
      setRemoteStatus(status);
      if (status === 'speaking') setIsSpeaking(true);
      if (status === 'idle') setIsSpeaking(false);
      if (status === 'ended') {
        setIsSpeaking(false);
        setShowSaveDialog(true);
      }
    }, setRealtimeConnection);

    return () => {
      stopTranscript();
      stopStatus();
    };
  }, [screen, activeSessionCode, avatarMode]);

  const processIncomingVoiceText = useCallback((text) => {
    const cleaned = (text || '').trim();
    if (!cleaned) return;
    setInterlocuteurDit(cleaned);
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 2000);

    if (avatarMode === 'frizitta') {
      const seq = processFrizitta(cleaned);
      if (seq.length > 0) startFrizittaPlayback(seq);
    } else {
      const { sequence, skipped } = processAlex(cleaned);
      setAlexSkippedWords(skipped);
      if (sequence.length > 0) startAlexPlayback(sequence);
    }

    setTranscriptHistory((prev) => [
      ...prev,
      {
        id: `remote_${Date.now()}`,
        sender: 'contact',
        text: cleaned,
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
  }, [avatarMode]);

  useEffect(() => {
    if (!receivedText?.trim()) return;
    processIncomingVoiceText(receivedText);
  }, [receivedText, processIncomingVoiceText]);

  useEffect(() => {
    window.wakwakProcessAvatar = processIncomingVoiceText;
    return () => {
      delete window.wakwakProcessAvatar;
    };
  }, [processIncomingVoiceText]);

  // Simulated Glove signs (gant active)
  const glovePhraseIdxRef = useRef(0);
  const GLOVE_CALL_PHRASES = ['Bonjour', 'Comment vas-tu', 'Moi ça va', 'Merci', 'À bientôt'];

  const envoyerSigneAppel = () => {
    if (!canSpeakTurn) {
      showToast('⏳ Attendez que l\'entendant parle');
      return;
    }
    const phrase = GLOVE_CALL_PHRASES[glovePhraseIdxRef.current % GLOVE_CALL_PHRASES.length];
    glovePhraseIdxRef.current += 1;
    setVosSignes(`🤟 ${phrase}`);
    setSigningActive(true);
    setPulseGlove(true);
    setTimeout(() => setPulseGlove(false), 400);
    setTimeout(() => setSigningActive(false), 1500);
    if (activeCall) sendSignText(phrase);
    setTranscriptHistory((prev) => [
      ...prev,
      {
        id: `tr_${Date.now()}`,
        sender: 'me',
        text: phrase,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    showToast(`🤟 Signe envoyé : ${phrase}`);
  };

  // Simulated Interlocuteur dit (voice input)
  const handleToggleSimulateVoice = () => {
    let idx = 0;
    const phrases = ["Hello", "How are you", "I am happy to talk", "Everything is working", "See you later"];
    
    const step = () => {
      const phrase = phrases[idx % phrases.length];
      idx++;
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 2000);
      setInterlocuteurDit(phrase);

      // Speak & LSF Translation
      if (avatarMode === 'frizitta') {
        const seq = processFrizitta(phrase);
        if (seq.length > 0) startFrizittaPlayback(seq);
      } else {
        const { sequence, skipped } = processAlex(phrase);
        setAlexSkippedWords(skipped);
        if (sequence.length > 0) startAlexPlayback(sequence);
      }

      setTranscriptHistory(prev => [...prev, {
        id: 'tr_' + Date.now() + '_v',
        sender: 'contact',
        text: phrase,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }]);
    };

    setTimeout(() => {
      step();
      simVoiceIntervalRef.current = setInterval(step, 5000);
    }, 2000);
  };

  // Copy transcript to clipboard
  const copyTranscript = () => {
    const text = transcriptHistory
      .map(m => `[${m.sender === 'me' ? 'Moi (LSF)' : activeContact.firstName}] ${m.text}`)
      .join('\n');
    navigator.clipboard.writeText(text || "Aucune conversation.");
    showToast("📋 Transcript copié !");
  };

  // End Call confirmed
  const confirmEndCall = () => {
    setShowEndDialog(false);
    endCall();
    if (activeSessionCode) {
      endRealtimeCall(activeSessionCode).catch(() => {});
    }
    clearInterval(callTimerRef.current);
    if (simGloveIntervalRef.current) clearInterval(simGloveIntervalRef.current);
    if (simVoiceIntervalRef.current) clearInterval(simVoiceIntervalRef.current);
    stopFrizittaPlayback();
    stopAlexPlayback();

    setShowSaveDialog(true);
  };

  // Save/Ignore Call conversation popup
  const handleSaveConversation = (shouldSave) => {
    setShowSaveDialog(false);
    
    if (shouldSave && activeContact) {
      const newSession = {
        id: 'session_' + Date.now(),
        contactId: activeContact.id,
        contactName: `${activeContact.firstName} ${activeContact.lastName}`,
        date: new Date().toLocaleDateString('fr-FR'),
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        duration: callDuration,
        transcriptExcerpt: transcriptHistory.length > 0 ? transcriptHistory[transcriptHistory.length - 1].text : "Appel sans échange",
        fullTranscript: transcriptHistory.map(m => ({
          sender: m.sender === 'me' ? 'Moi' : activeContact.firstName,
          text: m.text,
          time: m.timestamp
        }))
      };

      // Save to sessions in localStorage (linked directly with historics & last calls)
      const savedSessions = localStorage.getItem('sessions') ? JSON.parse(localStorage.getItem('sessions')) : [];
      savedSessions.unshift(newSession);
      localStorage.setItem('sessions', JSON.stringify(savedSessions));

      showToast("💾 Conversation enregistrée avec succès !");
    }

    // Go back to fiche contact
    navigate(`/contacts/${id}`);
  };

  // Helper: Get last call for active contact
  const getLastCall = (contactId) => {
    const savedSessions = localStorage.getItem('sessions') ? JSON.parse(localStorage.getItem('sessions')) : [];
    return savedSessions.find(s => s.contactId === contactId);
  };

  const contactLastCall = activeContact ? getLastCall(activeContact.id) : null;

  // Render initials helper
  const getInitials = (c) => {
    if (!c) return '?';
    return `${c.firstName[0] || ''}${c.lastName[0] || ''}`.toUpperCase();
  };

  const displayedRemoteText = (activeCall && receivedText)
    ? receivedText
    : (remoteTranscript.text || interlocuteurDit);
  const displayedRemoteWords = displayedRemoteText ? displayedRemoteText.split(' ').filter(Boolean) : [];

  // RENDER SWITCH
  return (
    <div className={`relative w-full max-w-md mx-auto min-h-screen bg-[#f5f5f5] flex flex-col justify-between font-sans text-slate-200 select-none pb-[80px] ${screen === 'call' ? '' : 'contacts-light'}`}
      style={screen === 'call' ? { paddingBottom: 80, minHeight: '100vh', height: '100dvh' } : {}}
    >
      {/* Toast popup */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 bg-indigo-600 rounded-full text-xs font-bold text-white shadow-lg border border-indigo-500 animate-bounce">
          {toast}
        </div>
      )}

      {incomingCall && (
        <div className="fixed top-3 left-1/2 z-[10001] w-[calc(100%-24px)] max-w-sm -translate-x-1/2 rounded-[14px] border border-[#6366f1] bg-[#f5f0ff] p-3 text-[#111111] shadow-xl animate-fade-in">
          <div className="flex items-start gap-2">
            <PhoneIncoming className="shrink-0 text-[#6366f1]" size={22} strokeWidth={2.25} />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-extrabold">Appel entrant</div>
              <div className="mt-0.5 text-[10px] font-bold text-[#777777]">
                Code : <span className="text-[#6366f1]">{incomingCall.code}</span> — {incomingCall.callerName || 'Personne entendante'}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const target = activeContact?.id || 'c1';
                navigate(`/call/${target}?code=${encodeURIComponent(incomingCall.code)}`);
                joinSessionByCode(incomingCall.code);
              }}
              className="h-8 flex-1 rounded-[9px] bg-[#16a34a] text-[11px] font-extrabold text-white active:scale-95 flex items-center justify-center gap-1"
            >
              <LogIn size={14} strokeWidth={2.5} />
              Rejoindre
            </button>
            <button
              type="button"
              onClick={() => {
                if (incomingCall?.code) {
                  endRealtimeCall(incomingCall.code).catch(() => {});
                }
                setIncomingCall(null);
              }}
              className="h-8 flex-1 rounded-[9px] bg-[#fee2e2] text-[11px] font-extrabold text-[#ef4444] active:scale-95 flex items-center justify-center gap-1"
            >
              <X size={14} strokeWidth={2.5} />
              Ignorer
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          SCREEN 1: LIST OF CONTACTS
          ======================================================== */}
      {screen === 'list' && (
        <div className="flex-grow flex flex-col p-4">
          
          {/* HEADER */}
          <header className="flex justify-between items-center py-2 mb-4 shrink-0">
            <h1 className="text-[15px] font-bold text-[#111111]">Mes Contacts</h1>
            <button
              onClick={() => navigate('/contacts/add')}
              className="w-[30px] h-[30px] rounded-full bg-[#6366f1] flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
            >
              <UserPlus size={14} strokeWidth={2.5} />
            </button>
          </header>

          {/* SEARCH BAR */}
          <div className="flex items-center bg-[#eeeeee] border border-[#e0e0e0] rounded-[10px] px-3 py-2.5 mb-6 shrink-0 shadow-inner">
            <Search className="text-slate-500 mr-2 shrink-0" size={14} strokeWidth={2.25} />
            <input 
              type="text" 
              placeholder="Rechercher un contact..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-[13px] text-slate-100 placeholder-slate-500 w-full focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* SECTIONS */}
          <div className="flex-grow space-y-6 overflow-y-auto max-h-[calc(100vh-220px)] pr-0.5">
            
            {/* EMERGENCY CONTACTS */}
            {filteredEmergency.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-[9px] font-bold text-[#888888] uppercase tracking-[0.6px] select-none">
                  CONTACTS D'URGENCE
                </h2>
                <div className="space-y-2.5">
                  {filteredEmergency.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => navigate(`/contacts/${c.id}`)}
                      className="bg-[#fff1f1] border border-[#fee2e2] rounded-[12px] p-3 flex items-center justify-between hover:border-red-900/50 cursor-pointer active:bg-[#fee2e2] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar square rounded */}
                        <div className="w-[34px] h-[34px] rounded-[8px] bg-[#fee2e2] text-red-200 border border-red-950 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                          {c.photoUrl ? (
                            <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(c)
                          )}
                        </div>
                        
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-bold text-[#111111]">{c.firstName} {c.lastName}</span>
                            <span className="bg-red-950 text-red-400 font-extrabold text-[8px] px-1 rounded uppercase tracking-wider">
                              SOS
                            </span>
                            {/* Status light */}
                            <span 
                              className="w-1.5 h-1.5 rounded-full shrink-0" 
                              style={{ 
                                backgroundColor: c.status === 'online' ? '#22c55e' : c.status === 'busy' ? '#f97316' : '#d1d5db' 
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold">{c.relationType}</span>
                        </div>
                      </div>

                      {(() => {
                        const callUi = getContactCallState(
                          getRealtimeStatus(getContactPhone(c), c.status),
                        );
                        return (
                          <button
                            type="button"
                            disabled={callUi.disabled}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCallContact(c);
                            }}
                            className={callUi.buttonClass}
                          >
                            {callUi.useLucidePhone ? (
                              <Phone size={12} strokeWidth={2.5} className="text-white" />
                            ) : (
                              <i
                                className={callUi.themifyIcon}
                                style={{ fontSize: 12, color: callUi.themifyColor || '#fff' }}
                              />
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NORMAL CONTACTS */}
            <div className="space-y-2">
              <h2 className="text-[9px] font-bold text-[#888888] uppercase tracking-[0.6px] select-none">
                MES CONTACTS
              </h2>
              {filteredNormal.length === 0 ? (
                <div className="text-center text-xs text-slate-600 py-6">Aucun contact trouvé.</div>
              ) : (
                <div className="space-y-2.5">
                  {filteredNormal.map(c => {
                    // Role color codes
                    let bgCol = '#fffbeb';
                    let textCol = '#fbbf24';
                    if (c.role === 'Sourd') {
                      bgCol = '#e8f5e9';
                      textCol = '#4ade80';
                    } else if (c.role === 'Médecin') {
                      bgCol = '#eff6ff';
                      textCol = '#60a5fa';
                    } else if (c.role === 'Autre') {
                      bgCol = '#eeeeee';
                      textCol = '#9ca3af';
                    }

                    return (
                      <div 
                        key={c.id}
                        onClick={() => navigate(`/contacts/${c.id}`)}
                        className="bg-[#ffffff] border border-[#e0e0e0] rounded-[11px] p-3 flex items-center justify-between hover:border-slate-800 cursor-pointer active:bg-[#eeeeee] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          {/* Colored role avatar */}
                          <div 
                            className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-bold text-xs border border-white/5 overflow-hidden shrink-0"
                            style={{ backgroundColor: bgCol, color: textCol }}
                          >
                            {c.photoUrl ? (
                              <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(c)
                            )}
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12px] font-bold text-[#111111]">{c.firstName} {c.lastName}</span>
                              <span 
                                className="font-extrabold text-[8px] px-1 rounded uppercase tracking-wider"
                                style={{ backgroundColor: bgCol, color: textCol }}
                              >
                                {c.role}
                              </span>
                              {/* Status light */}
                              <span 
                                className="w-1.5 h-1.5 rounded-full shrink-0" 
                                style={{ 
                                  backgroundColor: c.status === 'online' ? '#22c55e' : c.status === 'busy' ? '#f97316' : '#d1d5db' 
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold">{c.relationType}</span>
                          </div>
                        </div>

                        {(() => {
                          const callUi = getContactCallState(
                            getRealtimeStatus(getContactPhone(c), c.status),
                          );
                          return (
                            <button
                              type="button"
                              disabled={callUi.disabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallContact(c);
                              }}
                              className={callUi.buttonClass}
                            >
                              {callUi.useLucidePhone ? (
                                <Phone size={12} strokeWidth={2.5} />
                              ) : (
                                <i
                                  className={callUi.themifyIcon}
                                  style={{ fontSize: 12, color: callUi.themifyColor || '#fff' }}
                                />
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          SCREEN 2: ADD A CONTACT
          ======================================================== */}
      {screen === 'add' && (
        <div className="flex-grow flex flex-col p-4 overflow-y-auto">
          
          {/* HEADER */}
          <header className="flex items-center gap-3 py-2 mb-6 shrink-0">
            <button onClick={() => navigate('/contacts')} className="text-slate-400 hover:text-white cursor-pointer">
              <ArrowLeft size={16} strokeWidth={2.5} />
            </button>
            <h1 className="text-[15px] font-bold text-[#111111]">Ajouter un Contact</h1>
          </header>

          <form onSubmit={handleAddContact} className="space-y-4 select-text">
            
            {/* PHOTO PICKER / INITIALS PREVIEW */}
            <div className="flex flex-col items-center justify-center py-2 shrink-0 gap-1.5">
              <div className="relative w-[60px] h-[60px] rounded-[16px] bg-[#ede7f6] border border-violet-500/30 flex items-center justify-center text-white text-[20px] font-black uppercase tracking-wider overflow-hidden">
                {photoDataUrl ? (
                  <img src={photoDataUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : firstName && lastName ? (
                  `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()
                ) : (
                  <User size={24} />
                )}
                
                {/* Remove photo button */}
                {photoDataUrl && (
                  <button 
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    className="absolute top-0 right-0 bg-red-600/80 text-white p-0.5 rounded-bl hover:bg-red-700 transition-colors flex items-center justify-center"
                    style={{ width: '16px', height: '16px' }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              
              <label className="cursor-pointer bg-[#e5e5e5] hover:bg-[#eeeeee] border border-[#d1d5db] text-[9px] font-bold text-slate-300 px-2.5 py-1 rounded-[6px] transition-colors select-none active:scale-95">
                Changer la photo (optionnel)
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPhotoDataUrl(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>

            {/* FIRSTNAME & LASTNAME */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Prénom *</label>
                <input 
                  type="text" 
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex: Sophie"
                  className="bg-[#ffffff] border border-[#e0e0e0] rounded-[10px] px-3 py-2 text-[12px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nom *</label>
                <input 
                  type="text" 
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex: Laurent"
                  className="bg-[#ffffff] border border-[#e0e0e0] rounded-[10px] px-3 py-2 text-[12px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* PHONE & EMAIL */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Numéro de Téléphone</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 06 12 34 56 78"
                className="bg-[#ffffff] border border-[#e0e0e0] rounded-[10px] px-3 py-2 text-[12px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Adresse Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: sophie.laurent@email.com"
                className="bg-[#ffffff] border border-[#e0e0e0] rounded-[10px] px-3 py-2 text-[12px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* ROLE SELECTOR */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Rôle de l'interlocuteur</label>
              <div className="grid grid-cols-4 gap-2">
                {['Entendant', 'Sourd', 'Médecin', 'Autre'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 rounded-[8px] text-[10px] font-extrabold uppercase tracking-wide border cursor-pointer active:scale-95 transition-all ${
                      role === r 
                        ? 'bg-[#6366f1] text-white border-[#6366f1]' 
                        : 'bg-[#ffffff] border-[#e0e0e0] text-slate-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* RELATION TYPE */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Type de relation / Note</label>
              <input 
                type="text" 
                value={relationType}
                onChange={(e) => setRelationType(e.target.value)}
                placeholder="Ex: Soeur, Docteur, Traducteur..."
                className="bg-[#ffffff] border border-[#e0e0e0] rounded-[10px] px-3 py-2 text-[12px] text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* TOGGLES */}
            <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[12px] p-3 space-y-3 shrink-0">
              {/* SOS Emergency Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={14} strokeWidth={2.25} className={isSOS ? 'text-red-500' : 'text-slate-500'} />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-200">Contact d'urgence (SOS)</span>
                    <span className="text-[9px] text-slate-500 font-semibold">Rend le contact visible en accès rapide SOS</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSOS(prev => !prev)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${isSOS ? 'bg-[#EF4444] justify-end' : 'bg-slate-800 justify-start'}`}
                >
                  <span className="w-4 h-4 bg-white rounded-full shadow" />
                </button>
              </div>

              {/* Favorites Toggle */}
              <div className="flex items-center justify-between border-t border-[#e0e0e0] pt-3">
                <div className="flex items-center gap-2">
                  <Star size={14} strokeWidth={2.25} className={isFav ? 'text-amber-500 fill-amber-500' : 'text-slate-500'} />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-200">Ajouter aux Favoris</span>
                    <span className="text-[9px] text-slate-500 font-semibold">Épingle le contact en haut de liste</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFav(prev => !prev)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${isFav ? 'bg-[#F59E0B] justify-end' : 'bg-slate-800 justify-start'}`}
                >
                  <span className="w-4 h-4 bg-white rounded-full shadow" />
                </button>
              </div>
            </div>

            {/* SAVE BUTTON */}
            <button
              type="submit"
              className="w-full h-12 bg-[#6366f1] text-white rounded-[12px] font-extrabold text-[12px] shadow-lg shadow-indigo-650/15 tracking-wider uppercase active:scale-[0.98] transition-transform cursor-pointer mt-4 flex items-center justify-center gap-2"
            >
              <Check size={18} strokeWidth={2.5} />
              Enregistrer
            </button>

          </form>

        </div>
      )}

      {/* ========================================================
          SCREEN 3: FICHE CONTACT DETAILS
          ======================================================== */}
      {screen === 'detail' && activeContact && (
        <div className="flex-grow flex flex-col p-4 overflow-y-auto">
          
          {/* HEADER BACK */}
          <header className="flex py-2 mb-6 shrink-0">
            <button 
              onClick={() => navigate('/contacts')} 
              className="text-[#6366f1] font-bold text-[13px] flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} strokeWidth={2.5} /> Contacts
            </button>
          </header>

          {/* FICHE HEAD INFO CARD */}
          <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[16px] p-4 flex flex-col items-center text-center shadow-lg mb-4 shrink-0 select-text">
            
            {/* Avatar big */}
            <div className="w-[54px] h-[54px] rounded-[16px] bg-[#ede7f6] border border-violet-500/30 flex items-center justify-center text-white text-[18px] font-black uppercase tracking-wider mb-3 overflow-hidden">
              {activeContact.photoUrl ? (
                <img src={activeContact.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(activeContact)
              )}
            </div>

            {/* Full Name */}
            <h2 className="text-[15px] font-bold text-[#111111] mb-1">{activeContact.firstName} {activeContact.lastName}</h2>
            
            {/* Role & Relation */}
            <p className="text-[10px] text-[#666] font-extrabold uppercase tracking-wider mb-2">
              {activeContact.role} • {activeContact.relationType}
            </p>

            {/* Status indicators */}
            <div className="flex items-center gap-1.5 mt-1 select-none">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ 
                  backgroundColor: activeContact.status === 'online' ? '#22c55e' : activeContact.status === 'busy' ? '#f97316' : '#d1d5db' 
                }}
              />
              <span className="text-[10.5px] font-bold text-slate-400 capitalize">
                {activeContact.status === 'online' ? 'En ligne' : activeContact.status === 'busy' ? 'Occupé' : 'Hors ligne'}
              </span>
            </div>
          </div>

          {/* CALL IN LSF BUTTON */}
          <button
            type="button"
            onClick={launchCall}
            disabled={getRealtimeStatus(getContactPhone(activeContact), activeContact.status) !== 'online'}
            className="w-full h-12 bg-[#16a34a] hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[12px] font-extrabold text-[12px] shadow-md shadow-emerald-700/10 flex items-center justify-center gap-2 tracking-wide uppercase active:scale-[0.98] transition-transform cursor-pointer mb-5 shrink-0"
          >
            <Phone size={14} strokeWidth={2.5} /> Appeler en LSF
          </button>

          {/* OPTION ACTIONS GRID (2 COLUMNS) */}
          {/* OPTION ACTIONS GRID (2 COLUMNS) */}
          <div className="grid grid-cols-2 gap-2.5 mb-6 shrink-0">
            
            {/* Historique */}
            <button
              onClick={() => navigate('/historique')}
              className="flex items-center gap-2 bg-[#ffffff] hover:bg-[#eeeeee] border border-[#e0e0e0] p-3 rounded-[10px] text-[11px] font-bold text-slate-350 cursor-pointer active:scale-95 transition-all text-left"
            >
              <History size={14} strokeWidth={2.25} className="text-slate-500 shrink-0" />
              <span>Voir historique</span>
            </button>

            {/* Favoris */}
            <button
              onClick={() => handleToggleFav(activeContact.id)}
              className="flex items-center gap-2 bg-[#ffffff] hover:bg-[#eeeeee] border border-[#e0e0e0] p-3 rounded-[10px] text-[11px] font-bold text-slate-350 cursor-pointer active:scale-95 transition-all text-left"
            >
              <Star size={14} strokeWidth={2.25} className={`shrink-0 ${activeContact.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-500'}`} />
              <span>{activeContact.isFavorite ? 'Retirer des Favoris' : 'Ajouter aux Favoris'}</span>
            </button>
 
            {/* SOS emergency */}
            <button
              onClick={() => handleToggleSOS(activeContact.id)}
              className="flex items-center gap-2 bg-[#ffffff] hover:bg-[#eeeeee] border border-[#e0e0e0] p-3 rounded-[10px] text-[11px] font-bold text-slate-350 cursor-pointer active:scale-95 transition-all text-left"
            >
              <AlertTriangle size={14} strokeWidth={2.25} className={`shrink-0 ${activeContact.isEmergencyContact ? 'text-red-500' : 'text-slate-500'}`} />
              <span>Définir comme SOS</span>
            </button>

            {/* Partager */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Contact WakWak: ${activeContact.firstName} ${activeContact.lastName} (${activeContact.phone})`);
                showToast("📋 Coordonnées copiées !");
              }}
              className="flex items-center gap-2 bg-[#ffffff] hover:bg-[#eeeeee] border border-[#e0e0e0] p-3 rounded-[10px] text-[11px] font-bold text-slate-350 cursor-pointer active:scale-95 transition-all text-left"
            >
              <Share2 size={14} strokeWidth={2.25} className="text-slate-500 shrink-0" />
              <span>Partager contact</span>
            </button>

            {/* Bloquer (Rouge) */}
            <button
              onClick={() => handleToggleBlock(activeContact.id)}
              className="flex items-center gap-2 bg-[#ffffff] hover:bg-[#eeeeee] border border-[#e0e0e0] p-3 rounded-[10px] text-[11px] font-bold text-red-400 cursor-pointer active:scale-95 transition-all text-left"
            >
              <Ban size={14} strokeWidth={2.25} className="text-red-500 shrink-0" />
              <span>{activeContact.isBlocked ? 'Débloquer' : 'Bloquer (rouge)'}</span>
            </button>

            {/* Supprimer (Rouge) */}
            <button
              onClick={() => handleDeleteContact(activeContact.id)}
              className="flex items-center gap-2 bg-[#ffffff] hover:bg-[#eeeeee] border border-[#e0e0e0] p-3 rounded-[10px] text-[11px] font-bold text-red-400 cursor-pointer active:scale-95 transition-all text-left"
            >
              <Trash2 size={14} strokeWidth={2.25} className="text-red-500 shrink-0" />
              <span>Supprimer (rouge)</span>
            </button>
            
          </div>

          {/* LAST CALL CARD */}
          <div className="mt-auto shrink-0 select-text">
            <h3 className="text-[9px] font-bold text-[#888888] uppercase tracking-[0.6px] mb-2">DERNIER APPEL</h3>
            {contactLastCall ? (
              <div className="bg-[#e8f5e9] border border-[#c8e6c9] rounded-[12px] p-3 flex flex-col gap-1.5 shadow-inner">
                <div className="flex justify-between items-center text-[10.5px] font-bold text-emerald-400">
                  <span>Date : {contactLastCall.date} ({contactLastCall.time})</span>
                  <span>Durée : {contactLastCall.duration}s</span>
                </div>
                <div className="text-[11px] text-emerald-100 font-medium italic border-t border-[#c8e6c9] pt-1.5 mt-0.5">
                  "{contactLastCall.transcriptExcerpt}"
                </div>
              </div>
            ) : (
              <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[12px] p-3.5 text-center text-xs text-slate-600 italic">
                Aucun appel récent enregistré
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================
          SCREEN 4: LIVE CALL IN PROGRESS (FULL SCREEN TAKEOVER)
          ======================================================== */}
      {screen === 'call' && activeContact && (
        <div className="fixed inset-0 bg-[#F0F2F5] z-[9999] flex flex-col justify-between font-sans overflow-hidden text-[#1F2937] select-none max-w-md mx-auto h-[calc(100dvh-80px)] bottom-[80px] animate-fade-in">
          <SessionTopBar
            title={`${activeContact.firstName} ${activeContact.lastName}`.trim()}
            subtitle="Appel en cours"
            onBack={() => setShowEndDialog(true)}
            backLabel="Quitter l'appel"
          />

          {/* ZONE A — INDICATEUR GANTS — 44px */}
          <div className="h-[44px] bg-[#F9FAFB] border-b border-[#E5E7EB] px-4 flex items-center justify-between shrink-0 animate-fade-in">
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <span className="flex items-center shrink-0">
                <Hand className="text-violet-400 mr-1.5 shrink-0 animate-pulse" size={16} strokeWidth={2.25} />
              </span>
              <span className="text-[12px] font-bold text-[#1F2937] truncate leading-none">
                {vosSignes}
              </span>
            </div>
            {/* 3 points animés clignotants quand gant actif */}
            <div className="flex items-center gap-1 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-blink-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-blink-2" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-blink-3" />
            </div>
          </div>

          {/* ZONE B — CADRE AVATAR — flex-grow */}
          <div className="flex-grow bg-[#F0F2F5] px-3 py-2 flex flex-col min-h-0 relative">
            <div className="flex-1 w-full bg-white border border-[#E5E7EB] rounded-[16px] relative overflow-hidden flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
              
              {/* WHITE INTERIOR = 3D AVATAR CANVAS RENDERING */}
              <div 
                className="w-full h-full bg-[#ffffff] absolute inset-0 z-0 flex items-center justify-center"
                style={{
                  backgroundImage: 'radial-gradient(circle, transparent 20%, #ffffff 85%), linear-gradient(rgba(79, 70, 229, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(79, 70, 229, 0.06) 1px, transparent 1px)',
                  backgroundSize: '100% 100%, 16px 16px, 16px 16px',
                  backgroundPosition: 'center'
                }}
              >
                
                {/* EFFET LUMIÈRE INTERNE */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0f0120]/10 to-[#2d1b69]/5 z-[1]" />

                {/* Simulated rendering avatar */}
                {avatarMode === 'frizitta' ? (
                  <div className="w-full h-full flex items-center justify-center bg-transparent" id="call-frizitta">
                    <img 
                      src={currentLetterUrl || (frizittaDb ? frizittaDb['NEUTRE'] || '' : '')} 
                      alt="LSF avatar letter"
                      className="max-h-[100%] object-contain select-none z-10 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                      style={{ objectFit: 'contain !important' }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full relative bg-transparent z-10" id="call-alex">
                    <video 
                      ref={videoARef}
                      autoPlay 
                      muted 
                      playsInline 
                      className="absolute inset-0 w-full h-full object-contain"
                      style={{ 
                        opacity: activeVideo === 'A' ? 1 : 0, 
                        zIndex: activeVideo === 'A' ? 2 : 1,
                        objectFit: 'contain !important'
                      }}
                    />
                    <video 
                      ref={videoBRef}
                      autoPlay 
                      muted 
                      playsInline 
                      className="absolute inset-0 w-full h-full object-contain"
                      style={{ 
                        opacity: activeVideo === 'B' ? 1 : 0, 
                        zIndex: activeVideo === 'B' ? 2 : 1,
                        objectFit: 'contain !important'
                      }}
                    />
                    
                    {/* Fallback silhouette if videos loading */}
                    {!currentAlexWord && (
                      <div className="absolute inset-0 flex items-center justify-center text-[100px] text-slate-100/20 select-none z-[0] filter blur-[0.5px]">
                        👤
                      </div>
                    )}
                  </div>
                )}
                
              </div>

              {/* TOP LEFT: CHANGE AVATAR BUTTON */}
              <button
                onClick={() => {
                  stopFrizittaPlayback();
                  stopAlexPlayback();
                  setAvatarMode(prev => prev === 'alex' ? 'frizitta' : 'alex');
                  showToast(`🔄 Avatar commuté en mode ${avatarMode === 'alex' ? 'lettres' : 'mots'}`);
                }}
                className="absolute top-3 left-3 z-20 text-[9px] bg-white/80 text-[#4F46E5] hover:bg-white active:scale-95 border border-[#E5E7EB] backdrop-blur-[4px] px-2.5 py-1 rounded-lg cursor-pointer font-bold select-none shadow-sm"
              >
                <UserRound size={12} strokeWidth={2.25} className="inline mr-0.5" />
                Avatar
              </button>

              {/* MIDDLE BOTTOM: WORD / LETTER PREVIEW OVERLAY */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none max-w-[200px] w-full text-center">
                {avatarMode === 'frizitta' && currentLetter && (
                  <div className="bg-white/90 backdrop-blur rounded-[8px] border border-[#E5E7EB] px-2 py-1 text-[9px] font-bold text-[#1F2937] shadow-sm">
                    Lettre : <span className="text-violet-400">[{currentLetter}]</span> ({currentWord})
                  </div>
                )}
                {avatarMode === 'alex' && currentAlexWord && (
                  <div className="bg-slate-900/80 backdrop-blur rounded-[8px] border border-slate-750 px-2 py-1 text-[9px] font-bold text-slate-200 uppercase">
                    Mot : <span className="text-[#4F46E5]">{currentAlexWord}</span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ZONE C — TEXTE TRADUIT — min 58px */}
          <div className="bg-[#F9FAFB] border-t border-b border-[#E5E7EB] px-4 py-2.5 flex flex-col shrink-0 min-h-[96px] justify-center select-text">
            {!activeSessionCode && (
              <div className="mb-2 flex items-center gap-2">
                <input
                  value={sessionCodeInput}
                  onChange={(event) => setSessionCodeInput(event.target.value.toUpperCase())}
                  placeholder="Entrer le code : ex ABC-123"
                  className="h-9 min-w-0 flex-1 rounded-[10px] border border-[#6366f1] bg-white px-3 text-center text-[12px] font-extrabold text-[#1F2937] placeholder:text-[#9CA3AF] outline-none"
                />
                <button
                  type="button"
                  onClick={() => joinSessionByCode(sessionCodeInput)}
                  className="h-9 rounded-[10px] bg-[#6366f1] px-3 text-[11px] font-extrabold text-white active:scale-95 flex items-center gap-1"
                >
                  <LogIn size={14} strokeWidth={2.5} />
                  Rejoindre
                </button>
              </div>
            )}

            {realtimeConnection === 'reconnecting' && (
              <div className="mb-2 rounded-[9px] bg-[#f5f0ff] px-3 py-1.5 text-[9px] font-bold text-[#a78bfa]">
                🔄 Reconnexion...
              </div>
            )}
            {realtimeConnection === 'lost' && (
              <div className="mb-2 rounded-[9px] bg-[#fee2e2] px-3 py-1.5 text-[9px] font-bold text-[#ef4444]">
                Connexion perdue
              </div>
            )}

            {remoteStatus === 'speaking' && (
              <div className="mb-2 flex items-center justify-center gap-1 rounded-[9px] bg-[#f5f0ff] px-3 py-1.5 text-[9px] font-bold text-[#a78bfa]">
                <span>🎙️ La personne entendante est en train de parler</span>
                <span className="w-1 h-1 rounded-full bg-[#6366f1] animate-blink-1" />
                <span className="w-1 h-1 rounded-full bg-[#6366f1] animate-blink-2" />
                <span className="w-1 h-1 rounded-full bg-[#6366f1] animate-blink-3" />
              </div>
            )}

            <span className="text-[9px] italic text-[#6B7280] font-bold mb-1 uppercase tracking-wide select-none">
              🗣️ L'interlocuteur dit :
            </span>
            <div className={`${remoteTranscript.isFinal ? 'text-[24px] text-[#111111]' : 'text-[16px] text-[#666666] italic'} font-semibold leading-tight pb-0.5`}>
              {displayedRemoteWords.length > 0 ? (
                <div className="flex flex-wrap gap-x-1">
                  {displayedRemoteWords.map((w, wIdx) => (
                    <span 
                      key={wIdx} 
                      className="animate-fade-in inline-block"
                      style={{ 
                        animationDelay: `${wIdx * 150}ms`, 
                        animationFillMode: 'both' 
                      }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[#9CA3AF] italic">En attente de parole...</span>
              )}
            </div>

            {/* Words warnings */}
            {avatarMode === 'alex' && alexSkippedWords && alexSkippedWords.length > 0 && (
              <div className="text-[8.5px] font-bold text-[#f59e0b] mt-1 flex flex-wrap gap-1 items-center select-none">
                <span>⚠️ Non disponibles:</span>
                {alexSkippedWords.map((w, idx) => (
                  <span key={idx} className="bg-[#FFFBEB] border border-[#FDE68A] px-0.5 rounded">[{w}]</span>
                ))}
              </div>
            )}
          </div>

          <ZoneDActionBar
            variant="deafCall"
            micOn={canSpeakTurn}
            onMicro={envoyerSigneAppel}
            onCopy={copyTranscript}
            onEnd={() => setShowEndDialog(true)}
          />

          {/* Call Status Bar top-center floating */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white/90 border border-[#E5E7EB] px-3 py-1 rounded-full flex items-center gap-2 z-10 shadow-lg pointer-events-none select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-[#1F2937] tracking-wide">
              {activeContact.firstName} — {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
            </span>
          </div>

        </div>
      )}

      {/* CONFIRMATION HANG UP DIALOG */}
      {showEndDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-[10000] select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-[16px] p-5 w-full max-w-[280px] text-center text-slate-100 animate-fade-in shadow-2xl">
            <h3 className="text-sm font-extrabold">Terminer l'appel ?</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-semibold">
              Voulez-vous raccrocher et clôturer la communication LSF en cours ?
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowEndDialog(false)}
                className="flex-1 h-9 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 font-extrabold text-xs cursor-pointer transition-colors active:scale-95 flex items-center justify-center gap-1"
              >
                <X size={14} strokeWidth={2.5} />
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmEndCall}
                className="flex-1 h-9 rounded-lg bg-[#EF4444] hover:bg-red-600 text-white font-extrabold text-xs cursor-pointer transition-colors active:scale-95 flex items-center justify-center gap-1"
              >
                <Check size={14} strokeWidth={2.5} />
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE CONVERSATION DIALOG (FIN D'APPEL) */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 z-[10000] select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-[18px] p-5 w-full max-w-[300px] text-slate-100 text-center animate-fade-in shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-indigo-950 border border-indigo-900 flex items-center justify-center text-indigo-400 mx-auto mb-4">
              <Save size={24} strokeWidth={2} />
            </div>
            <h3 className="text-sm font-black">Sauvegarder l'échange ?</h3>
            <p className="text-xs text-slate-450 mt-2 leading-relaxed font-semibold px-1">
              "Voulez-vous enregistrer cette conversation ?" Le transcript et la durée seront consignés dans votre historique.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => handleSaveConversation(false)}
                className="flex-1 h-10 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-350 font-extrabold text-xs cursor-pointer transition-colors active:scale-95 flex items-center justify-center gap-1"
              >
                <X size={14} strokeWidth={2.5} />
                Ignorer
              </button>
              <button
                type="button"
                onClick={() => handleSaveConversation(true)}
                className="flex-1 h-10 rounded-xl bg-[#16a34a] hover:bg-emerald-600 text-white font-extrabold text-xs cursor-pointer transition-colors active:scale-95 flex items-center justify-center gap-1"
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
