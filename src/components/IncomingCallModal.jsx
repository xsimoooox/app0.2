import React, { useEffect, useState } from 'react';
import { lookupContactByPhone } from '../data/callDirectory';

const TIMEOUT_MS = 30000;

export default function IncomingCallModal({ incomingCall, onAccept, onReject }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!incomingCall) return undefined;
    const start = incomingCall.timestamp || Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [incomingCall]);

  if (!incomingCall) return null;

  const meta = lookupContactByPhone(incomingCall.callerPhone);
  const roleLabel = meta?.role === 'hearing' ? 'Entendant' : meta?.role === 'deaf' ? 'Sourd' : null;
  const progress = Math.max(0, 100 - (elapsed / (TIMEOUT_MS / 1000)) * 100);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[99999]"
      style={{ background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        className="text-center animate-fade-in"
        style={{
          background: '#131313',
          border: '1px solid #1e1e1e',
          borderRadius: 24,
          padding: '32px 24px',
          width: 'calc(100% - 48px)',
          maxWidth: 340,
        }}
      >
        <i
          className="ti ti-phone-ringing"
          style={{
            fontSize: 48,
            color: '#6366f1',
            display: 'block',
            marginBottom: 12,
            animation: 'pulse 1s infinite',
          }}
        />
        <p className="text-[11px] font-bold uppercase m-0 mb-2" style={{ color: '#555' }}>
          Appel entrant
        </p>
        <p className="text-[18px] font-bold m-0 mb-1" style={{ color: '#f0f0f0' }}>
          {incomingCall.callerPhone}
        </p>
        {meta?.name && (
          <p className="text-[13px] m-0 mb-2" style={{ color: '#6B7280' }}>
            {meta.name}
          </p>
        )}
        {roleLabel && (
          <span
            className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full mb-2"
            style={{
              background: meta.role === 'hearing' ? '#0a1e0c' : '#1a1040',
              color: meta.role === 'hearing' ? '#4ade80' : '#a78bfa',
            }}
          >
            {roleLabel}
          </span>
        )}
        <p className="text-[11px] m-0 mb-6" style={{ color: '#444' }}>
          Appel depuis {elapsed}s…
        </p>

        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={onReject}
            className="flex flex-col items-center border-none bg-transparent cursor-pointer"
          >
            <span
              className="flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#3a1010',
                border: '2px solid #ef4444',
              }}
            >
              <i className="ti ti-phone-off" style={{ fontSize: 28, color: '#ef4444' }} />
            </span>
            <span className="text-[11px] font-bold mt-2" style={{ color: '#ef4444' }}>
              Refuser
            </span>
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex flex-col items-center border-none bg-transparent cursor-pointer"
            style={{ animation: 'bounce 1s infinite' }}
          >
            <span
              className="flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#0a1e0c',
                border: '2px solid #16a34a',
              }}
            >
              <i className="ti ti-phone" style={{ fontSize: 28, color: '#16a34a' }} />
            </span>
            <span className="text-[11px] font-bold mt-2" style={{ color: '#16a34a' }}>
              Accepter
            </span>
          </button>
        </div>

        <div
          className="mt-6 h-[3px] rounded-[2px] overflow-hidden"
          style={{ background: '#1e1e1e' }}
        >
          <div
            className="h-full transition-all duration-1000 linear"
            style={{
              width: `${progress}%`,
              background: progress < 16.67 ? '#ef4444' : '#6366f1',
            }}
          />
        </div>
      </div>
    </div>
  );
}
