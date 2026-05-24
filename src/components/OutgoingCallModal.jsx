import React, { useEffect, useState } from 'react';
import { lookupContactByPhone } from '../data/callDirectory';

const TIMEOUT_MS = 30000;

export default function OutgoingCallModal({ outgoingCall, onCancel }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!outgoingCall) return undefined;
    const start = outgoingCall.startedAt || Date.now();
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [outgoingCall]);

  if (!outgoingCall) return null;

  const meta = lookupContactByPhone(outgoingCall.targetPhone);
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
          className="ti ti-phone-calling"
          style={{
            fontSize: 48,
            color: '#6366f1',
            display: 'block',
            marginBottom: 12,
            animation: 'spin 3s linear infinite',
          }}
        />
        <p className="text-[11px] font-bold uppercase m-0 mb-2" style={{ color: '#555' }}>
          Appel en cours…
        </p>
        <p className="text-[18px] font-bold m-0 mb-1" style={{ color: '#f0f0f0' }}>
          {outgoingCall.targetPhone}
        </p>
        {meta?.name && (
          <p className="text-[13px] m-0 mb-3" style={{ color: '#6B7280' }}>
            {meta.name}
          </p>
        )}
        <div className="flex justify-center gap-1 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-blink-1" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-blink-2" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-blink-3" />
        </div>
        <p className="text-[11px] m-0 mb-6" style={{ color: '#444' }}>
          {elapsed}s
        </p>

        <button
          type="button"
          onClick={onCancel}
          className="flex flex-col items-center border-none bg-transparent cursor-pointer mx-auto"
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
            Raccrocher
          </span>
        </button>

        <div
          className="mt-6 h-[3px] rounded-[2px] overflow-hidden"
          style={{ background: '#1e1e1e' }}
        >
          <div
            className="h-full transition-all duration-1000"
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
