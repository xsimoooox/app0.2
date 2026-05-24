import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import AuthGate from './components/AuthGate';
import BottomNav from './components/BottomNav';
import { CallSystemProvider } from './context/CallSystemContext';
import { ImmersiveSessionProvider, useImmersiveSession } from './context/ImmersiveSessionContext';
import Auth from './pages/Auth';
import Accueil from './pages/Accueil';
import Contacts from './pages/Contacts';
import Rencontre from './pages/Rencontre';
import Urgence from './pages/Urgence';
import Historique from './pages/Historique';
import Parametres from './pages/Parametres';
import EntendantAccueil from './pages/EntendantAccueil';
import EntendantContacts from './pages/EntendantContacts';
import EntendantHistorique from './pages/EntendantHistorique';
import EntendantParametres from './pages/EntendantParametres';
import EntendantRencontre from './pages/EntendantRencontre';
import JoinRencontre from './pages/JoinRencontre';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    // We add a key to the container to trigger the entry animation on route change
    <div key={location.pathname} className="animate-fade-in flex-grow flex flex-col justify-center">
      <Routes location={location}>
        <Route path="/" element={<Auth />} />
        <Route path="/accueil" element={<Accueil />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contacts/add" element={<Contacts />} />
        <Route path="/contacts/:id" element={<Contacts />} />
        <Route path="/call/:id" element={<Contacts />} />
        <Route path="/rencontre" element={<Rencontre />} />
        <Route path="/join/:sessionId" element={<JoinRencontre />} />
        <Route path="/urgence" element={<Urgence />} />
        <Route path="/historique" element={<Historique />} />
        <Route path="/parametres" element={<Parametres />} />
        <Route path="/entendant/accueil" element={<EntendantAccueil />} />
        <Route path="/entendant/contacts" element={<EntendantContacts />} />
        <Route path="/entendant/contacts/add" element={<EntendantContacts />} />
        <Route path="/entendant/contacts/:id" element={<EntendantContacts />} />
        <Route path="/entendant/call/:id" element={<EntendantContacts />} />
        <Route path="/entendant/historique" element={<EntendantHistorique />} />
        <Route path="/entendant/parametres" element={<EntendantParametres />} />
        <Route path="/entendant/rencontre" element={<EntendantRencontre />} />
        <Route path="/entendant/rencontre/:sessionId" element={<EntendantRencontre />} />
      </Routes>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const { immersive } = useImmersiveSession();
  const isAuthPage = location.pathname === '/';
  const hideJoinScreen = location.pathname.startsWith('/join/');
  const hideBottomNav = isAuthPage || hideJoinScreen || immersive;

  return (
    <div
      className={`min-h-screen bg-[#f5f5f5] flex flex-col justify-between ${
        hideBottomNav ? 'pb-0' : 'pb-[80px]'
      }`}
    >
      <main className="flex-grow flex flex-col w-full max-w-md mx-auto min-h-0">
        <AuthGate>
          <AnimatedRoutes />
        </AuthGate>
      </main>

      {!hideBottomNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <CallSystemProvider>
        <ImmersiveSessionProvider>
          <AppContent />
        </ImmersiveSessionProvider>
      </CallSystemProvider>
    </Router>
  );
}
