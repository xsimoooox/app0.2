import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, History, MessageSquare, Trash2 } from 'lucide-react';

export default function Historique() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('sessions');
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  const handleDeleteSession = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Voulez-vous supprimer cet appel de l'historique ?")) {
      const updated = sessions.filter(s => s.id !== id);
      localStorage.setItem('sessions', JSON.stringify(updated));
      setSessions(updated);
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Voulez-vous effacer tout l'historique des appels ?")) {
      localStorage.removeItem('sessions');
      setSessions([]);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto min-h-screen bg-[#f5f5f5] flex flex-col p-4 text-slate-200 select-none pb-[80px] animate-fade-in">
      
      <header className="flex justify-between items-center py-2 mb-6 shrink-0 border-b border-[#e0e0e0]">
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => navigate('/contacts')} 
            className="w-7 h-7 rounded-full bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-center text-slate-500 hover:text-[#111111] cursor-pointer active:scale-90 transition-transform"
            aria-label="Retour aux contacts"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
          </button>
          <h1 className="text-[15px] font-bold text-[#111111]">Historique des Appels LSF</h1>
        </div>
        {sessions.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-red-400 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 px-2.5 py-1 rounded-lg cursor-pointer transition-colors active:scale-95"
          >
            <Trash2 size={12} strokeWidth={2.5} />
            Tout effacer
          </button>
        )}
      </header>

      <div className="flex-grow space-y-4 overflow-y-auto max-h-[calc(100vh-170px)] pr-0.5 select-text">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-center text-slate-500 mb-4 shadow-inner">
              <History size={22} strokeWidth={2} />
            </div>
            <h3 className="text-xs font-bold text-slate-400">Aucun appel récent</h3>
            <p className="text-[10px] text-slate-650 mt-1 max-w-[200px] leading-relaxed">
              Les conversations que vous enregistrez à la fin de vos appels LSF apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <div 
                key={session.id}
                className="bg-[#ffffff] border border-[#e0e0e0] rounded-[14px] p-3.5 flex flex-col gap-2.5 shadow hover:border-slate-800 transition-all relative overflow-hidden group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-extrabold text-slate-100">
                      {session.contactName || (session.type === 'qr_code' ? 'Rencontre' : 'Session LSF')}
                    </span>
                    <span className="text-[9.5px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5 select-none">
                      <Calendar size={10} strokeWidth={2.5} />
                      {session.date || (session.startTime ? new Date(session.startTime).toLocaleDateString('fr-FR') : '—')}
                      {session.time ? ` à ${session.time}` : session.startTime ? ` à ${new Date(session.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase bg-[#e8f5e9] border border-[#c8e6c9] text-emerald-400 px-1.5 py-0.5 rounded-[6px] select-none">
                      {typeof session.duration === 'number' ? `${session.duration}s` : session.duration || '—'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="w-6 h-6 rounded-md bg-red-950/20 border border-red-950/30 flex items-center justify-center text-red-400 hover:bg-red-950/40 active:scale-90 transition-all cursor-pointer"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                <div className="bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg p-2 flex flex-col gap-1">
                  <span className="text-[8.5px] font-black uppercase text-violet-400 tracking-wider flex items-center gap-1 select-none">
                    <MessageSquare size={10} strokeWidth={2.5} />
                    Dernier échange :
                  </span>
                  <p className="text-[10.5px] text-slate-300 italic font-medium leading-relaxed">
                    "{session.transcriptExcerpt || session.messages?.[0]?.content || 'Pas de conversation enregistrée'}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
