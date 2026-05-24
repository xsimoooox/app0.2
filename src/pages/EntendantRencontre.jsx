import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Hand, Mic } from 'lucide-react';
import ZoneDActionBar from '../components/ZoneDActionBar';
import SessionTopBar from '../components/SessionTopBar';
import { useImmersiveSession } from '../context/ImmersiveSessionContext';
import { parseSessionIdFromJoinInput } from '../lib/appUrl';
import {
  endRencontreSession,
  getClientUid,
  getRencontreSession,
  getSpeechLang,
  joinRencontreSession,
  listenRencontreSession,
  sendRencontreGlove,
  sendRencontreVoice,
} from '../lib/firebaseRealtime';

const GLOVE_SIM_EN = [
  'Hello, nice to meet you',
  'I am deaf, I use sign language',
  'Thank you for helping me',
  'How are you today?',
  'I understand what you are saying',
];

function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function RencontreToast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  const bg = type === 'success' ? '#16a34a' : type === 'error' ? '#ef4444' : '#6366f1';

  return (
    <div
      className="fixed left-1/2 z-[10001] -translate-x-1/2 whitespace-nowrap rounded-[20px] px-5 py-2.5 text-[12px] font-semibold shadow-lg"
      style={{ bottom: 80, background: bg, color: '#fff', animation: 'fadeInWord 200ms ease' }}
    >
      {message}
    </div>
  );
}

export default function EntendantRencontre() {
  const { sessionId: routeSessionId } = useParams();
  const location = useLocation();
  const { setImmersiveSession } = useImmersiveSession();

  const [etat, setEtat] = useState('scan');
  const [sessionToken, setSessionToken] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [avatarUsed, setAvatarUsed] = useState(null);
  const [isMicroOn, setIsMicroOn] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [showTextComposer, setShowTextComposer] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [partnerName, setPartnerName] = useState('Interlocuteur');
  const [zoneAText, setZoneAText] = useState('');
  const [zoneCText, setZoneCText] = useState('');
  const [gloveTime, setGloveTime] = useState(null);
  const [voiceTime, setVoiceTime] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const [linkBorder, setLinkBorder] = useState('#e0e0e0');
  const [toast, setToast] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanError, setScanError] = useState('');
  const [conversationTurn, setConversationTurn] = useState('hearing');
  const [gloveSimIdx, setGloveSimIdx] = useState(0);
  const scanHandledRef = useRef(false);

  const html5QrCodeRef = useRef(null);
  const recognitionRef = useRef(null);
  const stopListenRef = useRef(null);
  const bcRef = useRef(null);
  const devIntervalRef = useRef(null);
  const lastGloveRef = useRef('');
  const finalTranscriptRef = useRef('');
  const isMicroOnRef = useRef(false);
  const isSoundOnRef = useRef(true);
  const sessionMessagesRef = useRef([]);
  const mountedRef = useRef(true);
  const etat1Ref = useRef(null);

  const showToastMsg = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const appendMessage = useCallback((msg) => {
    setSessionMessages((prev) => {
      const next = [...prev, msg];
      sessionMessagesRef.current = next;
      return next;
    });
    return msg;
  }, []);

  const speakSignText = useCallback((text) => {
    if (!isSoundOnRef.current || !text?.trim()) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((v) => v.lang === 'en-US' || v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;
    window.speechSynthesis.speak(utterance);
  }, []);

  const afficherSignText = useCallback((text) => {
    if (!text?.trim()) return;
    const cleaned = text.replace(/^🤟\s*/, '').trim();
    const ts = new Date().toISOString();
    setZoneAText(cleaned);
    setGloveTime(ts);

    appendMessage({ type: 'sign', content: cleaned, timestamp: ts });
    speakSignText(cleaned);
  }, [appendMessage, speakSignText]);

  const afficherVoixEnTempsReel = useCallback((text) => {
    if (!text?.trim()) return;
    setZoneCText(text);
  }, []);

  const envoyerVoixTexte = useCallback((text, token) => {
    if (!text?.trim() || !token) return;
    if (conversationTurn !== 'hearing') {
      showToastMsg('⏳ Attendez la réponse de l\'interlocuteur sourd', 'info');
      return;
    }
    const now = new Date().toISOString();
    const lang = getSpeechLang('Anglais');

    setZoneCText(text.trim());
    setVoiceTime(now);
    appendMessage({ type: 'voice', content: text.trim(), timestamp: now });
    sendRencontreVoice(token, { text: text.trim(), isFinal: true, lang })
      .then(() => setConversationTurn('deaf'))
      .catch(() => showToastMsg('❌ Envoi voix impossible', 'error'));

    if (bcRef.current) {
      bcRef.current.postMessage({ type: 'VOICE_TEXT', text: text.trim(), timestamp: now });
    }
  }, [appendMessage, conversationTurn, showToastMsg]);

  const resetScanUI = useCallback(() => {
    setShowReader(false);
    setIsScanning(false);
    setCameraReady(false);
    setScanError('');
    scanHandledRef.current = false;
  }, []);

  const stopQRScan = useCallback(async () => {
    const scanner = html5QrCodeRef.current;
    if (scanner) {
      try {
        await scanner.stop();
        await scanner.clear();
      } catch {
        /* ignore */
      }
    }
    html5QrCodeRef.current = null;
    resetScanUI();
  }, [resetScanUI]);

  const rejoindreAvecTokenRef = useRef(null);

  const onQRDecoded = useCallback((decodedText) => {
    if (scanHandledRef.current) return;
    const token = parseSessionIdFromJoinInput(decodedText);
    const isJoinLink = decodedText.includes('/join/') || token;
    if (!isJoinLink || !token) {
      setScanError('QR code non reconnu. Scannez un QR WakWak.');
      return;
    }
    scanHandledRef.current = true;
    setLinkInput(decodedText);
    setScanError('');
    showToastMsg('🔍 Connexion en cours…', 'info');
    rejoindreAvecTokenRef.current?.(token);
  }, [showToastMsg]);

  const startQRScan = useCallback(async () => {
    if (isScanning || html5QrCodeRef.current) return;
    setShowReader(true);
    setScanError('');
    setCameraReady(false);
    scanHandledRef.current = false;

    const config = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0,
      disableFlip: false,
    };

    const onSuccess = (decodedText) => {
      console.log('[SCANNER] QR decoded:', decodedText);
      onQRDecoded(decodedText);
    };

    try {
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;
      await scanner.start(
        { facingMode: { exact: 'environment' } },
        config,
        onSuccess,
        () => {},
      );
      setIsScanning(true);
      setCameraReady(true);
      console.log('[SCANNER] Camera started (rear)');
    } catch (err) {
      console.error('[SCANNER] Error:', err);
      try {
        const scanner = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          config,
          onSuccess,
          () => {},
        );
        setIsScanning(true);
        setCameraReady(true);
        console.log('[SCANNER] Camera started (rear, fallback)');
      } catch (err2) {
        console.error('[SCANNER] Fallback error:', err2);
        setScanError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
        showToastMsg('❌ Caméra inaccessible', 'error');
        resetScanUI();
      }
    }
  }, [isScanning, onQRDecoded, resetScanUI, showToastMsg]);

  const demarrerMicro = useCallback((token) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToastMsg('❌ Web Speech API non supporté', 'error');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      isMicroOnRef.current = true;
      setIsMicroOn(true);
    };

    recognition.onresult = (event) => {
      if (!isMicroOnRef.current) return;
      let interim = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const t = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalChunk += t;
        else interim += t;
      }
      if (finalChunk.trim()) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalChunk}`.trim();
      }
      const display = finalTranscriptRef.current || interim;
      if (display) afficherVoixEnTempsReel(display);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        showToastMsg('❌ Microphone refusé', 'error');
        setIsMicroOn(false);
      }
    };

    recognition.onend = () => {
      if (mountedRef.current && isMicroOnRef.current) {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    };

    try {
      recognition.start();
    } catch {
      showToastMsg('❌ Impossible de démarrer le micro', 'error');
    }
  }, [afficherVoixEnTempsReel, envoyerVoixTexte, showToastMsg]);

  const demarrerSession = useCallback((token) => {
    setZoneAText('');
    setZoneCText('');
    setGloveTime(null);
    setVoiceTime(null);
    setSessionMessages([]);
    sessionMessagesRef.current = [];
    lastGloveRef.current = '';
    finalTranscriptRef.current = '';
    setEtat('active');

    requestAnimationFrame(() => {
      if (etat1Ref.current) {
        etat1Ref.current.style.transform = 'translateX(0)';
      }
    });

    setIsMicroOn(false);
    isMicroOnRef.current = false;
    setShowTextComposer(false);
    setTypedMessage('');
    showToastMsg('✅ Session active !', 'success');
  }, [showToastMsg]);

  const cleanupSession = useCallback(() => {
    if (devIntervalRef.current) clearInterval(devIntervalRef.current);
    if (stopListenRef.current) stopListenRef.current();
    stopListenRef.current = null;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    if (bcRef.current) {
      bcRef.current.close();
      bcRef.current = null;
    }
    stopQRScan();
  }, [stopQRScan]);

  const terminerSession = useCallback((local = true, token) => {
    const id = token || sessionToken;
    if (local && id) {
      endRencontreSession(id).catch(() => {});
      if (bcRef.current) {
        bcRef.current.postMessage({ type: 'SESSION_END' });
      }
    }

    isMicroOnRef.current = false;
    setIsMicroOn(false);
    cleanupSession();

    if (id && sessionStartTime) {
      const endTime = new Date().toISOString();
      const duration = Math.round((new Date(endTime) - new Date(sessionStartTime)) / 1000);
      try {
        const existing = JSON.parse(localStorage.getItem('sessions') || '[]');
        existing.push({
          id: genUUID(),
          type: 'qr_joined',
          role: 'hearing',
          sessionToken: id,
          startTime: sessionStartTime,
          endTime,
          duration,
          avatarUsed: avatarUsed || 'unknown',
          messages: sessionMessagesRef.current,
        });
        localStorage.setItem('sessions', JSON.stringify(existing));
      } catch {
        /* ignore */
      }
    }

    showToastMsg('💾 Conversation sauvegardée', 'success');

    setTimeout(() => {
      if (etat1Ref.current) {
        etat1Ref.current.style.transform = 'translateX(100%)';
      }
      setTimeout(() => {
        setEtat('scan');
        setSessionToken(null);
        setSessionStartTime(null);
        setSessionMessages([]);
        setAvatarUsed(null);
        setLinkInput('');
        setZoneAText('');
        setZoneCText('');
        setGloveTime(null);
        setVoiceTime(null);
        setPartnerName('Interlocuteur');
        lastGloveRef.current = '';
      }, 300);
    }, 2000);
  }, [avatarUsed, cleanupSession, sessionStartTime, sessionToken, showToastMsg]);

  const rejoindreAvecToken = useCallback(async (token) => {
    if (!token) return;
    setSessionToken(token);
    showToastMsg('🔍 Connexion à la session...', 'info');

    try {
      const session = await getRencontreSession(token);
      if (!session) {
        showToastMsg('❌ Session introuvable ou expirée', 'error');
        setSessionToken(null);
        scanHandledRef.current = false;
        return;
      }
      if (session.expiresAt && Date.now() > session.expiresAt) {
        showToastMsg('❌ Session expirée', 'error');
        setSessionToken(null);
        scanHandledRef.current = false;
        return;
      }
      if (session.status === 'ended') {
        showToastMsg('❌ Session terminée', 'error');
        setSessionToken(null);
        scanHandledRef.current = false;
        return;
      }

      await joinRencontreSession(token, getClientUid('hearing'));
      setSessionStartTime(new Date().toISOString());
      setAvatarUsed('alex');
      setPartnerName(session.hostDisplayName || 'Interlocuteur');

      try {
        bcRef.current = new BroadcastChannel(token);
        bcRef.current.onmessage = (e) => {
          const msg = e.data;
          if (msg?.type === 'SIGN_TEXT') afficherSignText(msg.text);
          if (msg?.type === 'SESSION_END') terminerSession(false, token);
        };
        bcRef.current.postMessage({
          type: 'PEER_JOINED',
          role: 'hearing',
          timestamp: new Date().toISOString(),
        });
      } catch {
        /* BroadcastChannel unavailable */
      }

      stopListenRef.current = listenRencontreSession(token, {
        onMeta: (meta) => {
          if (meta.turn) setConversationTurn(meta.turn);
          if (meta.status === 'ended') {
            terminerSession(false, token);
          }
        },
        onGlove: (glove) => {
          const text = (glove?.text || '').replace(/^🤟\s*/, '').trim();
          if (!text || text === lastGloveRef.current) return;
          if (glove.isFinal === false && text.length < 2) return;
          lastGloveRef.current = text;
          afficherSignText(text);
          if (glove.isFinal) setConversationTurn('hearing');
        },
      });

      await stopQRScan();
      demarrerSession(token);
    } catch {
      showToastMsg('❌ Impossible de rejoindre la session', 'error');
      setSessionToken(null);
      scanHandledRef.current = false;
    }
  }, [afficherSignText, demarrerSession, showToastMsg, stopQRScan, terminerSession]);

  rejoindreAvecTokenRef.current = rejoindreAvecToken;

  const rejoindreSession = () => {
    const token = parseSessionIdFromJoinInput(linkInput);
    if (!token) {
      showToastMsg('❌ Lien invalide ou incomplet', 'error');
      return;
    }
    rejoindreAvecToken(token);
  };

  const detectSessionToken = (value) => {
    const token = parseSessionIdFromJoinInput(value);
    setLinkBorder(token ? '#16a34a' : '#e0e0e0');
  };

  /** Accès direct : rejoint le lien saisi ou mode simulation locale. */
  const handleSimuler = () => {
    const token = parseSessionIdFromJoinInput(linkInput);
    if (token) {
      rejoindreAvecToken(token);
      return;
    }
    simulerConnexion();
  };

  const simulerConnexion = () => {
    const token = genUUID();
    setSessionToken(token);
    setAvatarUsed('alex');
    setPartnerName('Alex');
    setSessionStartTime(new Date().toISOString());
    setSessionMessages([]);

    try {
      bcRef.current = new BroadcastChannel(token);
      bcRef.current.onmessage = (e) => {
        if (e.data?.type === 'SIGN_TEXT') afficherSignText(e.data.text);
        if (e.data?.type === 'SESSION_END') terminerSession(false, token);
      };
    } catch {
      /* ignore */
    }

    demarrerSession(token);
    showToastMsg('✅ Session simulée active', 'success');

    setConversationTurn('deaf');
    afficherSignText(GLOVE_SIM_EN[0]);
    setGloveSimIdx(1);
  };

  const simulerGantsAnglais = () => {
    const phrase = GLOVE_SIM_EN[gloveSimIdx % GLOVE_SIM_EN.length];
    setGloveSimIdx((i) => i + 1);
    afficherSignText(phrase);
    if (sessionToken) {
      sendRencontreGlove(sessionToken, { text: phrase, isFinal: true }).catch(() => {});
      setConversationTurn('hearing');
    }
    showToastMsg('🤟 Signe simulé (EN) affiché', 'success');
  };

  const postBc = (payload) => {
    if (bcRef.current) bcRef.current.postMessage(payload);
  };

  const arreterMicroEtEnvoyer = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    const text = finalTranscriptRef.current.trim();
    finalTranscriptRef.current = '';
    if (text && sessionToken) {
      envoyerVoixTexte(text, sessionToken);
    }
    postBc({ type: 'MIC_OFF', role: 'hearing', timestamp: new Date().toISOString() });
  }, [envoyerVoixTexte, sessionToken]);

  const toggleMicro = () => {
    if (!sessionToken) return;
    if (conversationTurn !== 'hearing') {
      showToastMsg('⏳ Attendez la réponse sourde avant de parler', 'info');
      return;
    }
    if (isMicroOn) {
      isMicroOnRef.current = false;
      setIsMicroOn(false);
      setTimeout(() => arreterMicroEtEnvoyer(), 350);
    } else {
      if (showTextComposer) setShowTextComposer(false);
      finalTranscriptRef.current = '';
      isMicroOnRef.current = true;
      setIsMicroOn(true);
      setZoneCText('');
      demarrerMicro(sessionToken);
      postBc({ type: 'MIC_ON', role: 'hearing', timestamp: new Date().toISOString() });
    }
  };

  const toggleMuteSound = () => {
    const next = !isSoundOn;
    isSoundOnRef.current = next;
    setIsSoundOn(next);
    if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      showToastMsg('🔇 Son coupé', 'info');
    } else if (next) {
      showToastMsg('🔊 Son activé', 'info');
    }
  };

  const toggleTextComposer = () => {
    if (isMicroOn) {
      isMicroOnRef.current = false;
      setIsMicroOn(false);
      setTimeout(() => arreterMicroEtEnvoyer(), 350);
    }
    setShowTextComposer((prev) => !prev);
  };

  const sendTypedMessage = () => {
    const text = typedMessage.trim();
    if (!text) {
      showToastMsg('Saisissez un message', 'info');
      return;
    }
    if (!sessionToken) return;
    if (conversationTurn !== 'hearing') {
      showToastMsg('⏳ Attendez votre tour pour envoyer', 'info');
      return;
    }
    envoyerVoixTexte(text, sessionToken);
    setTypedMessage('');
    showToastMsg('✅ Message envoyé', 'success');
  };

  const terminerSessionActive = useCallback(() => {
    isMicroOnRef.current = false;
    setIsMicroOn(false);
    setShowTextComposer(false);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    finalTranscriptRef.current = '';
    postBc({ type: 'SESSION_END', role: 'hearing', timestamp: new Date().toISOString() });
    terminerSession(true, sessionToken);
  }, [sessionToken, terminerSession]);

  const confirmerTerminer = () => {
    if (window.confirm('Terminer la session ?\n\nLa conversation sera sauvegardée.')) {
      terminerSessionActive();
    }
  };

  const handleBackFromSession = () => {
    if (
      window.confirm(
        'Quitter la session Rencontre ?\n\nLa conversation sera sauvegardée et vous reviendrez à l\'écran de connexion.',
      )
    ) {
      terminerSessionActive();
    }
  };

  // Précharge les voix TTS anglaises (requis sur Chrome / Safari)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
    const warmVoices = () => window.speechSynthesis.getVoices();
    warmVoices();
    window.speechSynthesis.onvoiceschanged = warmVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupSession();
    };
  }, [cleanupSession]);

  useEffect(() => {
    if (etat === 'scan' && !isScanning && !showReader) {
      startQRScan();
    }
  }, [etat]);

  useEffect(() => {
    const fromRoute = routeSessionId;
    const fromState = location.state?.sessionId;
    const token = fromRoute || fromState;
    if (token && etat === 'scan') {
      rejoindreAvecToken(token);
    }
  }, [routeSessionId, location.state?.sessionId]);

  useEffect(() => {
    if (etat === 'active' && etat1Ref.current) {
      etat1Ref.current.style.transform = 'translateX(100%)';
      requestAnimationFrame(() => {
        if (etat1Ref.current) etat1Ref.current.style.transform = 'translateX(0)';
      });
    }
  }, [etat]);

  useEffect(() => {
    setImmersiveSession(etat === 'active');
    return () => setImmersiveSession(false);
  }, [etat, setImmersiveSession]);

  return (
    <div
      id="tab-rencontre"
      className={`flex flex-col w-full max-w-md mx-auto bg-white text-[#111111] select-none ${
        etat === 'active' ? 'h-[100dvh]' : 'h-[calc(100dvh-65px)]'
      }`}
    >
      {toast && (
        <RencontreToast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {/* ÉTAT 0 — Scanner */}
      {etat === 'scan' && (
        <div
          id="rencontre-etat0"
          className="flex flex-col flex-1 overflow-y-auto pt-4 pb-[74px]"
        >
          <div className="text-center mb-4 px-4">
            <p className="text-[13px] font-bold text-[#111111] m-0 mb-1">Rejoindre une session</p>
            <p className="text-[10px] text-[#777777] font-semibold m-0">Scannez le QR code de votre interlocuteur sourd</p>
          </div>

          <div className="bg-[#ffffff] border border-[#e5e5e5] rounded-[16px] p-5 mx-3.5 mb-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div
              id="qr-camera-zone"
              className="relative w-[240px] h-[240px] mx-auto mb-3 bg-white rounded-[12px] border-2 border-[#6366f1] flex items-center justify-center overflow-hidden"
            >
              <div className="rencontre-corner-tl absolute top-2 left-2 w-5 h-5 border-t-[3px] border-l-[3px] border-[#6366f1] rounded-tl-[3px]" />
              <div className="rencontre-corner-tr absolute top-2 right-2 w-5 h-5 border-t-[3px] border-r-[3px] border-[#6366f1] rounded-tr-[3px]" />
              <div className="rencontre-corner-bl absolute bottom-2 left-2 w-5 h-5 border-b-[3px] border-l-[3px] border-[#6366f1] rounded-bl-[3px]" />
              <div className="rencontre-corner-br absolute bottom-2 right-2 w-5 h-5 border-b-[3px] border-r-[3px] border-[#6366f1] rounded-br-[3px]" />

              {!cameraReady && !scanError && (
                <div id="qr-placeholder" className="absolute inset-0 z-[1] flex flex-col items-center justify-center text-center bg-white/80">
                  <i className="ti ti-camera text-[40px] text-[#6366f1]" />
                  <p className="text-[10px] text-[#888888] font-semibold mt-2 mb-0 px-4">
                    Démarrage de la caméra arrière…
                  </p>
                </div>
              )}
              <div
                id="qr-reader"
                className={`w-full h-full ${showReader ? 'block' : 'hidden'}`}
              />
            </div>

            {cameraReady && (
              <p className="text-[10px] text-[#16a34a] font-bold text-center mb-2">
                Caméra active — Pointez vers le QR code
              </p>
            )}
            {scanError && (
              <p className="text-[10px] text-[#ef4444] font-bold text-center mb-2">{scanError}</p>
            )}

            {isScanning ? (
              <button
                id="btn-stop-scan"
                type="button"
                onClick={stopQRScan}
                className="w-full h-9 bg-white border border-[#e0e0e0] rounded-lg text-[#666666] text-[12px] font-semibold cursor-pointer mb-2"
              >
                <i className="ti ti-x mr-1.5" />
                Arrêter le scan
              </button>
            ) : (
              <button
                id="btn-start-scan"
                type="button"
                onClick={startQRScan}
                className="w-full h-9 bg-white border border-[#6366f1] rounded-lg text-[#6366f1] text-[12px] font-bold cursor-pointer mb-2"
              >
                <i className="ti ti-camera mr-1.5" />
                Activer le scanner
              </button>
            )}

            <button
              type="button"
              onClick={handleSimuler}
              className="w-full h-10 bg-white hover:bg-[#fafafa] border border-[#e0e0e0] rounded-[10px] text-[#6366f1] text-[12px] font-extrabold cursor-pointer mb-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <i className="ti ti-plug text-[15px]" />
              Simuler
            </button>
            <p className="text-[9px] text-[#888888] font-semibold text-center m-0 mb-4 leading-snug px-1">
              Accès direct sans scan — utilise le lien ci-dessous s&apos;il est renseigné, sinon mode test local.
            </p>

            <div className="h-px bg-[#e5e5e5] mb-3" />
            <p className="text-[10px] text-[#777777] font-semibold text-center m-0 mb-2.5">ou entrez le lien manuellement</p>

            <input
              id="input-session-link"
              type="text"
              value={linkInput}
              onChange={(e) => {
                setLinkInput(e.target.value);
                detectSessionToken(e.target.value);
              }}
              placeholder="https://…/join/xxxxxxxx"
              className="w-full box-border bg-white border rounded-lg py-2.5 px-3 text-[11px] text-[#333333] font-semibold outline-none focus:border-[#6366f1]"
              style={{ borderColor: linkBorder }}
            />

            <button
              type="button"
              onClick={rejoindreSession}
              className="w-full h-11 bg-[#16a34a] border-none rounded-[10px] text-white text-[12px] font-bold cursor-pointer mt-3"
            >
              Rejoindre la session
            </button>
          </div>

          <p className="text-[11px] text-[#777777] font-semibold text-center m-0 mb-1">Connexion sécurisée et chiffrée</p>
          <p className="text-[11px] text-[#777777] font-semibold text-center m-0 mb-4">Aucune application requise côté sourd</p>
        </div>
      )}

      {/* ÉTAT 1 — Session active */}
      {etat === 'active' && (
        <div
          id="rencontre-etat1"
          ref={etat1Ref}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
          style={{ transform: 'translateX(0)', transition: 'transform 300ms ease' }}
        >
          <SessionTopBar
            title={partnerName}
            subtitle={
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
                Session en direct
              </>
            }
            onBack={handleBackFromSession}
            backLabel="Quitter la session"
          />

          <div
            id="zones-parole"
            className="flex-1 min-h-0 flex flex-col justify-center gap-5 px-4 py-5 bg-white overflow-hidden"
          >
            {/* Zone 1 — parole des gants (interlocuteur sourd) */}
            <div className="flex justify-start w-full animate-fade-in">
              <div
                id="zone-parole-gants"
                className="relative w-full max-w-[min(100%,340px)] min-h-[120px] bg-[#f3e8ff] border border-[#e9d5ff] rounded-[4px_20px_20px_20px] shadow-[0_2px_8px_rgba(139,92,246,0.08)] px-4 py-4 pr-12"
              >
                <div className="absolute -left-1 top-3 w-9 h-9 rounded-full bg-[#ede9fe] border-2 border-[#f3e8ff] flex items-center justify-center shadow-sm">
                  <Hand size={16} strokeWidth={2.25} className="text-[#7c3aed]" />
                </div>
                <p className="text-[10px] font-bold text-[#7c3aed] uppercase tracking-wide m-0 mb-2 pl-7">
                  {partnerName}
                </p>
                <p
                  id="zone-a-text"
                  className={`text-[17px] font-semibold leading-snug m-0 pl-7 break-words ${
                    zoneAText ? 'text-[#4c1d95]' : 'text-[#a78bfa] italic'
                  }`}
                >
                  {zoneAText || 'En attente des signes des gants…'}
                </p>
                {gloveTime && zoneAText && (
                  <p className="text-[10px] text-[#8b5cf6] m-0 mt-2 pl-7 text-right font-semibold">
                    {new Date(gloveTime).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Zone 2 — parole de l'entendant */}
            <div className="flex justify-end w-full animate-fade-in">
              <div
                id="zone-parole-entendant"
                className={`relative w-full max-w-[min(100%,340px)] min-h-[120px] rounded-[20px_4px_20px_20px] border shadow-[0_2px_8px_rgba(22,163,74,0.08)] px-4 py-4 pl-12 ${
                  isMicroOn
                    ? 'bg-[#c8f5d4] border-[#86efac] ring-2 ring-[#16a34a]/20'
                    : 'bg-[#dcf8c6] border-[#bbf7d0]'
                }`}
              >
                <div className="absolute -right-1 top-3 w-9 h-9 rounded-full bg-[#e8f5e9] border-2 border-[#dcf8c6] flex items-center justify-center shadow-sm">
                  <Mic size={16} strokeWidth={2.25} className="text-[#16a34a]" />
                </div>
                <p className="text-[10px] font-bold text-[#15803d] uppercase tracking-wide m-0 mb-2 pr-7 text-right">
                  Vous
                </p>
                <p
                  id="zone-c-text"
                  className={`text-[17px] font-semibold leading-snug m-0 pr-7 break-words text-right ${
                    zoneCText
                      ? 'text-[#14532d]'
                      : isMicroOn
                        ? 'text-[#16a34a]'
                        : 'text-[#86efac] italic'
                  }`}
                >
                  {zoneCText ||
                    (isMicroOn ? 'Écoute en cours… parlez maintenant' : 'Votre message apparaîtra ici')}
                </p>
                {voiceTime && zoneCText && !isMicroOn && (
                  <p className="text-[10px] text-[#5a8a5a] m-0 mt-2 pr-7 text-left font-semibold">
                    {new Date(voiceTime).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {showTextComposer && (
            <div
              id="zone-ecriture"
              className="shrink-0 border-t border-[#e5e5e5] bg-[#ffffff] p-3 flex flex-col gap-2"
            >
              <p className="text-[10px] font-bold text-[#777777] m-0 uppercase tracking-wide">
                Message écrit
              </p>
              <textarea
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder="Saisissez votre message…"
                rows={3}
                className="w-full resize-none rounded-[10px] border border-[#e0e0e0] bg-white px-3 py-2 text-[12px] font-semibold text-[#333333] outline-none focus:border-[#6366f1]"
              />
              <button
                type="button"
                onClick={sendTypedMessage}
                className="h-10 w-full rounded-[10px] bg-[#16a34a] text-white text-[12px] font-bold active:scale-[0.98]"
              >
                Envoyer à l&apos;interlocuteur
              </button>
            </div>
          )}

          <div className="shrink-0 px-3 pb-1">
            <button
              type="button"
              onClick={simulerGantsAnglais}
              className="w-full h-9 rounded-[10px] border border-[#c4b5fd] bg-[#f5f0ff] text-[#6366f1] text-[11px] font-extrabold active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Hand size={14} strokeWidth={2.25} />
              Simuler signes gants (EN)
            </button>
            {conversationTurn !== 'hearing' && (
              <p className="text-[9px] text-center text-[#16a34a] font-bold mt-1 m-0">
                ⏳ Écoutez / visualisez — votre tour après la réponse sourde
              </p>
            )}
            {conversationTurn === 'hearing' && (
              <p className="text-[9px] text-center text-[#6366f1] font-bold mt-1 m-0">
                🎙️ À vous de parler — micro puis relâchez pour envoyer
              </p>
            )}
          </div>

          <ZoneDActionBar
            variant="hearingRencontre"
            className="shrink-0"
            micOn={isMicroOn}
            soundOn={isSoundOn}
            composerOpen={showTextComposer}
            onMicro={toggleMicro}
            onMute={toggleMuteSound}
            onComposer={toggleTextComposer}
            onEnd={confirmerTerminer}
          />
        </div>
      )}
    </div>
  );
}
