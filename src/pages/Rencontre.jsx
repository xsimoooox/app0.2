import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Home,
  Users,
  QrCode,
  Clock,
  Settings,
  UserRound,
  CircleStop,
  Sparkles,
  Clapperboard,
  Save,
  FileText,
  RefreshCw,
  Share2,
  Code2,
  Lock,
  Smartphone,
  Hand,
  X,
  Check,
} from 'lucide-react';
import AvatarStage from '../components/AvatarStage';
import AlexStage, { applyAlexVideoStyles } from '../components/AlexStage';
import RencontreQrCode from '../components/RencontreQrCode';
import SessionTopBar from '../components/SessionTopBar';
import { useImmersiveSession } from '../context/ImmersiveSessionContext';
import { buildRencontreJoinUrl } from '../lib/appUrl';
import {
  createRencontreSession,
  endRencontreSession,
  getClientUid,
  joinRencontreSession,
  listenRencontreSession,
  sendRencontreGlove,
} from '../lib/firebaseRealtime';
import { PHOTOS } from '../lib/lsfData';

// Generates a mock UUID v4 for the session token
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function Rencontre() {
  const { setImmersiveSession } = useImmersiveSession();

  // Avatar Selection states
  const [avatar, setAvatar] = useState(() => localStorage.getItem('avatarChoice'));
  const [showAvatarOverlay, setShowAvatarOverlay] = useState(false);

  // Database states
  const [frizittaDb, setFrizittaDb] = useState(null);
  const [alexDb, setAlexDb] = useState(null);
  const [loadingDb, setLoadingDb] = useState(true);

  // ÉTAT 1: QR Code states
  const [sessionToken, setSessionToken] = useState('');
  const [qrContent, setQrContent] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(1800); // 30:00
  const [sessionActive, setSessionActive] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState(null);

  // ÉTAT 2: Active Session states
  const [vosSignes, setVosSignes] = useState('🤟 En attente des signes du gant...');
  const [signingActive, setSigningActive] = useState(false);
  const [pulseZoneA, setPulseZoneA] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [microActive, setMicroActive] = useState(true);
  const [conversationTurn, setConversationTurn] = useState('deaf');
  const [glovePhraseIdx, setGlovePhraseIdx] = useState(0);
  const [interlocuteurDit, setInterlocuteurDit] = useState('');
  const texteGant = vosSignes;
  const gantActif = signingActive;
  const texteInterlocuteur = interlocuteurDit;
  const modeAvatar = avatar;
  const microActif = microActive;
  const [gloveBubble, setGloveBubble] = useState({ words: [], typing: false, waiting: false });
  const [voiceBubble, setVoiceBubble] = useState({ words: [], typing: false, waiting: true });
  const [transcriptHistory, setTranscriptHistory] = useState([]); // Array of { sender, text, timestamp }
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showPostSessionSummary, setShowPostSessionSummary] = useState(false);
  const [finishedSessionData, setFinishedSessionData] = useState(null);

  // Frizitta Player states
  const [currentLetter, setCurrentLetter] = useState('');
  const [currentWord, setCurrentWord] = useState('');
  const [frizittaIdxInfo, setFrizittaIdxInfo] = useState({ num: 0, total: 0 });
  const [currentLetterUrl, setCurrentLetterUrl] = useState('');

  // Alex Player states
  const [currentAlexWord, setCurrentAlexWord] = useState('');
  const [alexIdxInfo, setAlexIdxInfo] = useState({ num: 0, total: 0 });
  const [alexSkippedWords, setAlexSkippedWords] = useState([]);
  const [activeVideo, setActiveVideo] = useState('A');

  // Video refs for Alex Double Buffer
  const videoARef = useRef(null);
  const videoBRef = useRef(null);

  // Playback loop refs
  const frizittaPlaybackRef = useRef({ index: 0, sequence: [], timer: null, active: false });
  const alexPlaybackRef = useRef({ index: 0, sequence: [], activeVideo: 'A', active: false });
  const lastRemoteVoiceRef = useRef('');
  const endingSessionRef = useRef(false);
  const rencontreHostUidRef = useRef(getClientUid('deaf'));

  // Developer simulation helper states
  const [simGloveIdx, setSimGloveIdx] = useState(0);
  const [simVoiceIdx, setSimVoiceIdx] = useState(0);
  const [simGloveActive, setSimGloveActive] = useState(false);
  const [simVoiceActive, setSimVoiceActive] = useState(false);

  const simGloveIntervalRef = useRef(null);
  const simVoiceIntervalRef = useRef(null);
  const postSessionTimeoutRef = useRef(null);
  const bubbleTimersRef = useRef({ glove: [], voice: [] });

  // Session start time tracking
  const sessionStartTimeRef = useRef(null);

  // Floating Dev Panel toggle state
  const [showDevPanel, setShowDevPanel] = useState(false);

  const clearBubbleTimers = (channel) => {
    bubbleTimersRef.current[channel].forEach(timerId => clearTimeout(timerId));
    bubbleTimersRef.current[channel] = [];
  };

  const runBubbleCycle = (channel, sourceText, setBubble, fallbackText = '') => {
    clearBubbleTimers(channel);

    const cleanedText = (sourceText || '').replace(/^🤟\s*/, '').trim();
    const nextText = cleanedText || fallbackText;

    if (!nextText.trim()) {
      setBubble({ words: [], typing: false, waiting: true });
      return;
    }

    const words = nextText.trim().split(/\s+/);
    setBubble({ words: [], typing: true, waiting: false });

    const pushTimer = (delay, callback) => {
      const timerId = setTimeout(callback, delay);
      bubbleTimersRef.current[channel].push(timerId);
    };

    words.forEach((_, index) => {
      pushTimer(index * 150, () => {
        setBubble({
          words: words.slice(0, index + 1),
          typing: true,
          waiting: false
        });
      });
    });

    pushTimer(words.length * 150, () => {
      setBubble(prev => ({ ...prev, typing: false }));
    });

    pushTimer(words.length * 150 + 2500, () => {
      setBubble(prev => ({ ...prev, typing: false, waiting: true }));
    });
  };

  useEffect(() => {
    runBubbleCycle('glove', texteGant, setGloveBubble, 'En attente des signes du gant...');
  }, [texteGant]);

  useEffect(() => {
    runBubbleCycle('voice', texteInterlocuteur, setVoiceBubble);
  }, [texteInterlocuteur]);

  useEffect(() => {
    return () => {
      clearBubbleTimers('glove');
      clearBubbleTimers('voice');
    };
  }, []);

  // Load Alex DB; Frizitta uses normalized Cloudinary URLs from lsfData
  useEffect(() => {
    setFrizittaDb(PHOTOS);
    setCurrentLetterUrl(PHOTOS.NEUTRE || '');

    fetch('/ALEX_DB.txt')
      .then(r => r.text())
      .then((alexText) => {
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
        setLoadingDb(false);
      })
      .catch(err => {
        console.error('Erreur lors du chargement de la base Alex', err);
        setLoadingDb(false);
      });
  }, []);

  // Control overlay displaying on first load
  useEffect(() => {
    if (!avatar && !loadingDb) {
      setShowAvatarOverlay(true);
    }
  }, [avatar, loadingDb]);

  // Alex : styles cover / center 8% dès l'affichage du mode
  useEffect(() => {
    if (avatar !== 'alex') return;
    applyAlexVideoStyles(videoARef.current);
    applyAlexVideoStyles(videoBRef.current);
  }, [avatar]);

  useEffect(() => {
    const immersive = sessionActive && !showPostSessionSummary;
    setImmersiveSession(immersive);
    return () => setImmersiveSession(false);
  }, [sessionActive, showPostSessionSummary, setImmersiveSession]);

  // Generate new token and start countdown on load or reset
  useEffect(() => {
    if (!sessionActive && !showPostSessionSummary) {
      generateNewQR();
    }
  }, [sessionActive, showPostSessionSummary]);

  // Countdown timer for QR code
  useEffect(() => {
    let interval = null;
    if (!sessionActive && !isExpired && !showPostSessionSummary) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive, isExpired, showPostSessionSummary]);

  // Cleanup playbacks and simulations when unmounting
  useEffect(() => {
    return () => {
      if (simGloveIntervalRef.current) clearInterval(simGloveIntervalRef.current);
      if (simVoiceIntervalRef.current) clearInterval(simVoiceIntervalRef.current);
      if (postSessionTimeoutRef.current) clearTimeout(postSessionTimeoutRef.current);
      stopFrizittaPlayback();
      stopAlexPlayback();
    };
  }, []);

  // Display Toast messages with auto-dismiss
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 2000);
  };

  const publishGloveToSession = (text, isFinal = true) => {
    const cleaned = (text || '').replace(/^🤟\s*/, '').trim();
    if (!sessionToken || !cleaned || cleaned.startsWith('En attente')) return;
    if (conversationTurn !== 'deaf') {
      showToast('⏳ Attendez que l\'entendant finisse de parler');
      return;
    }
    sendRencontreGlove(sessionToken, { text: cleaned, isFinal }).catch(() => {
      showToast('⚠️ Envoi des signes impossible');
    });
  };

  const GLOVE_PHRASES = [
    'Bonjour',
    'Je suis content de vous rencontrer',
    'Merci beaucoup',
    'Comment allez-vous ?',
    'Je comprends bien',
  ];

  const envoyerSigneSimule = () => {
    if (conversationTurn !== 'deaf') {
      showToast('⏳ Attendez votre tour pour signer');
      return;
    }
    const phrase = GLOVE_PHRASES[glovePhraseIdx % GLOVE_PHRASES.length];
    setGlovePhraseIdx((i) => i + 1);
    setVosSignes(`🤟 ${phrase}`);
    setSigningActive(true);
    setPulseZoneA(true);
    setTimeout(() => setPulseZoneA(false), 400);
    setTimeout(() => setSigningActive(false), 1500);
    publishGloveToSession(phrase, true);
    setTranscriptHistory((prev) => [
      ...prev,
      {
        id: generateUUID(),
        sender: 'glove_user',
        text: phrase,
        timestamp: new Date().toISOString(),
      },
    ]);
    showToast(`🤟 Signe envoyé : ${phrase}`);
  };

  const generateNewQR = async () => {
    if (sessionToken) {
      endRencontreSession(sessionToken).catch(() => {});
    }
    const token = generateUUID();
    setSessionToken(token);
    setQrContent(buildRencontreJoinUrl(token));
    setTimerSeconds(1800);
    setIsExpired(false);
    try {
      const hostLabel =
        avatar === 'alex' ? 'Alex' : avatar === 'frizitta' ? 'Frizitta' : 'Interlocuteur';
      await createRencontreSession(token, rencontreHostUidRef.current, {
        hostDisplayName: hostLabel,
      });
    } catch {
      showToast('⚠️ Impossible de créer la session');
    }
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(qrContent);
    showToast("✅ Lien copié !");
  };

  /** Test sans scan : enregistre un invité simulé sur Firebase et ouvre la session sourde. */
  const handleSimulateConnection = async () => {
    if (isExpired || !sessionToken) return;
    if (sessionActive) {
      showToast('Session déjà active');
      return;
    }
    try {
      await joinRencontreSession(sessionToken, `sim_hearing_${Date.now()}`);
      activateRencontreSession();
    } catch {
      showToast('⚠️ Simulation impossible');
    }
  };

  // Avatar Selection Trigger
  const chooseAvatar = (choice) => {
    localStorage.setItem('avatarChoice', choice);
    setAvatar(choice);
    setShowAvatarOverlay(false);
    showToast(`✅ Avatar ${choice.toUpperCase()} activé !`);
  };

  const activateRencontreSession = () => {
    if (isExpired || sessionActive) return;
    showToast('✅ Connexion établie !', 'success');
    sessionStartTimeRef.current = new Date().toISOString();
    setSessionActive(true);
    setVosSignes('🤟 En attente des signes du gant...');
    setInterlocuteurDit('');
    setTranscriptHistory([]);
    lastRemoteVoiceRef.current = '';
  };

  useEffect(() => {
    if (!sessionToken || showPostSessionSummary) return undefined;

    const stop = listenRencontreSession(sessionToken, {
      onMeta: (meta) => {
        if (meta.turn) setConversationTurn(meta.turn);
        if (meta.expiresAt && Date.now() > meta.expiresAt) {
          setIsExpired(true);
          setTimerSeconds(0);
        }
        if (meta.guestUid && meta.status === 'active' && !sessionActive) {
          activateRencontreSession();
        }
        if (meta.status === 'ended' && sessionActive && !endingSessionRef.current) {
          endingSessionRef.current = true;
          setShowEndDialog(false);
          confirmEndSession();
        }
      },
      onVoice: (voice) => {
        if (!sessionActive || !voice?.text) return;
        const text = voice.text.trim();
        setInterlocuteurDit(text);
        setIsSpeaking(!voice.isFinal);
        if (voice.isFinal && text && text !== lastRemoteVoiceRef.current) {
          const previous = lastRemoteVoiceRef.current;
          const newText = previous && text.startsWith(previous)
            ? text.slice(previous.length).trim()
            : text;
          lastRemoteVoiceRef.current = text;
          if (newText) handleNewTranslationText(newText);
        }
      },
    });

    return stop;
  }, [sessionToken, sessionActive, showPostSessionSummary]);

  // Algorithme de Traitement Frizitta
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
            word: word,
            charNum: charIdx + 1,
            totalChars: word.length
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

  // Frizitta Playback Manager
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
        // Complete, reset to Neutral pose
        setCurrentLetterUrl(frizittaDb['NEUTRE'] || '');
        setCurrentLetter('');
        setCurrentWord('');
        setFrizittaIdxInfo({ num: 0, total: 0 });
        return;
      }
      
      const item = seq[idx];
      setCurrentLetterUrl(item.url);
      
      if (item.type === 'letter') {
        setCurrentLetter(item.char);
        setCurrentWord(item.word);
        setFrizittaIdxInfo({ num: item.charNum, total: item.totalChars });
      } else {
        setCurrentLetter('');
        setCurrentWord('');
        setFrizittaIdxInfo({ num: 0, total: 0 });
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
    if (frizittaPlaybackRef.current.timer) {
      clearTimeout(frizittaPlaybackRef.current.timer);
    }
    setCurrentLetter('');
    setCurrentWord('');
    setFrizittaIdxInfo({ num: 0, total: 0 });
    setCurrentLetterUrl(frizittaDb ? frizittaDb['NEUTRE'] || '' : '');
  };

  // Algorithme de Recherche Alex
  function findInAlex(word) {
    if (!alexDb) return null;
    const w = word.toLowerCase().trim();
    
    // Étape 1 : original
    let entry = alexDb.find(e => e.original.toLowerCase() === w);
    if (entry) return entry.url;
    
    // Étape 2 : synonymes
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
      // Tenter expressions composées (2 mots)
      if (i + 1 < words.length) {
        const twoWords = words[i] + ' ' + words[i+1];
        const compound = alexDb.find(e => {
          const normalized = e.original.toLowerCase().replace(/-|_/g, ' ');
          return normalized === twoWords;
        });
        if (compound) {
          sequence.push({ url: compound.url, word: twoWords });
          i += 2;
          continue;
        }
      }
      // Mot seul
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

  // Alex Double Buffer Playback Manager
  const startAlexPlayback = (sequence) => {
    stopAlexPlayback();
    
    const videoA = videoARef.current;
    const videoB = videoBRef.current;
    if (!videoA || !videoB) return;
    
    alexPlaybackRef.current.sequence = sequence;
    alexPlaybackRef.current.index = 0;
    alexPlaybackRef.current.activeVideo = 'A';
    alexPlaybackRef.current.active = true;
    
    applyAlexVideoStyles(videoA);
    applyAlexVideoStyles(videoB);
    videoA.src = '';
    videoB.src = '';
    
    const playNextAlex = () => {
      if (!alexPlaybackRef.current.active) return;
      const seqIndex = alexPlaybackRef.current.index;
      const seq = alexPlaybackRef.current.sequence;
      
      if (seqIndex >= seq.length) {
        setCurrentAlexWord('');
        setAlexIdxInfo({ num: 0, total: 0 });
        return;
      }
      
      const currentVideoId = alexPlaybackRef.current.activeVideo;
      const currentVideo = currentVideoId === 'A' ? videoA : videoB;
      const nextVideo = currentVideoId === 'A' ? videoB : videoA;
      
      const currentItem = seq[seqIndex];
      setCurrentAlexWord(currentItem.word.toUpperCase());
      setAlexIdxInfo({ num: seqIndex + 1, total: seq.length });
      
      // Pre-load next
      if (seqIndex + 1 < seq.length) {
        applyAlexVideoStyles(nextVideo);
        nextVideo.src = seq[seqIndex + 1].url;
        nextVideo.preload = 'auto';
        nextVideo.load();
      }
      
      // Timeupdate swap listener - Overriding directly to prevent memory leaks/multiple callbacks
      currentVideo.ontimeupdate = () => {
        if (currentVideo.duration - currentVideo.currentTime < 0.1) {
          currentVideo.ontimeupdate = null; // Clear listener
          alexPlaybackRef.current.index++;
          
          if (alexPlaybackRef.current.index < seq.length) {
            // Swap instantly
            nextVideo.style.opacity = '1';
            nextVideo.style.zIndex = '2';
            currentVideo.style.opacity = '0';
            currentVideo.style.zIndex = '1';
            
            nextVideo.playbackRate = 1.0;
            nextVideo.play();
            
            const nextActiveId = currentVideoId === 'A' ? 'B' : 'A';
            alexPlaybackRef.current.activeVideo = nextActiveId;
            setActiveVideo(nextActiveId);
            playNextAlex();
          } else {
            // Finished
            setCurrentAlexWord('');
            setAlexIdxInfo({ num: 0, total: 0 });
          }
        }
      };
      
      applyAlexVideoStyles(currentVideo);
      currentVideo.src = currentItem.url;
      currentVideo.playbackRate = 1.0;
      currentVideo.play();
    };
    
    playNextAlex();
  };

  const stopAlexPlayback = () => {
    alexPlaybackRef.current.active = false;
    setCurrentAlexWord('');
    setAlexIdxInfo({ num: 0, total: 0 });
    
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

  // Trigger when a new voice input / translation text arrives
  const handleNewTranslationText = (text) => {
    if (!text.trim()) return;
    
    // Add to history
    const newMessage = {
      id: generateUUID(),
      sender: 'interlocutor',
      text: text,
      timestamp: new Date().toISOString()
    };
    setTranscriptHistory(prev => [...prev, newMessage]);
    setInterlocuteurDit(text);

    // Playback based on avatar mode
    if (avatar === 'frizitta') {
      const sequence = processFrizitta(text);
      if (sequence.length > 0) {
        startFrizittaPlayback(sequence);
      }
    } else if (avatar === 'alex') {
      const { sequence, skipped } = processAlex(text);
      setAlexSkippedWords(skipped);
      if (sequence.length > 0) {
        startAlexPlayback(sequence);
      }
    }
  };

  // Toggle simulation glove signs
  const handleToggleSimulateGlove = () => {
    if (simGloveIntervalRef.current) {
      clearInterval(simGloveIntervalRef.current);
      simGloveIntervalRef.current = null;
      setSimGloveActive(false);
      showToast("⏹️ Simulation gant arrêtée");
    } else {
      setSimGloveActive(true);
      showToast("▶️ Simulation gant active (3s)");
      
      let idx = simGloveIdx;
      const glovePhrases = [
        "Bonjour",
        "Je suis",
        "content",
        "de vous",
        "rencontrer"
      ];
      
      const runStep = () => {
        const phrase = glovePhrases[idx % glovePhrases.length];
        idx++;
        setSimGloveIdx(idx);
        
        setVosSignes(`🤟 ${phrase}`);
        setSigningActive(true);
        setPulseZoneA(true);
        
        setTimeout(() => {
          setPulseZoneA(false);
        }, 400);
        
        setTimeout(() => {
          setSigningActive(false);
        }, 1500);
        
        // Save glove message to history
        setTranscriptHistory(prev => [...prev, {
          id: generateUUID(),
          sender: 'glove_user',
          text: phrase,
          timestamp: new Date().toISOString()
        }]);
        publishGloveToSession(phrase, true);
      };
      
      runStep(); // Run first immediately
      simGloveIntervalRef.current = setInterval(runStep, 3000);
    }
  };

  // Full reset and stop simulation controls
  const handleResetSession = () => {
    if (simGloveIntervalRef.current) {
      clearInterval(simGloveIntervalRef.current);
      simGloveIntervalRef.current = null;
      setSimGloveActive(false);
    }
    if (simVoiceIntervalRef.current) {
      clearInterval(simVoiceIntervalRef.current);
      simVoiceIntervalRef.current = null;
      setSimVoiceActive(false);
    }
    
    stopFrizittaPlayback();
    stopAlexPlayback();
    
    setVosSignes('🤟 En attente des signes du gant...');
    setInterlocuteurDit('');
    setAlexSkippedWords([]);
    setTranscriptHistory([]);
    
    showToast("♻️ Session réinitialisée");
  };

  // Clipboard copies
  const copyTranscript = () => {
    const txt = transcriptHistory.map(m => `[${m.sender === 'glove_user' ? 'Moi (LSF)' : 'Interlocuteur'}] ${m.text}`).join('\n');
    navigator.clipboard.writeText(txt || "Aucune conversation pour le moment.");
    showToast("✅ Transcript copié !");
  };

  // Ends session, saves transcript to localStorage
  const confirmEndSession = () => {
    if (showPostSessionSummary) return;
    setShowEndDialog(false);
    endRencontreSession(sessionToken).catch(() => {});

    // Clear simulation intervals
    if (simGloveIntervalRef.current) {
      clearInterval(simGloveIntervalRef.current);
      simGloveIntervalRef.current = null;
      setSimGloveActive(false);
    }
    if (simVoiceIntervalRef.current) {
      clearInterval(simVoiceIntervalRef.current);
      simVoiceIntervalRef.current = null;
      setSimVoiceActive(false);
    }
    
    stopFrizittaPlayback();
    stopAlexPlayback();

    const endTime = new Date().toISOString();
    const startTime = sessionStartTimeRef.current || endTime;
    const durationSec = Math.round((new Date(endTime) - new Date(startTime)) / 1000);

    const messagesSaved = transcriptHistory.map(m => ({
      id: m.id,
      sessionId: sessionToken,
      type: m.sender === 'glove_user' ? 'sign' : 'voice',
      senderRole: m.sender === 'glove_user' ? 'glove_user' : 'interlocutor',
      content: m.text,
      timestamp: m.timestamp,
      confidence: 0.95
    }));

    const newSession = {
      id: sessionToken,
      type: 'qr_code',
      startTime,
      endTime,
      duration: durationSec,
      strangerConnected: transcriptHistory.length > 0,
      messages: messagesSaved,
      avatarUsed: avatar
    };

    // Save to localStorage
    const savedSessionsStr = localStorage.getItem('sessions');
    const savedSessions = savedSessionsStr ? JSON.parse(savedSessionsStr) : [];
    savedSessions.push(newSession);
    localStorage.setItem('sessions', JSON.stringify(savedSessions));

    setFinishedSessionData(newSession);
    showToast("💾 Conversation sauvegardée dans l'historique");

    // Show summary screen with PDF download
    setShowPostSessionSummary(true);
    
    // Automatically redirect back to ÉTAT 1 after 2 seconds
    postSessionTimeoutRef.current = setTimeout(() => {
      closeSummaryAndReset();
    }, 2000);
  };

  const handlePrintPDF = () => {
    // If the user prints, we clear the auto-redirect timeout so they have unlimited time to save
    if (postSessionTimeoutRef.current) {
      clearTimeout(postSessionTimeoutRef.current);
      postSessionTimeoutRef.current = null;
    }
    window.print();
  };

  const closeSummaryAndReset = () => {
    if (postSessionTimeoutRef.current) {
      clearTimeout(postSessionTimeoutRef.current);
      postSessionTimeoutRef.current = null;
    }
    endingSessionRef.current = false;
    setShowPostSessionSummary(false);
    setSessionActive(false);
    setTranscriptHistory([]);
    setVosSignes('🤟 En attente des signes du gant...');
    setInterlocuteurDit('');
    setAlexSkippedWords([]);
    lastRemoteVoiceRef.current = '';
    generateNewQR();
  };

  return (
    <div className={`relative w-full max-w-md mx-auto select-none font-sans ${
      sessionActive && !showPostSessionSummary
        ? 'flex flex-col overflow-hidden'
        : 'bg-slate-50 min-h-[80vh] flex flex-col justify-between pb-[65px] pt-[16px]'
    }`}
    style={sessionActive && !showPostSessionSummary ? {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '100dvh',
      paddingBottom: 0,
      zIndex: 1
    } : {}}
    >
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 rounded-full text-xs font-bold text-white shadow-lg bg-[#10B981] flex items-center gap-2 animate-bounce">
          {toast.message}
        </div>
      )}

      {/* OVERLAY SÉLECTION D'AVATAR (BLOC 0) */}
      {(showAvatarOverlay || !avatar) && (
        <div className="fixed inset-0 bg-[#f8f8f8]/85 backdrop-blur-md flex flex-col justify-center p-4 z-[9999] overflow-y-auto select-none">
          <div className="w-full max-w-[420px] mx-auto flex flex-col my-auto animate-fade-in">
            <h2 className="text-center text-[22px] font-bold text-white tracking-wide uppercase leading-tight">
              CHOISISSEZ VOTRE AVATAR
            </h2>
            <p className="text-center text-[14px] text-slate-300 font-medium tracking-tight mt-1 mb-8">
              Choose your avatar / اختر الصورة الرمزية
            </p>

            <div className="flex flex-row gap-3.5 w-full items-stretch justify-center">
              
              {/* FRIZITTA CARD */}
              <div className="flex-1 bg-white rounded-[16px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] p-[20px] flex flex-col justify-between border border-slate-100">
                <div className="flex flex-col items-center text-center">
                  <span className="text-[40px] leading-none mb-2 select-none">🖐</span>
                  <h3 className="text-[18px] font-bold text-[#4F46E5] leading-tight">FRIZITTA</h3>
                  <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Avatar des lettres</span>
                  
                  <div className="w-full border-t border-slate-100 my-3" />
                  
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mb-4">
                    Épelle chaque mot lettre par lettre
                  </p>
                  
                  <ul className="text-[10px] text-slate-500 space-y-1.5 text-left w-full font-semibold">
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Noms propres
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Codes et chiffres
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Mots inconnus
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Précision totale
                    </li>
                  </ul>
                </div>
                
                <button
                  type="button"
                  onClick={() => chooseAvatar('frizitta')}
                  className="w-full h-[48px] rounded-[12px] bg-[#4F46E5] text-white font-extrabold text-[12px] shadow-md shadow-indigo-600/10 active:scale-95 transition-all mt-6 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} strokeWidth={2.25} />
                  CHOISIR FRIZITTA
                </button>
              </div>

              {/* ALEX CARD */}
              <div className="flex-1 bg-white rounded-[16px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] p-[20px] flex flex-col justify-between border border-slate-100">
                <div className="flex flex-col items-center text-center">
                  <span className="text-[40px] leading-none mb-2 select-none">🎬</span>
                  <h3 className="text-[18px] font-bold text-[#4F46E5] leading-tight">ALEX</h3>
                  <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Avatar des mots</span>
                  
                  <div className="w-full border-t border-slate-100 my-3" />
                  
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mb-4">
                    Signe des mots et phrases entiers
                  </p>
                  
                  <ul className="text-[10px] text-slate-500 space-y-1.5 text-left w-full font-semibold">
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Phrases complètes
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Vocabulaire courant
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> Conversations fluides
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> 500 mots dispos
                    </li>
                  </ul>
                </div>
                
                <button
                  type="button"
                  onClick={() => chooseAvatar('alex')}
                  className="w-full h-[48px] rounded-[12px] bg-[#4F46E5] text-white font-extrabold text-[12px] shadow-md shadow-indigo-600/10 active:scale-95 transition-all mt-6 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Clapperboard size={18} strokeWidth={2.25} />
                  CHOISIR ALEX
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* POST-SESSION SUMMARY OVERLAY (BLOC 6) */}
      {showPostSessionSummary && finishedSessionData && (
        <div className="fixed inset-0 bg-white z-[9998] flex flex-col p-6 overflow-y-auto font-sans animate-fade-in print:p-0 select-text">
          <div className="flex-grow max-w-sm mx-auto w-full flex flex-col justify-center">
            
            {/* Success Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <span className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4 shadow-inner">
                <Save size={28} strokeWidth={2} />
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Session Sauvegardée !</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">La conversation a été archivée avec succès.</p>
            </div>

            {/* Conversation Log Summary */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Détails de l'échange</h3>
              <div className="space-y-2 text-xs font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Date :</span>
                  <span className="text-slate-800">{new Date(finishedSessionData.startTime).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Durée :</span>
                  <span className="text-slate-800">{finishedSessionData.duration} secondes</span>
                </div>
                <div className="flex justify-between">
                  <span>Avatar utilisé :</span>
                  <span className="text-slate-800 capitalize">{finishedSessionData.avatarUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nombre de messages :</span>
                  <span className="text-slate-800">{finishedSessionData.messages.length}</span>
                </div>
              </div>

              {/* Messages Listing */}
              {finishedSessionData.messages.length > 0 && (
                <div className="mt-4 border-t border-slate-200/50 pt-3 max-h-[140px] overflow-y-auto space-y-2.5">
                  {finishedSessionData.messages.map((m, idx) => (
                    <div key={idx} className="text-[11px] leading-relaxed">
                      <span className={`font-bold ${m.senderRole === 'glove_user' ? 'text-indigo-600' : 'text-slate-600'}`}>
                        {m.senderRole === 'glove_user' ? 'Moi (LSF) : ' : 'Interlocuteur : '}
                      </span>
                      <span className="text-slate-700 italic">"{m.content}"</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 print:hidden">
              <button
                type="button"
                onClick={handlePrintPDF}
                className="w-full h-12 bg-[#4F46E5] text-white rounded-xl font-extrabold text-xs shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <FileText size={18} strokeWidth={2.25} />
                Exporter en PDF / Imprimer
              </button>
              <button
                type="button"
                onClick={closeSummaryAndReset}
                className="w-full h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-2"
              >
                <Home size={18} strokeWidth={2.25} />
                Retour à l'accueil rencontre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLIDING SCREEN SYSTEM FOR ÉTAT 1 & ÉTAT 2 (BLOC 2) */}
      {!showPostSessionSummary && (
        <div className="flex-grow w-full overflow-hidden flex flex-col">
          <div 
            className="flex w-[200%] h-full min-h-0 transition-transform duration-300 ease-in-out"
            style={{ transform: sessionActive ? 'translateX(-50%)' : 'translateX(0)' }}
          >
            
            {/* ==========================================
                ÉTAT 1 : QR CODE DE REJOINDRE (BLOC 1)
                ========================================== */}
            <div className="w-1/2 flex flex-col justify-between shrink-0 h-full p-6 pb-2 select-text">
              
              {/* Header */}
              <div className="text-center pt-[16px] mb-6">
                <h1 className="text-[20px] font-bold text-[#1F2937]">Nouvelle Rencontre</h1>
                <p className="text-[14px] text-[#6B7280] text-center mt-1">
                  Générez un code pour communiquer instantanément
                </p>
              </div>

              {/* QR Card Container */}
              <div className="bg-white border border-slate-100 rounded-[16px] p-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex flex-col items-center w-full max-w-sm mx-auto">
                
                {/* Interactive SVG QR Code */}
                <div className="relative p-[16px] bg-white rounded-[16px] border border-slate-100 shadow-inner mb-5">
                  <div
                    className={`transition-all duration-300 ${
                      isExpired ? 'opacity-30' : 'opacity-100'
                    }`}
                  >
                    {qrContent ? (
                      <RencontreQrCode value={qrContent} size={220} />
                    ) : (
                      <div className="w-[220px] h-[220px] bg-slate-50 rounded-lg" />
                    )}
                  </div>

                  {/* Expired overlay indicator */}
                  {isExpired && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center rounded-[16px]">
                      <span className="px-4 py-2 bg-rose-50 border border-rose-100 text-[#EF4444] font-extrabold text-[12px] rounded-full uppercase tracking-wider shadow">
                        Code Expiré
                      </span>
                    </div>
                  )}
                </div>

                {/* Expiry Label or Text status */}
                {isExpired ? (
                  <div className="text-[20px] font-extrabold text-[#EF4444] tracking-tight uppercase mb-4 mt-2">
                    Code expiré
                  </div>
                ) : (
                  <>
                    <span className="text-[13px] text-[#6B7280] mb-2 font-medium">
                      Ce code expire dans
                    </span>

                    {/* Timer MM:SS */}
                    <div className="text-[32px] font-bold text-[#4F46E5] tracking-tight tabular-nums mb-3">
                      {(() => {
                        const m = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
                        const s = (timerSeconds % 60).toString().padStart(2, '0');
                        return `${m}:${s}`;
                      })()}
                    </div>
                  </>
                )}

                {/* HSL progress bar */}
                <div className="w-full bg-[#F3F4F6] h-[6px] rounded-full overflow-hidden mb-3">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${(timerSeconds / 1800) * 100}%`,
                      backgroundColor: timerSeconds < 300 ? '#EF4444' : '#4F46E5'
                    }}
                  />
                </div>

                {/* Test sans scan du QR */}
                {!isExpired && sessionToken && (
                  <div className="w-full pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSimulateConnection}
                      disabled={sessionActive}
                      className="w-full h-[44px] bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-slate-600 rounded-[10px] font-extrabold text-[12px] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Code2 size={16} strokeWidth={2.25} />
                      Simuler la connexion
                    </button>
                    <p className="mt-2 text-[10px] text-center text-slate-400 font-semibold leading-snug px-1">
                      Test local sans scan du QR code.
                    </p>
                  </div>
                )}

              </div>

              {/* Informative text below the card */}
              <div className="my-6 space-y-2 px-3 text-[#6B7280] font-medium leading-relaxed max-w-sm mx-auto">
                <p className="text-[13px] flex items-start gap-2">
                  <Lock className="shrink-0 mt-0.5 text-[#4F46E5]" size={16} strokeWidth={2.25} />
                  <span>Valable 30 minutes maximum</span>
                </p>
                <p className="text-[13px] flex items-start gap-2">
                  <Smartphone className="shrink-0 mt-0.5 text-[#4F46E5]" size={16} strokeWidth={2.25} />
                  <span>L'autre personne scanne le QR ou ouvre le lien (interface entendante)</span>
                </p>
                {qrContent && (
                  <p className="text-[10px] text-[#9ca3af] font-mono break-all leading-snug px-1">
                    {qrContent}
                  </p>
                )}
              </div>

              {/* Primary action buttons */}
              <div className="space-y-3 w-full max-w-sm mx-auto select-none">
                <button
                  type="button"
                  onClick={generateNewQR}
                  className="w-full h-[52px] bg-[#4F46E5] text-white rounded-[12px] font-extrabold text-[14px] shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw size={20} strokeWidth={2.25} />
                  Générer un nouveau code
                </button>

                <button
                  type="button"
                  onClick={handleShareLink}
                  disabled={isExpired}
                  className="w-full h-[52px] bg-white border-2 border-[#4F46E5] text-[#4F46E5] rounded-[12px] font-extrabold text-[14px] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
                >
                  <Share2 size={20} strokeWidth={2.25} />
                  Partager le lien
                </button>
              </div>

            </div>

            {/* ==========================================
                ÉTAT 2 : SESSION ACTIVE (BLOC 3)
                ========================================== */}
            <div className="w-1/2 flex flex-col justify-between shrink-0 h-full overflow-hidden relative bg-[#F9FAFB]">
              <SessionTopBar
                title="Personne entendante"
                subtitle={
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                    Rencontre en direct
                  </>
                }
                onBack={() => setShowEndDialog(true)}
                backLabel="Quitter la rencontre"
              />

              {/* 1. ZONE A — gant — 52px — tout en haut */}
              <div className="relative h-[52px] bg-[#F9FAFB] px-3 py-2 flex flex-col items-start justify-start shrink-0 transition-colors duration-300 w-full overflow-visible">
                <div className="relative inline-flex items-center gap-2 max-w-[75%] bg-[#dcfce7] rounded-[0px_18px_18px_18px] px-3 py-2 border border-[#bbf7d0] shadow-[0_1px_2px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:top-0 before:left-[-7px] before:w-0 before:h-0 before:border-t-[8px] before:border-t-[#dcfce7] before:border-r-[8px] before:border-r-transparent">
                  <span className="text-[18px] leading-none shrink-0 select-none">🤟</span>
                  <span className="min-w-0 text-[13px] text-[#14532d] overflow-hidden text-ellipsis whitespace-nowrap leading-[13px] select-all">
                    {gloveBubble.waiting ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="animate-blink-1">●</span>
                        <span className="animate-blink-2">●</span>
                        <span className="animate-blink-3">●</span>
                      </span>
                    ) : (
                      <>
                        {gloveBubble.words.join(' ') || 'En attente des signes...'}
                        {gloveBubble.typing && <span className="animate-blink">|</span>}
                      </>
                    )}
                  </span>
                  {gantActif && (
                    <span className="text-[10px] text-[#16a34a] font-bold whitespace-nowrap shrink-0 select-none">
                      ● signing<span className="animate-blink-1">.</span><span className="animate-blink-2">.</span><span className="animate-blink-3">.</span>
                    </span>
                  )}
                </div>
                <div className="absolute left-3 bottom-[3px] text-[9px] italic text-[#9ca3af] leading-none select-none">
                  Gants
                </div>
              </div>

              {/* 2. ZONE C — interlocuteur — juste sous A */}
              <div className="bg-[#F9FAFB] px-3 py-2 flex flex-col items-end shrink-0 min-h-[80px] max-h-[140px] h-auto select-text overflow-hidden">
                <div className="relative bg-[#f3f4f6] rounded-[18px_0px_18px_18px] px-4 py-2 border border-[#e5e7eb] shadow-[0_1px_2px_rgba(0,0,0,0.06)] max-w-[75%] ml-auto before:content-[''] before:absolute before:top-0 before:right-[-7px] before:w-0 before:h-0 before:border-t-[8px] before:border-t-[#f3f4f6] before:border-l-[8px] before:border-l-transparent">
                  <span className="block text-[11px] italic text-[#6B7280] mb-[4px] select-none">
                    🗣️ L'interlocuteur dit :
                  </span>
                  <div className="text-[14px] font-normal text-[#1f2937] leading-[19px] max-h-[57px] overflow-y-auto pr-1">
                    {voiceBubble.waiting ? (
                      <span className="inline-flex items-center gap-1 text-[#6B7280]">
                        <span className="animate-blink-1">●</span>
                        <span className="animate-blink-2">●</span>
                        <span className="animate-blink-3">●</span>
                      </span>
                    ) : voiceBubble.words.length > 0 ? (
                      <span className="flex flex-wrap gap-x-1">
                        {voiceBubble.words.map((word, wIdx) => (
                          <span key={`${word}-${wIdx}`} className="animate-fade-in inline-block">
                            {word}
                          </span>
                        ))}
                        {voiceBubble.typing && <span className="animate-blink">|</span>}
                      </span>
                    ) : (
                      '...'
                    )}
                  </div>
                </div>
                <div className="mt-[3px] text-[9px] italic text-[#9ca3af] leading-none text-right max-w-[75%] select-none">
                  🎙️ Voix
                </div>
              </div>

              {/* 3. CADRE AVATAR — ratio 3:4 strict, boutons en dessous */}
              <div className="flex min-h-0 flex-grow flex-col items-center justify-center gap-4 overflow-hidden bg-[#F9FAFB] px-3 py-2">
                <div
                  className={`avatar-container${
                    modeAvatar === 'alex'
                      ? ' avatar-container--alex'
                      : ' avatar-container--frizitta'
                  }`}
                >
                  <div className="avatar-inner">
                    {modeAvatar === 'frizitta' && (
                      <div
                        className="flex h-full w-full items-center justify-center overflow-hidden"
                        id="frizitta-player"
                      >
                        <AvatarStage
                          src={
                            currentLetterUrl ||
                            (frizittaDb ? frizittaDb.NEUTRE || '' : '')
                          }
                        />
                      </div>
                    )}

                    {modeAvatar === 'alex' && (
                      <div className="flex h-full w-full items-center justify-center">
                        <AlexStage
                          videoARef={videoARef}
                          videoBRef={videoBRef}
                          activeVideo={activeVideo}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="avatar-actions shrink-0">
                  <button
                    type="button"
                    onClick={envoyerSigneSimule}
                    disabled={conversationTurn !== 'deaf'}
                    className="avatar-action-btn avatar-action-btn--avatar disabled:opacity-40"
                    aria-label="Envoyer un signe"
                  >
                    <Hand size={22} strokeWidth={2.25} />
                    <span>{conversationTurn === 'deaf' ? 'Signer' : 'Attente…'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopFrizittaPlayback();
                      stopAlexPlayback();
                      setShowAvatarOverlay(true);
                    }}
                    className="avatar-action-btn avatar-action-btn--avatar"
                    aria-label="Changer d'avatar"
                  >
                    <UserRound size={22} strokeWidth={2.25} />
                    <span>Avatar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEndDialog(true)}
                    className="avatar-action-btn avatar-action-btn--end"
                    aria-label="Terminer la session"
                  >
                    <CircleStop size={22} strokeWidth={2.25} />
                    <span>Terminer</span>
                  </button>
                </div>
              </div>

            </div>


          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOGUE MODAL */}
      {showEndDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[10000] select-none">
          <div className="bg-white rounded-[16px] p-5 w-full max-w-[280px] shadow-2xl border border-slate-100 text-center animate-fade-in">
            <h3 className="text-sm font-extrabold text-slate-800">Terminer la session ?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-semibold">
              La session sera clôturée et l'historique sera sauvegardé.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowEndDialog(false)}
                className="flex-1 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs active:scale-95 transition-transform cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X size={16} strokeWidth={2.5} />
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmEndSession}
                className="flex-1 h-9 rounded-lg bg-[#EF4444] hover:bg-red-650 text-white font-extrabold text-xs active:scale-95 transition-transform cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check size={16} strokeWidth={2.5} />
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
