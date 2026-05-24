import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Shield } from 'lucide-react';

const SOS_CONTACTS_KEY = 'wakwak_contacts';

function getEmergencyContacts() {
  try {
    const saved = localStorage.getItem(SOS_CONTACTS_KEY);
    const contacts = saved ? JSON.parse(saved) : [];
    return contacts.filter((c) => c.isEmergency || c.isEmergencyContact);
  } catch {
    return [];
  }
}

export default function Urgence() {
  const navigate = useNavigate();
  const emergency = getEmergencyContacts();

  const handleSOS = () => {
    if (emergency.length === 0) {
      navigate('/contacts');
      return;
    }
    const first = emergency[0];
    const phone = first.phoneNumber || first.phone || '';
    if (phone) window.location.href = `tel:${phone.replace(/\s/g, '')}`;
    else navigate(`/contacts/${first.id}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-in">
      <div className="w-full max-w-sm p-8 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white/40">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mb-6 shadow-inner animate-pulse">
          <Shield size={32} strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2 font-display">
          URGENCE
        </h1>
        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
          Accès rapide à un contact SOS ou à la liste des contacts.
        </p>
        <button
          type="button"
          onClick={handleSOS}
          className="w-full h-12 rounded-xl bg-[#ef4444] text-white text-sm font-extrabold active:scale-[0.98] flex items-center justify-center gap-2 mb-2"
        >
          <Phone size={18} strokeWidth={2.5} />
          Appeler un contact SOS
        </button>
        <button
          type="button"
          onClick={() => navigate('/contacts')}
          className="w-full h-10 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold active:scale-[0.98]"
        >
          Gérer les contacts SOS
        </button>
        {emergency.length > 0 && (
          <p className="text-[10px] text-slate-400 font-semibold mt-3">
            {emergency.length} contact(s) SOS configuré(s)
          </p>
        )}
      </div>
    </div>
  );
}
