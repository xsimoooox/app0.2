import React, { useEffect, useState } from 'react';
import { PhoneIncoming } from 'lucide-react';

function formatSession(session) {
  const name =
    session.contactName
    || session.partnerName
    || (session.type === 'qr_joined' ? 'Rencontre QR' : 'Appel LSF');
  const date = session.date
    || (session.startTime
      ? new Date(session.startTime).toLocaleDateString('fr-FR')
      : '—');
  const time = session.time
    || (session.startTime
      ? new Date(session.startTime).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      : '');
  const duration = session.duration
    ? `${Math.floor(session.duration / 60)} min ${session.duration % 60} sec`
    : session.durationSec
      ? `${session.durationSec} sec`
      : '—';
  return { id: session.id, name, when: `${date}${time ? ` · ${time}` : ''}`, duration, status: 'Reçu' };
}

export default function EntendantHistorique() {
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sessions') || '[]');
      const formatted = (Array.isArray(saved) ? saved : [])
        .filter((s) => s.role === 'hearing' || s.type === 'qr_joined' || !s.type)
        .map(formatSession)
        .reverse();
      setCalls(formatted);
    } catch {
      setCalls([]);
    }
  }, []);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f5f5f5] text-[#111111] px-4 pt-5 pb-[88px] select-none animate-fade-in">
      <header className="mb-5">
        <h1 className="text-[15px] font-extrabold">Historique</h1>
        <p className="text-[10px] text-[#777777] font-semibold mt-1">Sessions et appels enregistrés</p>
      </header>

      {calls.length === 0 ? (
        <p className="text-center text-[11px] text-[#888888] font-semibold py-12">
          Aucune session sauvegardée pour le moment.
        </p>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div key={call.id} className="rounded-[12px] border border-[#e5e5e5] bg-[#fafafa] p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-[#e8f5e9] text-[#4ade80] flex items-center justify-center shrink-0">
                <PhoneIncoming size={18} strokeWidth={2.1} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold truncate">{call.name}</p>
                <p className="text-[9px] text-[#777777] font-semibold mt-0.5">{call.when} — {call.duration}</p>
              </div>
              <span className="text-[8px] font-black uppercase text-[#4ade80]">{call.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
