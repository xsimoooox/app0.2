import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { canSpeakNow } from '../lib/turnTaking';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const CALL_TIMEOUT_MS = 30000;

function playFallbackRingtone() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 440;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, 800);
  } catch {
    /* ignore */
  }
}

export function useCallSystem(myPhoneNumber, myRole, { onToast } = {}) {
  const socketRef = useRef(null);
  const ringtoneRef = useRef(null);
  const timeoutRef = useRef(null);
  const recognitionRef = useRef(null);
  const micActiveRef = useRef(false);
  const ttsActiveRef = useRef(true);
  const fallbackAudioRef = useRef(null);
  const fallbackOscRef = useRef(null);
  const lastVoiceTextRef = useRef('');
  const voiceDebounceRef = useRef(null);

  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [onlineContacts, setOnlineContacts] = useState({});
  const [receivedText, setReceivedText] = useState('');
  const [sentVoiceText, setSentVoiceText] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [turnHolder, setTurnHolder] = useState(null);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }
    if (fallbackOscRef.current) {
      clearInterval(fallbackOscRef.current);
      fallbackOscRef.current = null;
    }
  }, []);

  const playRingtone = useCallback(() => {
    stopRingtone();
    try {
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.volume = 0.8;
      ringtoneRef.current = audio;
      audio.play().catch(() => {
        fallbackOscRef.current = setInterval(playFallbackRingtone, 1600);
        playFallbackRingtone();
      });
    } catch {
      fallbackOscRef.current = setInterval(playFallbackRingtone, 1600);
      playFallbackRingtone();
    }
  }, [stopRingtone]);

  const vibratePhone = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([400, 200, 400, 200, 400, 200, 400]);
    }
  }, []);

  const showBrowserNotification = useCallback((callerName, callerPhone) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification('📞 Appel entrant — WakWak', {
      body: `${callerName || callerPhone} vous appelle`,
      icon: '/icons/icon-192.png',
      tag: 'incoming-call',
      requireInteraction: true,
    });
  }, []);

  const clearCallTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopMic = useCallback(() => {
    micActiveRef.current = false;
    clearTimeout(voiceDebounceRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setSentVoiceText('');
    lastVoiceTextRef.current = '';
  }, []);

  const speakText = useCallback((text) => {
    if (!ttsActiveRef.current || !text?.trim()) return;
    if (typeof window === 'undefined') return;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
      window.speechSynthesis.speak(utterance);
      return;
    }

    const enc = encodeURIComponent(text);
    const audio = new Audio(
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${enc}&tl=en&client=tw-ob`,
    );
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
    }
    fallbackAudioRef.current = audio;
    audio.play().catch(() => {});
  }, []);

  const startMic = useCallback(
    (targetPhone) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR || !targetPhone || !myPhoneNumber) return;

      stopMic();

      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      micActiveRef.current = true;

      recognition.onresult = (event) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          if (result.isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (interimText) {
          setSentVoiceText(interimText);
        }

        if (finalText.trim()) {
          const text = finalText.trim();
          if (text === lastVoiceTextRef.current) return;
          lastVoiceTextRef.current = text;
          setSentVoiceText(text);

          clearTimeout(voiceDebounceRef.current);
          voiceDebounceRef.current = setTimeout(() => {
            console.log('[MIC] Sending voice_text:', text);
          if (!canSpeakNow(turnHolder, myPhoneNumber)) return;
          socketRef.current?.emit('voice_text', {
            callerPhone: myPhoneNumber,
            targetPhone,
            text,
          });
            setTimeout(() => setSentVoiceText(''), 2000);
          }, 300);
        }
      };

      recognition.onerror = (e) => {
        console.error('[MIC] Error:', e.error);
        if ((e.error === 'no-speech' || e.error === 'network') && micActiveRef.current) {
          try {
            recognition.start();
          } catch {
            /* ignore */
          }
        }
      };

      recognition.onend = () => {
        if (micActiveRef.current && recognitionRef.current === recognition) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch {
              /* ignore */
            }
          }, 500);
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        console.log('[MIC] Started, lang: en-US');
      } catch {
        /* ignore */
      }
    },
    [myPhoneNumber, stopMic, turnHolder],
  );

  const cleanupCall = useCallback(() => {
    clearCallTimeout();
    stopRingtone();
    stopMic();
    window.speechSynthesis?.cancel();
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
      fallbackAudioRef.current = null;
    }
    setActiveCall(null);
    setIncomingCall(null);
    setOutgoingCall(null);
    setReceivedText('');
    setSentVoiceText('');
    lastVoiceTextRef.current = '';
    setTurnHolder(null);
  }, [clearCallTimeout, stopMic, stopRingtone]);

  useEffect(() => {
    if (!myPhoneNumber || myPhoneNumber.length < 8) {
      console.error('[CALL] myPhone invalide:', myPhoneNumber);
      return undefined;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('[CALL] Connecting to socket server:', SOCKET_URL);

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    const register = () => {
      socket.emit('register_user', myPhoneNumber);
      console.log('[REGISTER] Emitting register_user:', myPhoneNumber);
    };

    socket.on('connect', () => {
      console.log('[SOCKET] Connected, socketId:', socket.id);
      register();
    });

    socket.io.on('reconnect', () => {
      console.log('[SOCKET] Reconnected');
      register();
    });

    socket.on('register_confirmed', ({ phoneNumber, socketId }) => {
      console.log('[REGISTER] Confirmed by server:', phoneNumber, '→', socketId);
      setIsRegistered(true);
    });

    socket.on('incoming_call', (data) => {
      console.log('[INCOMING_CALL] Received:', data);
      setIncomingCall(data);
      playRingtone();
      vibratePhone();
      showBrowserNotification(data.callerName, data.callerPhone);
      clearCallTimeout();
      timeoutRef.current = setTimeout(() => {
        setIncomingCall(null);
        stopRingtone();
        socket.emit('reject_call', {
          callerPhone: data.callerPhone,
          targetPhone: myPhoneNumber,
        });
      }, CALL_TIMEOUT_MS);
    });

    socket.on('call_accepted', (data) => {
      console.log('[CALL_ACCEPTED]', data);
      clearCallTimeout();
      stopRingtone();
      setOutgoingCall(null);
      setActiveCall({ withPhone: data.by, startTime: Date.now() });
      onToast?.('✅ Appel accepté', 'success');
    });

    socket.on('turn_change', ({ canSpeak }) => {
      setTurnHolder(canSpeak);
      if (!canSpeakNow(canSpeak, myPhoneNumber)) {
        stopMic();
      }
    });

    socket.on('turn_denied', () => {
      onToast?.('⏳ Attendez votre tour pour parler', 'info');
    });

    socket.on('call_rejected', (data) => {
      console.log('[CALL_REJECTED]', data);
      clearCallTimeout();
      stopRingtone();
      setOutgoingCall(null);
      onToast?.(`Appel refusé par ${data.by}`, 'error');
    });

    socket.on('call_ended', () => {
      console.log('[CALL_ENDED]');
      cleanupCall();
    });

    socket.on('call_cancelled', () => {
      console.log('[CALL_CANCELLED]');
      clearCallTimeout();
      stopRingtone();
      setIncomingCall(null);
      setOutgoingCall(null);
    });

    socket.on('call_failed', (data) => {
      console.log('[CALL_FAILED]', data);
      clearCallTimeout();
      stopRingtone();
      setOutgoingCall(null);
      onToast?.(`📵 ${data.targetPhone} injoignable`, 'error');
    });

    socket.on('receive_voice_text', ({ text }) => {
      console.log('[RECEIVE_VOICE]', text);
      setReceivedText(text || '');
      if (typeof window !== 'undefined' && window.wakwakProcessAvatar) {
        window.wakwakProcessAvatar(text);
      }
    });

    socket.on('receive_sign_text', ({ text }) => {
      console.log('[RECEIVE_SIGN]', text);
      setReceivedText(text || '');
      if (myRole === 'hearing') {
        speakText(text);
      }
    });

    socket.on('user_status_change', ({ phoneNumber, status }) => {
      setOnlineContacts((prev) => ({ ...prev, [phoneNumber]: status }));
    });

    socket.on('connect_error', (err) => {
      console.error('[SOCKET] Connection error:', err.message);
      setIsRegistered(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setIsRegistered(false);
    });

    return () => {
      console.log('[CALL] Cleanup useCallSystem');
      cleanupCall();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    myPhoneNumber,
    myRole,
    cleanupCall,
    clearCallTimeout,
    onToast,
    playRingtone,
    showBrowserNotification,
    speakText,
    startMic,
    stopRingtone,
    vibratePhone,
  ]);

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    clearCallTimeout();
    stopRingtone();
    socketRef.current?.emit('accept_call', {
      callerPhone: incomingCall.callerPhone,
      targetPhone: myPhoneNumber,
    });
    setActiveCall({
      withPhone: incomingCall.callerPhone,
      startTime: Date.now(),
    });
    setIncomingCall(null);
  }, [incomingCall, myPhoneNumber, clearCallTimeout, stopRingtone]);

  const acceptCallFromPush = useCallback(
    (callerPhone) => {
      const phone = (callerPhone || '').trim();
      if (!phone || !myPhoneNumber) return;
      clearCallTimeout();
      stopRingtone();
      socketRef.current?.emit('accept_call', {
        callerPhone: phone,
        targetPhone: myPhoneNumber,
      });
      setActiveCall({ withPhone: phone, startTime: Date.now() });
      setIncomingCall(null);
    },
    [myPhoneNumber, clearCallTimeout, stopRingtone],
  );

  const callUser = useCallback(
    (targetPhone, callerName) => {
      if (!targetPhone) {
        console.error('[CALL] targetPhone is undefined');
        return;
      }
      if (!myPhoneNumber) {
        console.error('[CALL] myPhone is undefined');
        return;
      }
      if (!socketRef.current?.connected) {
        console.error('[CALL] Socket not connected');
        onToast?.('Connexion serveur en cours…', 'error');
        return;
      }

      console.log('[CALL] Emitting call_user:', { callerPhone: myPhoneNumber, targetPhone });

      socketRef.current.emit('call_user', {
        callerPhone: myPhoneNumber,
        targetPhone,
        callerName: callerName || myPhoneNumber,
      });
      setOutgoingCall({ targetPhone, status: 'ringing', startedAt: Date.now() });
      onToast?.('📞 Appel en cours…', 'info');
      clearCallTimeout();
      timeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('call_timeout', {
          callerPhone: myPhoneNumber,
          targetPhone,
        });
        setOutgoingCall(null);
        stopRingtone();
        onToast?.('Pas de réponse', 'info');
      }, CALL_TIMEOUT_MS);
    },
    [myPhoneNumber, clearCallTimeout, onToast, stopRingtone],
  );

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    clearCallTimeout();
    stopRingtone();
    socketRef.current?.emit('reject_call', {
      callerPhone: incomingCall.callerPhone,
      targetPhone: myPhoneNumber,
    });
    setIncomingCall(null);
  }, [incomingCall, myPhoneNumber, clearCallTimeout, stopRingtone]);

  const endCall = useCallback(() => {
    const peer = activeCall?.withPhone;
    if (!peer || !myPhoneNumber) return;
    socketRef.current?.emit('end_call', {
      callerPhone: myPhoneNumber,
      targetPhone: peer,
    });
    cleanupCall();
  }, [activeCall, myPhoneNumber, cleanupCall]);

  const cancelOutgoing = useCallback(() => {
    if (!outgoingCall || !myPhoneNumber) return;
    clearCallTimeout();
    stopRingtone();
    if (outgoingCall.status === 'ringing') {
      socketRef.current?.emit('call_timeout', {
        callerPhone: myPhoneNumber,
        targetPhone: outgoingCall.targetPhone,
      });
    } else {
      socketRef.current?.emit('end_call', {
        callerPhone: myPhoneNumber,
        targetPhone: outgoingCall.targetPhone,
      });
    }
    setOutgoingCall(null);
  }, [outgoingCall, myPhoneNumber, clearCallTimeout, stopRingtone]);

  const sendSignText = useCallback(
    (text) => {
      if (!activeCall?.withPhone || !text?.trim()) return;
      if (!canSpeakNow(turnHolder, myPhoneNumber)) {
        onToast?.('⏳ Attendez votre tour pour envoyer un signe', 'info');
        return;
      }
      socketRef.current?.emit('sign_text', {
        callerPhone: myPhoneNumber,
        targetPhone: activeCall.withPhone,
        text: text.trim(),
      });
    },
    [activeCall, myPhoneNumber, turnHolder, onToast],
  );

  const emitVoiceText = useCallback(
    (text) => {
      if (!activeCall?.withPhone || !text?.trim()) return;
      if (!canSpeakNow(turnHolder, myPhoneNumber)) {
        onToast?.('⏳ Attendez votre tour pour parler', 'info');
        return;
      }
      const trimmed = text.trim();
      if (trimmed === lastVoiceTextRef.current) return;
      lastVoiceTextRef.current = trimmed;
      socketRef.current?.emit('voice_text', {
        callerPhone: myPhoneNumber,
        targetPhone: activeCall.withPhone,
        text: trimmed,
      });
      setSentVoiceText(trimmed);
    },
    [activeCall, myPhoneNumber, turnHolder, onToast],
  );

  const toggleMic = useCallback(() => {
    if (micActiveRef.current) {
      stopMic();
    } else if (activeCall?.withPhone) {
      if (!canSpeakNow(turnHolder, myPhoneNumber)) {
        onToast?.('⏳ Attendez votre tour pour parler', 'info');
        return;
      }
      startMic(activeCall.withPhone);
    }
  }, [activeCall, startMic, stopMic, turnHolder, myPhoneNumber, onToast]);

  const toggleTTS = useCallback(() => {
    ttsActiveRef.current = !ttsActiveRef.current;
    if (!ttsActiveRef.current) {
      window.speechSynthesis?.cancel();
    }
  }, []);

  const getRealtimeStatus = useCallback(
    (phoneNumber, fallbackStatus = 'offline') => {
      if (activeCall?.withPhone === phoneNumber) return 'busy';
      const live = onlineContacts[phoneNumber];
      if (live === 'online' || live === 'busy') return live;
      return fallbackStatus;
    },
    [activeCall, onlineContacts],
  );

  const disconnectSocket = useCallback(() => {
    cleanupCall();
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsRegistered(false);
  }, [cleanupCall]);

  return {
    incomingCall,
    outgoingCall,
    activeCall,
    onlineContacts,
    receivedText,
    sentVoiceText,
    isRegistered,
    turnHolder,
    canSpeakTurn: canSpeakNow(turnHolder, myPhoneNumber),
    callUser,
    acceptCall,
    acceptCallFromPush,
    rejectCall,
    endCall,
    cancelOutgoing,
    sendSignText,
    emitVoiceText,
    toggleMic,
    toggleTTS,
    disconnectSocket,
    getRealtimeStatus,
    myPhoneNumber,
  };
}
