import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Globe2, Lock, LogOut, UserCircle, Volume2 } from 'lucide-react';
import { useCallSystemContext } from '../context/CallSystemContext';
import { performLogout } from '../lib/logoutSession';

const rows = [
  { icon: Bell, label: 'Notifications', value: 'Activées' },
  { icon: Volume2, label: 'Sortie audio', value: 'Haut-parleur' },
  { icon: Globe2, label: "Langue de l'interface", value: 'Français' },
  { icon: Lock, label: 'Confidentialité', value: 'Standard' },
];

export default function EntendantParametres() {
  const navigate = useNavigate();
  const { disconnectSocket } = useCallSystemContext();

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f5f5f5] text-[#111111] px-4 pt-5 pb-[88px] select-none animate-fade-in">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[15px] font-extrabold">Réglages</h1>
          <p className="text-[10px] text-[#777777] font-semibold mt-1">Profil personne entendante</p>
        </div>
        <button
          type="button"
          onClick={() => performLogout(navigate, disconnectSocket)}
          className="h-8 px-3 rounded-full bg-[#fff1f1] border border-[#fecaca] text-[10px] font-bold text-[#ef4444] active:scale-95 flex items-center gap-1.5"
        >
          <LogOut size={14} strokeWidth={2.25} />
          Déconnexion
        </button>
      </header>

      <div className="rounded-[14px] border border-[#e5e5e5] bg-[#fafafa] overflow-hidden">
        {rows.map((row, index) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className={`flex items-center gap-3 px-3 py-3 ${index > 0 ? 'border-t border-[#eeeeee]' : ''}`}>
              <span className="w-8 h-8 rounded-[9px] bg-[#eeeeee] text-[#818cf8] flex items-center justify-center shrink-0">
                <Icon size={16} strokeWidth={2.1} />
              </span>
              <span className="text-[11px] font-bold flex-1">{row.label}</span>
              <span className="text-[9px] text-[#777777] font-semibold">{row.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
