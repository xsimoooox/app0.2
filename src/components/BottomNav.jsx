import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, QrCode, Shield, Clock, Settings } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const isHearing = location.pathname.startsWith('/entendant/');

  const deafNavItems = [
    { name: 'ACCUEIL', path: '/accueil', icon: Home },
    { name: 'CONTACTS', path: '/contacts', icon: Users },
    { name: 'RENCONTRE', path: '/rencontre', icon: QrCode },
    { name: 'URGENCE', path: '/urgence', icon: Shield },
    { name: 'HISTORIQUE', path: '/historique', icon: Clock },
    { name: 'PARAMETRES', path: '/parametres', icon: Settings },
  ];

  const hearingNavItems = [
    { name: 'Accueil', path: '/entendant/accueil', icon: Home },
    { name: 'Contacts', path: '/entendant/contacts', icon: Users },
    { name: 'Rencontre', path: '/entendant/rencontre', icon: QrCode },
    { name: 'Historique', path: '/entendant/historique', icon: Clock },
    { name: 'Réglages', path: '/entendant/parametres', icon: Settings },
  ];

  const navItems = isHearing ? hearingNavItems : deafNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[65px] bg-[#FFFFFF] border-t border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-[9999] flex items-center justify-between px-1 select-none">
      <div className={`w-full grid ${isHearing ? 'grid-cols-5' : 'grid-cols-6'} h-full`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center h-full transition-all duration-150 ${
                  isActive
                    ? `${isHearing ? 'text-[#6366f1]' : 'text-[#4F46E5]'} scale-105 font-medium`
                    : 'text-[#9CA3AF] hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={22}
                    className={`transition-all duration-150 ${
                      isActive
                        ? `scale-110 stroke-[2.25px] ${isHearing ? 'drop-shadow-[0_1px_2px_rgba(99,102,241,0.18)]' : 'drop-shadow-[0_1px_2px_rgba(79,70,229,0.15)]'}`
                        : 'stroke-[1.75px]'
                    }`}
                  />
                  <span className="text-[10px] mt-1 tracking-tight leading-none text-center">
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
