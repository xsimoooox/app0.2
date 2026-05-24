import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ear, Phone, UserCircle, Users } from 'lucide-react';
import { useCallSystemContext } from '../context/CallSystemContext';
function loadContactCount() {
  try {
    const saved = localStorage.getItem('wakwak_contacts');
    if (saved) return JSON.parse(saved).length;
  } catch {
    /* ignore */
  }
  return 4;
}

export default function EntendantAccueil() {
  const navigate = useNavigate();
  const { onlineContacts } = useCallSystemContext();

  const contactCount = useMemo(() => loadContactCount(), []);
  const onlineCount = useMemo(
    () => Object.values(onlineContacts).filter((s) => s === 'online').length,
    [onlineContacts],
  );

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f5f5f5] text-[#111111] px-4 pt-5 pb-[88px] select-none animate-fade-in">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[15px] font-extrabold leading-tight">Accueil</h1>
          <p className="text-[10px] text-[#777777] font-semibold mt-1">Interface personne entendante</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-8 px-3 rounded-full bg-[#ffffff] border border-[#e0e0e0] text-[10px] font-bold text-[#818cf8] active:scale-95 flex items-center gap-1.5"
        >
          <UserCircle size={14} strokeWidth={2.25} />
          Profil
        </button>
      </header>

      <section className="rounded-[16px] border border-[#e5e5e5] bg-[#fafafa] p-4">
        <div className="w-11 h-11 rounded-[14px] bg-[#e8f5e9] text-[#4ade80] flex items-center justify-center mb-4">
          <Ear size={22} strokeWidth={2.1} />
        </div>
        <h2 className="text-[14px] font-extrabold">Recevoir la LSF en direct</h2>
        <p className="text-[11px] text-[#666] font-semibold leading-relaxed mt-2">
          Vos contacts sourds peuvent vous appeler en LSF. Conversation en tours de parole : parlez, attendez la réponse, puis répondez.
        </p>
        <button
          type="button"
          onClick={() => navigate('/entendant/contacts')}
          className="mt-4 w-full h-10 rounded-[12px] bg-[#6366f1] text-white text-[12px] font-extrabold active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Users size={16} strokeWidth={2.25} />
          Ouvrir mes contacts
        </button>
        <button
          type="button"
          onClick={() => navigate('/entendant/rencontre')}
          className="mt-2 w-full h-10 rounded-[12px] bg-white border border-[#6366f1] text-[#6366f1] text-[12px] font-extrabold active:scale-[0.98]"
        >
          Rejoindre une rencontre (QR)
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-[14px] border border-[#e5e5e5] bg-[#fafafa] p-3">
          <Users className="text-[#818cf8]" size={20} strokeWidth={2.1} />
          <p className="text-[18px] font-extrabold mt-3">{contactCount}</p>
          <p className="text-[9px] text-[#777777] font-bold uppercase tracking-[0.6px]">Contacts</p>
        </div>
        <div className="rounded-[14px] border border-[#e5e5e5] bg-[#fafafa] p-3">
          <Phone className="text-[#4ade80]" size={20} strokeWidth={2.1} />
          <p className="text-[18px] font-extrabold mt-3">{onlineCount}</p>
          <p className="text-[9px] text-[#777777] font-bold uppercase tracking-[0.6px]">En ligne</p>
        </div>
      </section>
    </div>
  );
}
