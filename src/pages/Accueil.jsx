import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Hand, Phone, Shield } from 'lucide-react';

export default function Accueil() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-in">
      <div className="w-full max-w-sm p-8 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/40">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-6 shadow-inner">
          <Hand size={32} strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2 font-display">
          ACCUEIL
        </h1>
        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
          Traduction de la Langue des Signes en temps réel.
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navigate('/contacts')}
            className="w-full h-11 rounded-xl bg-[#6366f1] text-white text-sm font-extrabold active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Phone size={18} strokeWidth={2.25} />
            Mes contacts
          </button>
          <button
            type="button"
            onClick={() => navigate('/rencontre')}
            className="w-full h-11 rounded-xl bg-white border-2 border-[#6366f1] text-[#6366f1] text-sm font-extrabold active:scale-[0.98]"
          >
            Nouvelle rencontre
          </button>
          <button
            type="button"
            onClick={() => navigate('/urgence')}
            className="w-full h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm font-extrabold active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Shield size={18} strokeWidth={2.25} />
            Urgence
          </button>
        </div>
      </div>
    </div>
  );
}
