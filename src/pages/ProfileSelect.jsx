import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ear, EarOff, Hand } from 'lucide-react';
import { SYSTEM_PHONES } from '../data/callDirectory';
import { getClientUid, registerNotificationPreference } from '../lib/firebaseRealtime';

export default function ProfileSelect() {
  const navigate = useNavigate();

  useEffect(() => {
    registerNotificationPreference(getClientUid('web')).catch(() => {});
  }, []);

  const chooseProfile = (profile) => {
    localStorage.setItem('wakwak_profile', profile);
    localStorage.setItem(
      'userPhone',
      profile === 'entendant' ? SYSTEM_PHONES.hearing : SYSTEM_PHONES.deaf,
    );
    navigate(profile === 'entendant' ? '/entendant/accueil' : '/accueil');
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center px-5 text-[#111111] select-none">
      <div className="w-full max-w-[340px] flex flex-col items-center animate-fade-in">
        <div className="w-[52px] h-[52px] rounded-full bg-[#6366f1] flex items-center justify-center shadow-[0_0_18px_rgba(99,102,241,0.35)]">
          <Hand className="text-white" size={26} strokeWidth={2.25} />
        </div>

        <h1 className="mt-4 text-[16px] font-bold text-[#111111] leading-none">SignBridge</h1>
        <p className="mt-2 text-[11px] text-[#777777] font-semibold">Choisissez votre profil pour continuer</p>

        <div className="mt-8 w-full space-y-3">
          <button
            type="button"
            onClick={() => chooseProfile('sourd')}
            className="w-full rounded-[14px] border border-[#6366f1] bg-[#ffffff] hover:bg-[#ede7f6] active:scale-[0.98] transition-all p-3 flex items-center gap-3 text-left cursor-pointer"
          >
            <span className="w-10 h-10 rounded-[10px] bg-[#ede7f6] text-[#818cf8] flex items-center justify-center shrink-0">
              <EarOff size={20} strokeWidth={2.1} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-extrabold text-[#111111] leading-tight">Personne sourde</span>
              <span className="block mt-1 text-[10px] font-semibold text-[#777] leading-snug">
                Communication LSF via gants + avatar 3D
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => chooseProfile('entendant')}
            className="w-full rounded-[14px] border border-[#16a34a] bg-[#ffffff] hover:bg-[#e8f5e9] active:scale-[0.98] transition-all p-3 flex items-center gap-3 text-left cursor-pointer"
          >
            <span className="w-10 h-10 rounded-[10px] bg-[#e8f5e9] text-[#4ade80] flex items-center justify-center shrink-0">
              <Ear size={20} strokeWidth={2.1} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-extrabold text-[#111111] leading-tight">Personne entendante</span>
              <span className="block mt-1 text-[10px] font-semibold text-[#777] leading-snug">
                Reçoit la traduction LSF en texte + voix
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
