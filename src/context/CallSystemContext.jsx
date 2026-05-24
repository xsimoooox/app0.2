import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import IncomingCallModal from '../components/IncomingCallModal';
import OutgoingCallModal from '../components/OutgoingCallModal';
import { SYSTEM_PHONES } from '../data/callDirectory';
import { useCallSystem } from '../hooks/useCallSystem';
import { usePushNotification } from '../hooks/usePushNotification';
import { getCallRouteForPeer } from '../lib/callNavigation';
import { normalizePhoneNumber } from '../lib/phoneUtils';
import { getWakwakUser } from '../lib/wakwakUser';

const CallSystemContext = createContext(null);

export function CallSystemProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [callToast, setCallToast] = useState(null);
  const navigatedCallKeyRef = useRef(null);
  const pushAcceptHandledRef = useRef(false);

  const wakwakUser = useMemo(() => (typeof window !== 'undefined' ? getWakwakUser() : null), []);

  const myPhoneNumber = useMemo(() => {
    if (typeof window === 'undefined') return SYSTEM_PHONES.deaf;
    if (wakwakUser?.phoneNumber) return wakwakUser.phoneNumber;
    const profile = localStorage.getItem('wakwak_profile');
    const defaultPhone = profile === 'entendant' ? SYSTEM_PHONES.hearing : SYSTEM_PHONES.deaf;
    return normalizePhoneNumber(localStorage.getItem('userPhone') || defaultPhone);
  }, [wakwakUser]);

  const myRole = wakwakUser?.role
    || (localStorage.getItem('wakwak_profile') === 'entendant' ? 'hearing' : 'deaf');

  usePushNotification(myPhoneNumber);

  const onToast = useCallback((message, type = 'info') => {
    setCallToast({ message, type });
    setTimeout(() => setCallToast(null), 2500);
  }, []);

  const callSystem = useCallSystem(myPhoneNumber, myRole, { onToast });

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (myPhoneNumber && !localStorage.getItem('userPhone')) {
      localStorage.setItem('userPhone', myPhoneNumber);
    }
  }, [myPhoneNumber]);

  useEffect(() => {
    const peer = callSystem.activeCall?.withPhone;
    if (!peer || !wakwakUser) {
      navigatedCallKeyRef.current = null;
      return;
    }

    const callKey = `${peer}-${callSystem.activeCall.startTime}`;
    if (navigatedCallKeyRef.current === callKey) return;

    const route = getCallRouteForPeer(peer, wakwakUser.role);
    const onCallScreen = location.pathname.startsWith('/call/')
      || location.pathname.startsWith('/entendant/call/');

    if (!onCallScreen) {
      navigate(route, { replace: true });
    }
    navigatedCallKeyRef.current = callKey;
  }, [callSystem.activeCall, wakwakUser, location.pathname, navigate]);

  useEffect(() => {
    if (pushAcceptHandledRef.current || !callSystem.myPhoneNumber) return undefined;

    const params = new URLSearchParams(location.search);
    if (params.get('action') !== 'accept_call') return undefined;

    const from = params.get('from');
    if (!from) return undefined;

    pushAcceptHandledRef.current = true;
    const callerPhone = decodeURIComponent(from);
    const cleanPath = location.pathname === '/' ? '/' : location.pathname;
    window.history.replaceState({}, '', cleanPath);

    const timer = setTimeout(() => {
      callSystem.acceptCallFromPush(callerPhone);
    }, 600);

    return () => clearTimeout(timer);
  }, [
    location.search,
    location.pathname,
    callSystem.myPhoneNumber,
    callSystem.acceptCallFromPush,
  ]);

  const value = useMemo(() => callSystem, [callSystem]);

  return (
    <CallSystemContext.Provider value={value}>
      {children}

      {callToast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100000] px-4 py-2 rounded-full text-[12px] font-bold shadow-lg whitespace-nowrap"
          style={{
            background: callToast.type === 'error' ? '#3a1010' : '#0a1e0c',
            color: callToast.type === 'error' ? '#ef4444' : '#4ade80',
          }}
        >
          {callToast.message}
        </div>
      )}

      {callSystem.incomingCall && (
        <IncomingCallModal
          incomingCall={callSystem.incomingCall}
          onAccept={callSystem.acceptCall}
          onReject={callSystem.rejectCall}
        />
      )}

      {callSystem.outgoingCall && callSystem.outgoingCall.status === 'ringing' && (
        <OutgoingCallModal
          outgoingCall={callSystem.outgoingCall}
          onCancel={callSystem.cancelOutgoing}
        />
      )}
    </CallSystemContext.Provider>
  );
}

export function useCallSystemContext() {
  const ctx = useContext(CallSystemContext);
  if (!ctx) {
    throw new Error('useCallSystemContext must be used within CallSystemProvider');
  }
  return ctx;
}
