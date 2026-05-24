import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getClientUid, getRencontreSession, joinRencontreSession } from '../lib/firebaseRealtime';

export default function JoinRencontre() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setError('Lien invalide.');
      return undefined;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const session = await getRencontreSession(sessionId);
        if (!session) {
          if (!cancelled) setError('Session introuvable ou expirée.');
          return;
        }
        if (session.expiresAt && Date.now() > session.expiresAt) {
          if (!cancelled) setError('Ce code a expiré. Demandez un nouveau QR code.');
          return;
        }
        if (session.status === 'ended') {
          if (!cancelled) setError('Cette session est déjà terminée.');
          return;
        }

        localStorage.setItem('wakwak_profile', 'entendant');
        await joinRencontreSession(sessionId, getClientUid('hearing'));

        if (!cancelled) {
          navigate('/entendant/rencontre', { replace: true, state: { sessionId } });
        }
      } catch {
        if (!cancelled) setError('Impossible de rejoindre la session. Vérifiez votre connexion.');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-bold text-rose-600">{error}</p>
        <button
          type="button"
          onClick={() => navigate('/entendant/accueil')}
          className="mt-4 h-10 px-4 rounded-xl bg-[#6366f1] text-white text-xs font-extrabold"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#6366f1]">
      <Loader2 className="animate-spin" size={32} />
      <p className="text-sm font-bold text-slate-600">Connexion à la rencontre…</p>
    </div>
  );
}
