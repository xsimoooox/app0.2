import React from 'react';
import { ChevronLeft } from 'lucide-react';

/** Barre supérieure avec retour — appels et rencontres en mode immersif */
export default function SessionTopBar({
  title,
  subtitle,
  onBack,
  backLabel = 'Retour',
  className = '',
}) {
  return (
    <header
      className={`shrink-0 flex items-center gap-1 bg-white border-b border-[#e5e5e5] px-1 py-2 shadow-sm min-h-[48px] z-20 ${className}`}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="flex items-center justify-center w-10 h-10 rounded-full text-[#6366f1] active:bg-[#f5f5f5] transition-colors shrink-0"
      >
        <ChevronLeft size={22} strokeWidth={2.5} />
      </button>
      <div className="flex-1 text-center min-w-0 pr-10">
        {title ? (
          <h1 className="text-[16px] font-extrabold text-[#111111] m-0 truncate tracking-tight">
            {title}
          </h1>
        ) : null}
        {subtitle ? (
          <p className="text-[10px] font-bold text-[#16a34a] m-0 mt-0.5 flex items-center justify-center gap-1.5">
            {subtitle}
          </p>
        ) : null}
      </div>
    </header>
  );
}
